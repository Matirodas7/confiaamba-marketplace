-- =========================================================================
-- 1) Configuración de tarifas y comisiones (panel de administrador).
--    Fila única de configuración global + overrides opcionales por
--    categoría. Solo el admin puede leer/escribir.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CONSTRAINT platform_settings_singleton CHECK (id),
  default_commission_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  service_fee_flat numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads platform settings" ON public.platform_settings;
CREATE POLICY "Anyone reads platform settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins update platform settings" ON public.platform_settings;
CREATE POLICY "Admins update platform settings" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.category_commission_overrides (
  category text PRIMARY KEY,
  commission_percent numeric(5,2) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_commission_overrides TO authenticated;
GRANT ALL ON public.category_commission_overrides TO service_role;
ALTER TABLE public.category_commission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads category overrides" ON public.category_commission_overrides;
CREATE POLICY "Anyone reads category overrides" ON public.category_commission_overrides
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage category overrides" ON public.category_commission_overrides;
CREATE POLICY "Admins manage category overrides" ON public.category_commission_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 2) Gestión de disputas: el admin necesita poder escribir sobre pedidos
--    (marcar una disputa como resuelta, dejar una nota interna). Antes solo
--    tenía permiso de lectura.
-- =========================================================================
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS dispute_resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_admin_note text;

DROP POLICY IF EXISTS "Admins update requests" ON public.service_requests;
CREATE POLICY "Admins update requests" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));