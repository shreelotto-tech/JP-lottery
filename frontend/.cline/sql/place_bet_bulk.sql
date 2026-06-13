-- Bulk bet placement wrapper for Supabase RPC
-- This function reuses existing public.place_bet logic for consistency.

create or replace function public.place_bet_bulk(
  p_draw_id uuid,
  p_bet_type text,
  p_bets jsonb,
  p_receipt_barcode text default null
)
returns table (
  bet_id uuid,
  number int,
  quantity int,
  barcode text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_number int;
  v_quantity int;
  v_result record;
begin
  if p_bets is null or jsonb_typeof(p_bets) <> 'array' or jsonb_array_length(p_bets) = 0 then
    raise exception 'p_bets must be a non-empty JSON array';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_bets)
  loop
    v_number := (v_item ->> 'number')::int;
    v_quantity := (v_item ->> 'quantity')::int;

    if v_number is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid bet payload item: %', v_item::text;
    end if;

    -- Calls existing function for validations + business rules
    select *
    into v_result
    from public.place_bet(
      p_draw_id,
      v_number,
      p_bet_type,
      v_quantity,
      p_receipt_barcode
    );

    bet_id := coalesce((v_result).bet_id, null);
    number := v_number;
    quantity := v_quantity;
    barcode := coalesce((v_result).barcode, p_receipt_barcode);

    return next;
  end loop;

  return;
end;
$$;

grant execute on function public.place_bet_bulk(uuid, text, jsonb, text) to authenticated;
