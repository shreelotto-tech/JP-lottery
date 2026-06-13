-- ============================================================
-- 3D Lottery System Migration
-- Run in Supabase SQL Editor (service role)
-- ============================================================

-- ── 1. draws_3d table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.draws_3d (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_date     date         NOT NULL,
  timeslot_id   integer      REFERENCES public.draw_timeslots(id),
  mode          text         NOT NULL CHECK (mode IN ('A', 'B', 'C')),
  scheduled_at  timestamptz  NOT NULL,
  status        text         NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resulted')),
  result_number smallint     CHECK (result_number BETWEEN 0 AND 999),
  published_at  timestamptz,
  UNIQUE (draw_date, timeslot_id, mode)
);

ALTER TABLE public.draws_3d ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read draws_3d"
  ON public.draws_3d FOR SELECT
  TO authenticated USING (true);

-- ── 2. bets_3d table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bets_3d (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id),
  draw_id     uuid        NOT NULL REFERENCES public.draws_3d(id),
  number      smallint    NOT NULL CHECK (number BETWEEN 0 AND 999),
  bet_type    text        NOT NULL CHECK (bet_type IN ('STR', 'BOX', 'FP', 'BP', 'SP', 'AP')),
  amount      integer     NOT NULL CHECK (amount > 0),
  points_cost integer     NOT NULL CHECK (points_cost > 0),
  status      text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'won', 'lost', 'claimed', 'cancelled')),
  payout      numeric,
  barcode     text,
  receipt_url text,
  win_receipt_url text,
  placed_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bets_3d ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own bets_3d"
  ON public.bets_3d FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS bets_3d_user_id_idx    ON public.bets_3d (user_id);
CREATE INDEX IF NOT EXISTS bets_3d_draw_id_idx    ON public.bets_3d (draw_id);
CREATE INDEX IF NOT EXISTS bets_3d_barcode_idx    ON public.bets_3d (barcode);
CREATE INDEX IF NOT EXISTS bets_3d_placed_at_idx  ON public.bets_3d (placed_at DESC);

-- ── 3. user_3d_bet_history view ───────────────────────────────
CREATE OR REPLACE VIEW public.user_3d_bet_history
WITH (security_invoker = true)
AS
SELECT
  b.id                                        AS bet_id,
  b.barcode,
  b.number,
  b.bet_type,
  b.amount,
  b.points_cost,
  b.status,
  b.payout,
  b.placed_at,
  b.receipt_url,
  b.win_receipt_url,
  d.draw_date,
  d.mode,
  t.label                                     AS slot_label,
  -- cancellable only while draw is still open
  (b.status = 'open' AND d.status = 'open')   AS is_cancellable,
  -- claimable when won and not yet claimed
  (b.status = 'won')                          AS is_claimable
FROM public.bets_3d b
JOIN public.draws_3d d  ON b.draw_id = d.id
JOIN public.draw_timeslots t ON d.timeslot_id = t.id
WHERE b.user_id = auth.uid();

