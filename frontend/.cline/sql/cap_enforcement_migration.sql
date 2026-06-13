-- Cap enforcement: prevent draw publish from exceeding 60% payout cap.
-- Applied 2026-05-11. Root cause: admin sets pending numbers when pool is empty,
-- bets arrive later and cap is never re-checked at publish time.

-- 1. Bypass flag: admin can explicitly allow >60% for a specific draw
ALTER TABLE draws ADD COLUMN IF NOT EXISTS skip_cap_enforcement boolean NOT NULL DEFAULT false;

-- 2. RPC for admin panel to toggle the bypass
CREATE OR REPLACE FUNCTION public.admin_set_cap_override(p_draw_id uuid, p_skip boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE draws SET skip_cap_enforcement = p_skip
  WHERE id = p_draw_id AND status IN ('open', 'closed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draw not found or already resulted: %', p_draw_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_cap_override(uuid, boolean) TO authenticated;

-- 3. Helper: replace hot numbers before publishing
CREATE OR REPLACE FUNCTION public.safe_replace_2d_numbers(
  p_draw_id uuid,
  p_pending  integer[]
)
RETURNS integer[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_pool   NUMERIC;
  v_cap          NUMERIC;
  v_result       integer[] := p_pending;
  v_payouts      NUMERIC[];
  v_total_payout NUMERIC := 0;
  v_num          INT;
  v_payout       NUMERIC;
  v_prefix       INT;
  v_safe_num     INT;
  v_max_payout   NUMERIC;
  v_max_idx      INT;
  i              INT;
  v_iters        INT := 0;
BEGIN
  SELECT COALESCE(SUM(points_cost), 0) INTO v_total_pool
  FROM bets WHERE draw_id = p_draw_id AND status = 'pending';

  IF v_total_pool = 0 THEN RETURN v_result; END IF;

  v_cap := v_total_pool * 0.60;

  v_payouts := ARRAY[]::NUMERIC[];
  FOR i IN 1..array_length(p_pending, 1) LOOP
    v_num := v_result[i];
    SELECT COALESCE(SUM(points_cost * 90), 0) INTO v_payout
    FROM bets
    WHERE draw_id = p_draw_id AND status = 'pending'
      AND number = v_num
      AND (
        bet_type IN ('4D', 'CP', 'FP', '12D')
        OR (bet_type = 'EVEN' AND v_num % 2 = 0)
        OR (bet_type = 'ODD'  AND v_num % 2 != 0)
      );
    v_payouts      := array_append(v_payouts, v_payout);
    v_total_payout := v_total_payout + v_payout;
  END LOOP;

  IF v_total_payout <= v_cap THEN RETURN v_result; END IF;

  WHILE v_total_payout > v_cap AND v_iters < 30 LOOP
    v_iters := v_iters + 1;
    v_max_payout := 0; v_max_idx := -1;
    FOR i IN 1..array_length(v_result, 1) LOOP
      IF v_payouts[i] > v_max_payout THEN
        v_max_payout := v_payouts[i]; v_max_idx := i;
      END IF;
    END LOOP;
    EXIT WHEN v_max_idx = -1 OR v_max_payout = 0;

    v_num    := v_result[v_max_idx];
    v_prefix := (v_num / 100) * 100;

    SELECT n INTO v_safe_num
    FROM generate_series(v_prefix + 1, v_prefix + 99) AS n
    WHERE NOT (n = ANY(v_result))
    ORDER BY (
      SELECT COALESCE(SUM(points_cost), 0)
      FROM bets WHERE bets.number = n AND bets.draw_id = p_draw_id AND bets.status = 'pending'
    ) ASC LIMIT 1;

    IF v_safe_num IS NULL THEN
      SELECT n INTO v_safe_num
      FROM generate_series(v_prefix + 1, v_prefix + 99) AS n
      ORDER BY (
        SELECT COALESCE(SUM(points_cost), 0)
        FROM bets WHERE bets.number = n AND bets.draw_id = p_draw_id AND bets.status = 'pending'
      ) ASC LIMIT 1;
    END IF;
    EXIT WHEN v_safe_num IS NULL;

    SELECT COALESCE(SUM(points_cost * 90), 0) INTO v_payout
    FROM bets
    WHERE draw_id = p_draw_id AND status = 'pending'
      AND number = v_safe_num
      AND (
        bet_type IN ('4D', 'CP', 'FP', '12D')
        OR (bet_type = 'EVEN' AND v_safe_num % 2 = 0)
        OR (bet_type = 'ODD'  AND v_safe_num % 2 != 0)
      );

    v_total_payout      := v_total_payout - v_max_payout + v_payout;
    v_result[v_max_idx] := v_safe_num;
    v_payouts[v_max_idx] := v_payout;
  END LOOP;

  RETURN v_result;
END;
$$;

-- 4. get_or_create_current_draw() is updated separately via apply_migration
--    (calls safe_replace_2d_numbers in the stale-draw publish loop)
