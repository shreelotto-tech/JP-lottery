CREATE OR REPLACE FUNCTION public.place_advance_bets(
  p_draw_date        DATE,
  p_slot_labels      TEXT[],
  p_bets             JSONB,
  p_bet_type         TEXT,
  p_receipt_barcodes TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID    := auth.uid();
  v_balance         NUMERIC;
  v_points_per_slot INT     := 0;
  v_total_cost      INT;
  v_new_balance     NUMERIC;
  v_slot_label      TEXT;
  v_slot_idx        INT     := 0;
  v_timeslot_id     INT;
  v_slot_time       TIME;
  v_draw_id         UUID;
  v_scheduled_at    TIMESTAMPTZ;
  v_barcode         TEXT;
  v_item            JSONB;
  v_number          INT;
  v_quantity        INT;
  v_bet_id          UUID;
  v_result_slots    JSONB   := '[]'::JSONB;
  v_slot_bets       JSONB;
BEGIN
  IF array_length(p_slot_labels, 1) IS NULL THEN
    RAISE EXCEPTION 'p_slot_labels must be non-empty';
  END IF;
  IF array_length(p_receipt_barcodes, 1) <> array_length(p_slot_labels, 1) THEN
    RAISE EXCEPTION 'barcodes length must match slot_labels length';
  END IF;

  -- Compute per-slot cost
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_bets) LOOP
    v_quantity := (v_item ->> 'quantity')::INT;
    v_points_per_slot := v_points_per_slot + v_quantity * 2;
  END LOOP;

  v_total_cost := v_points_per_slot * array_length(p_slot_labels, 1);

  -- Lock profile and validate balance
  SELECT points INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient points. Need: %, Have: %', v_total_cost, v_balance;
  END IF;

  v_new_balance := v_balance - v_total_cost;
  UPDATE profiles SET points = v_new_balance WHERE id = v_user_id;

  FOREACH v_slot_label IN ARRAY p_slot_labels LOOP
    v_slot_idx := v_slot_idx + 1;
    v_barcode  := p_receipt_barcodes[v_slot_idx];

    SELECT id, slot_time INTO v_timeslot_id, v_slot_time
    FROM draw_timeslots WHERE label = v_slot_label AND is_active = TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown slot label: %', v_slot_label; END IF;

    -- scheduled_at = slot start time + 15 minutes (matches existing draw creation pattern)
    v_scheduled_at := (p_draw_date::TIMESTAMP + v_slot_time + INTERVAL '15 minutes')
                      AT TIME ZONE 'Asia/Kolkata';

    -- Find existing draw for this date+slot, or create one
    SELECT id INTO v_draw_id FROM draws
    WHERE draw_date = p_draw_date AND timeslot_id = v_timeslot_id LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO draws (draw_date, timeslot_id, scheduled_at, status)
      VALUES (p_draw_date, v_timeslot_id, v_scheduled_at, 'open')
      RETURNING id INTO v_draw_id;
    END IF;

    -- Insert all bets for this slot
    v_slot_bets := '[]'::JSONB;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_bets) LOOP
      v_number   := (v_item ->> 'number')::INT;
      v_quantity := (v_item ->> 'quantity')::INT;

      INSERT INTO bets (user_id, draw_id, number, bet_type, quantity, points_cost, barcode)
      VALUES (v_user_id, v_draw_id, v_number, p_bet_type, v_quantity, v_quantity * 2, v_barcode)
      RETURNING id INTO v_bet_id;

      v_slot_bets := v_slot_bets || jsonb_build_object('number', v_number, 'quantity', v_quantity);
    END LOOP;

    v_result_slots := v_result_slots || jsonb_build_object(
      'slot_label',  v_slot_label,
      'draw_id',     v_draw_id,
      'barcode',     v_barcode,
      'placed_bets', v_slot_bets
    );
  END LOOP;

  RETURN v_result_slots;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_advance_bets(DATE, TEXT[], JSONB, TEXT, TEXT[]) TO authenticated;
