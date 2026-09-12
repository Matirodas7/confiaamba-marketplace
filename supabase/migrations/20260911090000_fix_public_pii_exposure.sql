-- =========================================================================
-- FIX CRÍTICO DE SEGURIDAD: datos personales sensibles quedaban expuestos
-- públicamente (sin login) a través de la policy "Profiles are publicly
-- readable" / "Pro details publicly readable" (USING (true) + GRANT a anon).
--
-- Esta migración mueve DNI, domicilio y las URLs de documento/selfie de
-- verificación a una tabla nueva `profile_private_data`, visible solo para
-- el dueño de los datos y para administradores. El resto de `profiles` y
-- `pro_details` (nombre, avatar, zona, bio, tarifas, etc.) sigue siendo
-- público, tal como estaba pensado originalmente.
--
-- `phone` se deja intencionalmente en `profiles` (público) porque ya se
-- usa para que cliente y profesional se contacten una vez que hay un
-- trabajo en curso; restringirlo correctamente requiere una policy que
-- verifique que existe una relación activa entre ambos (pedido/presupuesto
-- compartido), que queda pendiente como mejora futura — ver nota al final.
-- =========================================================================

-- 1) Tabla privada -----------------------------------------------------
CREATE TABLE public.profile_private_data (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  dni text,
  street text,
  street_number text,
  floor text,
  apartment text,
  id_document_url text,
  selfie_url text,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  pro_id_document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profile_private_data TO authenticated;
GRANT ALL ON public.profile_private_data TO service_role;
ALTER TABLE public.profile_private_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own private data" ON public.profile_private_data
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own private data" ON public.profile_private_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own private data" ON public.profile_private_data
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage private data" ON public.profile_private_data
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS profile_private_data_set_updated_at ON public.profile_private_data;
CREATE TRIGGER profile_private_data_set_updated_at
BEFORE UPDATE ON public.profile_private_data
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Migrar datos existentes -------------------------------------------
INSERT INTO public.profile_private_data
  (id, dni, street, street_number, floor, apartment, id_document_url, selfie_url, verification_status)
SELECT id, dni, street, street_number, floor, apartment, id_document_url, selfie_url, verification_status
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

UPDATE public.profile_private_data ppd
SET pro_id_document_url = pd.id_document_url
FROM public.pro_details pd
WHERE pd.pro_id = ppd.id AND pd.id_document_url IS NOT NULL;

-- Profesionales que tenían id_document_url en pro_details pero todavía no
-- tienen fila en profile_private_data (caso borde, no debería pasar porque
-- todo pro tiene profile, pero por las dudas):
INSERT INTO public.profile_private_data (id, pro_id_document_url)
SELECT pd.pro_id, pd.id_document_url
FROM public.pro_details pd
WHERE pd.id_document_url IS NOT NULL
ON CONFLICT (id) DO UPDATE SET pro_id_document_url = EXCLUDED.pro_id_document_url;

-- 3) Sacar las columnas sensibles de las tablas públicas -----------------
ALTER TABLE public.profiles
  DROP COLUMN dni,
  DROP COLUMN street,
  DROP COLUMN street_number,
  DROP COLUMN floor,
  DROP COLUMN apartment,
  DROP COLUMN id_document_url,
  DROP COLUMN selfie_url,
  DROP COLUMN verification_status;

ALTER TABLE public.pro_details
  DROP COLUMN id_document_url;

-- 4) Alta de usuario: crear también la fila privada -----------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
DECLARE fn text := NEW.raw_user_meta_data->>'first_name';
DECLARE ln text := NEW.raw_user_meta_data->>'last_name';
BEGIN
  INSERT INTO public.profiles (id, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(BOTH ' ' FROM COALESCE(fn,'') || ' ' || COALESCE(ln,'')), ''), split_part(NEW.email,'@',1)),
    fn,
    ln
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_private_data (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  r := CASE WHEN NEW.raw_user_meta_data->>'role' = 'professional' THEN 'professional'::public.app_role
            ELSE 'client'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;

  IF r = 'professional' THEN
    INSERT INTO public.pro_details (pro_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Backfill: usuarios existentes que todavía no tengan fila privada
-- (se cubre en el paso 2, esto es solo red de seguridad adicional).
INSERT INTO public.profile_private_data (id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.profile_private_data ppd ON ppd.id = p.id
WHERE ppd.id IS NULL;

-- =========================================================================
-- NOTA para el equipo: `profiles.phone` sigue siendo públicamente legible
-- (GRANT a anon desde la migración inicial). Es de menor sensibilidad que
-- el DNI/domicilio/documentos, pero convendría en una futura migración
-- restringirlo a "dueño, admin, o contraparte con un pedido/presupuesto
-- compartido" en vez de dejarlo abierto a cualquiera.
-- =========================================================================
