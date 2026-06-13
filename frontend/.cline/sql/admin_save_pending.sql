-- Admin save RPCs for 2D and 3D draws.
-- Both tables (`draws`, `draws_3d`) have RLS enabled with only SELECT policies.
-- Admin saves go through these SECURITY DEFINER RPCs so the writes can persist
-- without granting a broad UPDATE policy on the underlying tables.

-- 3D: single integer 0-999 per (draw_id, mode).
CREATE OR REPLACE FUNCTION public.save_pending_3d(p_draw_id uuid, p_value smallint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_value IS NULL OR p_value < 0 OR p_value > 999 THEN
    RAISE EXCEPTION 'pending value must be 0-999';
  END IF;
  UPDATE draws_3d
  SET pending_result_number = p_value
  WHERE id = p_draw_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draw not found or already resulted: %', p_draw_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_pending_3d(uuid, smallint) TO authenticated;


-- 2D: 30-element int array (3 series x 10 slots), each value 0-9999.
CREATE OR REPLACE FUNCTION public.save_pending_2d(p_draw_id uuid, p_values integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_values IS NULL OR array_length(p_values, 1) IS DISTINCT FROM 30 THEN
    RAISE EXCEPTION 'pending values must be exactly 30 numbers (3 series x 10 slots)';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_values) v WHERE v < 0 OR v > 9999) THEN
    RAISE EXCEPTION 'each pending value must be 0-9999';
  END IF;
  UPDATE draws
  SET pending_result_numbers = p_values
  WHERE id = p_draw_id AND status IN ('open', 'closed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draw not found or already resulted: %', p_draw_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_pending_2d(uuid, integer[]) TO authenticated;