-- ── 4. RPC: get_or_create_3d_draws ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_3d_draws(
  p_draw_date    date,
  p_timeslot_id  integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_time    time;
  v_scheduled_at timestamptz;
  v_draw_id      uuid;
  v_mode         text;
  v_result       jsonb := '{}'::jsonb;
BEGIN
  SELECT slot_time INTO v_slot_time
  FROM draw_timeslots WHERE id = p_timeslot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown timeslot id: %', p_timeslot_id; END IF;

  v_scheduled_at := (p_draw_date::timestamp + v_slot_time + INTERVAL '15 minutes')
                    AT TIME ZONE 'Asia/Kolkata';

  FOREACH v_mode IN ARRAY ARRAY['A','B','C'] LOOP
    INSERT INTO draws_3d (draw_date, timeslot_id, mode, scheduled_at, status)
    VALUES (p_draw_date, p_timeslot_id, v_mode, v_scheduled_at, 'open')
    ON CONFLICT (draw_date, timeslot_id, mode) DO NOTHING;

    SELECT id INTO v_draw_id
    FROM draws_3d
    WHERE draw_date = p_draw_date AND timeslot_id = p_timeslot_id AND mode = v_mode;

    v_result := v_result || jsonb_build_object(v_mode, v_draw_id);
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_3d_draws(date, integer) TO authenticated;

-- ── 5. RPC: place_3d_bet_bulk ─────────────────────────────────
-- p_draw_ids: {"A": "<uuid>", "B": "<uuid>"}  (only selected modes)
-- p_bets:     [{"number": 163, "bet_type": "BOX", "amount": 10}, ...]
-- p_receipt_barcode: shared barcode for this transaction
CREATE OR REPLACE FUNCTION public.place_3d_bet_bulk(
  p_draw_ids        jsonb,
  p_bets            jsonb,
  p_receipt_barcode text DEFAULT NULL
)
RETURNS TABLE (
  bet_id    uuid,
  number    smallint,
  bet_type  text,
  amount    integer,
  mode      text,
  barcode   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_balance     numeric;
  v_total_cost  integer := 0;
  v_mode        text;
  v_draw_id     uuid;
  v_item        jsonb;
  v_number      smallint;
  v_bet_type    text;
  v_amount      integer;
  v_new_bet_id  uuid;
  v_barcode     text;
BEGIN
  IF p_bets IS NULL OR jsonb_typeof(p_bets) <> 'array' OR jsonb_array_length(p_bets) = 0 THEN
    RAISE EXCEPTION 'p_bets must be a non-empty JSON array';
  END IF;

  IF p_draw_ids IS NULL OR jsonb_typeof(p_draw_ids) <> 'object' THEN
    RAISE EXCEPTION 'p_draw_ids must be a JSON object {mode: draw_id}';
  END IF;

  -- Calculate total cost: sum(amount) × number of selected modes
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_bets) LOOP
    v_amount := (v_item ->> 'amount')::integer;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Invalid amount in bet item: %', v_item::text;
    END IF;
    v_total_cost := v_total_cost + v_amount;
  END LOOP;
  v_total_cost := v_total_cost * jsonb_object_length(p_draw_ids);

  -- Lock profile and check balance
  SELECT points INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient points. Need: %, Have: %', v_total_cost, v_balance;
  END IF;

  UPDATE profiles SET points = points - v_total_cost WHERE id = v_user_id;

  -- Insert one bet row per (item × mode)
  FOR v_mode IN SELECT key FROM jsonb_object_keys(p_draw_ids) AS key LOOP
    v_draw_id := (p_draw_ids ->> v_mode)::uuid;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_bets) LOOP
      v_number   := (v_item ->> 'number')::smallint;
      v_bet_type := v_item ->> 'bet_type';
      v_amount   := (v_item ->> 'amount')::integer;
      v_barcode  := COALESCE(p_receipt_barcode, gen_random_uuid()::text);

      IF v_number IS NULL OR v_number < 0 OR v_number > 999 THEN
        RAISE EXCEPTION 'Invalid number: %', v_number;
      END IF;
      IF v_bet_type NOT IN ('STR', 'BOX', 'FP', 'BP', 'SP', 'AP') THEN
        RAISE EXCEPTION 'Invalid bet_type: %', v_bet_type;
      END IF;
      IF v_bet_type = 'BOX' AND
         (v_number / 100) = ((v_number % 100) / 10) AND
         ((v_number % 100) / 10) = (v_number % 10) THEN
        RAISE EXCEPTION 'BOX bet rejects all-same digits: %', v_number;
      END IF;

      INSERT INTO bets_3d (user_id, draw_id, number, bet_type, amount, points_cost, barcode)
      VALUES (v_user_id, v_draw_id, v_number, v_bet_type, v_amount, v_amount, v_barcode)
      RETURNING id INTO v_new_bet_id;

      bet_id   := v_new_bet_id;
      number   := v_number;
      bet_type := v_bet_type;
      amount   := v_amount;
      mode     := v_mode;
      barcode  := v_barcode;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_3d_bet_bulk(jsonb, jsonb, text) TO authenticated;

