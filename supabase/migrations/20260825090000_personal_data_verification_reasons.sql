-- =========================================================================
-- 1) Nombre y apellido por separado + datos personales (DNI y domicilio
--    con calle/número/piso/depto separados) para cliente y profesional.
--    full_name se sigue manteniendo (muchas partes de la UI lo usan) pero
--    ahora se compone automáticamente a partir de first_name + last_name.
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS dni text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS apartment text;

-- Backfill de first_name/last_name para cuentas ya existentes, partiendo
-- full_name por el primer espacio (mejor esfuerzo).
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(substring(full_name FROM position(' ' IN full_name) + 1), ''))
WHERE first_name IS NULL;

CREATE OR REPLACE FUNCTION public.compose_full_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := trim(BOTH ' ' FROM COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
    IF NEW.full_name = '' AND TG_OP = 'UPDATE' THEN
      NEW.full_name := OLD.full_name;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_compose_full_name ON public.profiles;
CREATE TRIGGER profiles_compose_full_name
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.compose_full_name();

-- El alta ahora recibe first_name/last_name por separado desde el
-- formulario de registro.
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

  r := CASE WHEN NEW.raw_user_meta_data->>'role' = 'professional' THEN 'professional'::public.app_role
            ELSE 'client'::public.app_role END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;

  IF r = 'professional' THEN
    INSERT INTO public.pro_details (pro_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- =========================================================================
-- 2) Verificación opcional del CLIENTE (misma insignia "Verificado" que ya
--    usan los profesionales, controlada por profiles.security_verified).
--    Reutiliza el mismo enum verification_status que pro_details.
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'pending';

-- =========================================================================
-- 3) Motivos de rechazo de presupuesto / cancelación de pedido, visibles
--    para el profesional y el administrador.
-- =========================================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS reject_reason_note text;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_reason_note text,
  ADD COLUMN IF NOT EXISTS declined_by_pro_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS decline_reason_note text;

-- =========================================================================
-- 4) Calificación con etiquetas rápidas ("Excelente servicio", etc.) además
--    de estrellas y comentario libre.
-- =========================================================================
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- =========================================================================
-- 5) El cliente también puede proponer/cambiar la fecha de un presupuesto
--    ya aceptado (si el profesional todavía no propuso una). Función
--    SECURITY DEFINER acotada, igual que hacemos para el resto de acciones
--    entre partes.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.client_schedule_job(_quote_id uuid, _scheduled_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes;
DECLARE req public.service_requests;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id;
  IF q.id IS NULL OR q.accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'Presupuesto no encontrado o no aceptado';
  END IF;
  SELECT * INTO req FROM public.service_requests WHERE id = q.request_id;
  IF req.client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Solo el cliente dueño del pedido puede proponer esta fecha';
  END IF;

  UPDATE public.quotes SET scheduled_at = _scheduled_at WHERE id = _quote_id;

  INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
  VALUES (
    q.pro_id, 'quote_answered', 'El cliente propuso una fecha para el trabajo',
    'El cliente propuso el ' || to_char(_scheduled_at, 'DD/MM/YYYY HH24:MI') || ' para ' || req.category || '.',
    req.id, '/pro'
  );
  PERFORM public.trigger_email_notification(
    q.pro_id, 'quote_answered', 'El cliente propuso una fecha para el trabajo',
    'El cliente propuso el ' || to_char(_scheduled_at, 'DD/MM/YYYY HH24:MI') || ' para ' || req.category || '.'
  );
END; $$;

REVOKE ALL ON FUNCTION public.client_schedule_job(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_schedule_job(uuid, timestamptz) TO authenticated;

-- =========================================================================
-- 6) El profesional puede rechazar un trabajo que le llegó como solicitud
--    dirigida, con motivo. El pedido vuelve a quedar como general (otros
--    profesionales de esa categoría pueden verlo) y se le avisa al cliente.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.pro_decline_targeted_job(
  _request_id uuid, _reason text, _reason_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = _request_id;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF req.target_pro_id <> auth.uid() THEN
    RAISE EXCEPTION 'Este pedido no te fue asignado directamente';
  END IF;
  IF req.status NOT IN ('pending', 'quoted') THEN
    RAISE EXCEPTION 'Este pedido ya no se puede rechazar';
  END IF;

  UPDATE public.service_requests
  SET target_pro_id = NULL,
      declined_by_pro_id = auth.uid(),
      decline_reason = _reason,
      decline_reason_note = _reason_note
  WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
  VALUES (
    req.client_id, 'quote_answered', 'El profesional no puede tomar tu pedido',
    COALESCE(NULLIF(_reason_note, ''), _reason), req.id, '/cliente'
  );
  PERFORM public.trigger_email_notification(
    req.client_id, 'quote_answered', 'El profesional no puede tomar tu pedido',
    COALESCE(NULLIF(_reason_note, ''), _reason)
  );
END; $$;

REVOKE ALL ON FUNCTION public.pro_decline_targeted_job(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pro_decline_targeted_job(uuid, text, text) TO authenticated;