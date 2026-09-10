-- =========================================================================
-- Resumen de transacciones para el admin sin traer toda la tabla al
-- cliente: la suma se calcula en la base y solo viajan 4 números. Se
-- restringe a administradores dentro de la propia función (es
-- SECURITY DEFINER porque necesita leer filas de todos los usuarios).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_transactions_summary()
RETURNS TABLE (
  total_billed numeric,
  total_collected numeric,
  pending_amount numeric,
  pending_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede ver este resumen';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(q.price_offered) FILTER (WHERE q.accepted), 0),
    COALESCE(SUM(q.price_offered) FILTER (WHERE q.accepted AND r.is_paid), 0),
    COALESCE(
      SUM(q.price_offered) FILTER (
        WHERE q.accepted AND NOT r.is_paid AND r.status IN ('accepted', 'pending_confirmation', 'done')
      ), 0
    ),
    COUNT(*) FILTER (
      WHERE q.accepted AND NOT r.is_paid AND r.status IN ('accepted', 'pending_confirmation', 'done')
    )
  FROM public.service_requests r
  JOIN public.quotes q ON q.request_id = r.id AND q.accepted = true;
END; $$;

REVOKE ALL ON FUNCTION public.admin_transactions_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transactions_summary() TO authenticated;