-- ── 6. RPC: publish_3d_draw_result ───────────────────────────
-- Called by super-admin per mode. Settles all open bets for this draw.
CREATE OR REPLACE FUNCTION public.publish_3d_draw_result(
  p_draw_id      uuid,
  p_result_number smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet         record;
  v_d1_bet      integer;
  v_d2_bet      integer;
  v_d3_bet      integer;
  v_d1_res      integer;
  v_d2_res      integer;
  v_d3_res      integer;
  v_sorted_bet  integer[];
  v_sorted_res  integer[];
  v_is_win      boolean;
  v_multiplier  integer;
  v_payout      numeric;
  v_box_type    text;  -- 'triple' | 'duplicate' | 'single'
BEGIN
  IF p_result_number < 0 OR p_result_number > 999 THEN
    RAISE EXCEPTION 'result_number must be 0-999';
  END IF;

  -- Mark draw as resulted
  UPDATE draws_3d
  SET status = 'resulted', result_number = p_result_number, published_at = now()
  WHERE id = p_draw_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draw not found or already resulted: %', p_draw_id;
  END IF;

  -- Decompose result into digits
  v_d1_res := p_result_number / 100;
  v_d2_res := (p_result_number % 100) / 10;
  v_d3_res := p_result_number % 10;
  v_sorted_res := ARRAY(SELECT unnest(ARRAY[v_d1_res, v_d2_res, v_d3_res]) ORDER BY 1);

  -- Settle each open bet
  FOR v_bet IN SELECT * FROM bets_3d WHERE draw_id = p_draw_id AND status = 'open' LOOP
    v_d1_bet := v_bet.number / 100;
    v_d2_bet := (v_bet.number % 100) / 10;
    v_d3_bet := v_bet.number % 10;
    v_sorted_bet := ARRAY(SELECT unnest(ARRAY[v_d1_bet, v_d2_bet, v_d3_bet]) ORDER BY 1);

    v_is_win    := false;
    v_multiplier := 0;

    CASE v_bet.bet_type
      WHEN 'STR' THEN
        v_is_win    := (v_bet.number = p_result_number);
        v_multiplier := 900;

      WHEN 'BOX' THEN
        v_is_win := (v_sorted_bet = v_sorted_res);
        -- Determine box sub-type from bet number's digit pattern
        IF v_d1_bet = v_d2_bet AND v_d2_bet = v_d3_bet THEN
          -- all-same bets are rejected at placement; no payout if one slips through
          v_is_win    := false;
          v_multiplier := 0;
        ELSIF v_d1_bet = v_d2_bet OR v_d2_bet = v_d3_bet OR v_d1_bet = v_d3_bet THEN
          v_box_type   := 'duplicate';
          v_multiplier := 300;
        ELSE
          v_box_type   := 'single';
          v_multiplier := 150;
        END IF;

      WHEN 'FP' THEN
        -- First two digits match
        v_is_win    := (v_bet.number / 10 = p_result_number / 10);
        v_multiplier := 90;

      WHEN 'BP' THEN
        -- Last two digits match
        v_is_win    := (v_bet.number % 100 = p_result_number % 100);
        v_multiplier := 90;

      WHEN 'SP' THEN
        -- First digit AND last digit match
        v_is_win    := (v_d1_bet = v_d1_res AND v_d3_bet = v_d3_res);
        v_multiplier := 90;

      WHEN 'AP' THEN
        -- ordered pair (a=d1_bet, b=d2_bet) in order at any of 3 pair positions
        v_is_win := (
          (v_d1_bet = v_d1_res AND v_d2_bet = v_d2_res) OR   -- abX
          (v_d1_bet = v_d1_res AND v_d2_bet = v_d3_res) OR   -- aXb
          (v_d1_bet = v_d2_res AND v_d2_bet = v_d3_res)      -- Xab
        );
        v_multiplier := 30;

      ELSE
        RAISE EXCEPTION 'Unknown bet_type: %', v_bet.bet_type;
    END CASE;

    IF v_is_win THEN
      v_payout := v_bet.amount * v_multiplier;
      UPDATE bets_3d SET status = 'won', payout = v_payout WHERE id = v_bet.id;
    ELSE
      UPDATE bets_3d SET status = 'lost' WHERE id = v_bet.id;
    END IF;
  END LOOP;

  -- Best-of rule: same (barcode, number) on this draw → keep only highest-payout winner
  UPDATE bets_3d b1
  SET status = 'lost', payout = NULL
  WHERE b1.draw_id = p_draw_id
    AND b1.status = 'won'
    AND EXISTS (
      SELECT 1 FROM bets_3d b2
      WHERE b2.draw_id = p_draw_id
        AND b2.status = 'won'
        AND b2.barcode IS NOT DISTINCT FROM b1.barcode
        AND b2.number = b1.number
        AND b2.payout > b1.payout
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_3d_draw_result(uuid, smallint) TO authenticated;

-- ── 7. RPC: admin_get_3d_bets_for_draw ───────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_3d_bets_for_draw(
  p_draw_id uuid
)
RETURNS TABLE (
  number     smallint,
  bet_type   text,
  total_amt  bigint,
  bet_count  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.number,
    b.bet_type,
    SUM(b.amount)::bigint  AS total_amt,
    COUNT(*)::bigint       AS bet_count
  FROM bets_3d b
  WHERE b.draw_id = p_draw_id
    AND b.status NOT IN ('cancelled')
  GROUP BY b.number, b.bet_type
  ORDER BY total_amt DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_3d_bets_for_draw(uuid) TO authenticated;

-- ── 8. RPC: cancel_3d_bet ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_3d_bet(
  p_bet_id uuid
)
RETURNS TABLE (
  points_restored integer,
  new_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_amount  integer;
  v_draw_status text;
  v_new_balance integer;
BEGIN
  SELECT b.amount, d.status
  INTO v_amount, v_draw_status
  FROM bets_3d b
  JOIN draws_3d d ON b.draw_id = d.id
  WHERE b.id = p_bet_id AND b.user_id = v_user_id AND b.status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found or not cancellable';
  END IF;

  IF v_draw_status <> 'open' THEN
    RAISE EXCEPTION 'Cannot cancel bet: draw is already resulted';
  END IF;

  UPDATE bets_3d SET status = 'cancelled' WHERE id = p_bet_id;
  UPDATE profiles
  SET points = points + v_amount
  WHERE id = v_user_id
  RETURNING points INTO v_new_balance;

  RETURN QUERY SELECT v_amount, v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_3d_bet(uuid) TO authenticated;

-- ── 9. RPC: claim_3d_winnings ────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_3d_winnings(
  p_bet_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid    := auth.uid();
  v_payout  numeric;
BEGIN
  SELECT payout INTO v_payout
  FROM bets_3d
  WHERE id = p_bet_id AND user_id = v_user_id AND status = 'won';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found or not claimable';
  END IF;

  UPDATE bets_3d SET status = 'claimed' WHERE id = p_bet_id;
  UPDATE profiles SET points = points + v_payout WHERE id = v_user_id;

  RETURN v_payout;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_3d_winnings(uuid) TO authenticated;

-- ── 10. RPC: update_3d_bet_receipt ────────────────────────────
-- Used by frontend after uploading receipt to storage
CREATE OR REPLACE FUNCTION public.update_3d_bet_receipt(
  p_barcode     text,
  p_receipt_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bets_3d
  SET receipt_url = p_receipt_url
  WHERE barcode = p_barcode AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_3d_bet_receipt(text, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 9) Cron entry point: get_or_create_current_3d_draws()
-- Invoked every minute by pg_cron job `auto-publish-3d-draws`. Auto-publishes
-- any open 3D draws whose scheduled_at has passed, using the admin-saved
-- pending_result_number when present and a random 0-999 only as a fallback.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_or_create_current_3d_draws()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_ist_now      TIMESTAMP   := v_now AT TIME ZONE 'Asia/Kolkata';
  v_today        DATE        := v_ist_now::DATE;
  v_current_time TIME        := v_ist_now::TIME;
  v_timeslot_id  INTEGER;
  v_stale_draw   RECORD;
  v_missed_slot  RECORD;
  v_missed_id    UUID;
  v_scheduled_at TIMESTAMPTZ;
  v_random_num   SMALLINT;
  v_mode         TEXT;
BEGIN
  -- Auto-publish all stale open draws_3d whose scheduled_at has passed.
  -- Admin-saved pending_result_number bypasses the 60% cap (admin decision);
  -- system-generated random fallback still enforces the cap.
  FOR v_stale_draw IN
    SELECT id, pending_result_number FROM draws_3d
    WHERE status = 'open'
      AND scheduled_at <= v_now
  LOOP
    IF v_stale_draw.pending_result_number IS NOT NULL THEN
      UPDATE draws_3d SET skip_cap_enforcement = true WHERE id = v_stale_draw.id;
      PERFORM publish_3d_draw_result(v_stale_draw.id, v_stale_draw.pending_result_number);
    ELSE
      v_random_num := (floor(random() * 1000))::smallint;
      PERFORM publish_3d_draw_result(v_stale_draw.id, v_random_num);
    END IF;
  END LOOP;

  -- Create + auto-publish missed slots that have no draws_3d rows yet.
  -- Brand-new rows have no pending value, so random is the only option here.
  FOR v_missed_slot IN
    SELECT id, slot_time
    FROM draw_timeslots
    WHERE is_active = true
      AND (v_today::timestamp + slot_time + INTERVAL '15 minutes') AT TIME ZONE 'Asia/Kolkata' <= v_now
    ORDER BY slot_time ASC
  LOOP
    FOREACH v_mode IN ARRAY ARRAY['A','B','C'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM draws_3d
        WHERE draw_date = v_today
          AND timeslot_id = v_missed_slot.id
          AND mode = v_mode
      ) THEN
        v_scheduled_at := (v_today::timestamp + v_missed_slot.slot_time + INTERVAL '15 minutes')
                          AT TIME ZONE 'Asia/Kolkata';
        INSERT INTO draws_3d (draw_date, timeslot_id, mode, scheduled_at, status)
        VALUES (v_today, v_missed_slot.id, v_mode, v_scheduled_at, 'open')
        RETURNING id INTO v_missed_id;

        v_random_num := (floor(random() * 1000))::smallint;
        PERFORM publish_3d_draw_result(v_missed_id, v_random_num);
      END IF;
    END LOOP;
  END LOOP;

  -- Find the most recent slot whose start time has passed
  SELECT id INTO v_timeslot_id
  FROM draw_timeslots
  WHERE slot_time <= v_current_time
  ORDER BY slot_time DESC
  LIMIT 1;

  -- Before session start: use last slot of previous day
  IF v_timeslot_id IS NULL THEN
    SELECT id INTO v_timeslot_id
    FROM draw_timeslots
    ORDER BY slot_time DESC
    LIMIT 1;
    v_today := v_today - INTERVAL '1 day';
  END IF;

  IF v_timeslot_id IS NULL THEN
    RETURN '{"error": "No timeslots configured"}'::jsonb;
  END IF;

  RETURN get_or_create_3d_draws(v_today, v_timeslot_id);
END;
$$;
