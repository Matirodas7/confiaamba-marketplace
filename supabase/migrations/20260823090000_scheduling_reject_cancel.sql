-- =========================================================================
-- 1) Rechazo de presupuesto por el cliente (sin cancelar todo el pedido,
--    por si hay otros presupuestos en danza) y cancelación del pedido
--    completo (si ya no le conviene ninguno).
-- =========================================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_not_accepted_and_rejected CHECK (NOT (accepted = true AND rejected = true));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- "cancelled" ya existe como valor de request_status desde el esquema original.

-- Notificación al profesional cuando el cliente rechaza su presupuesto.
CREATE OR REPLACE FUNCTION public.notify_quote_rejected()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  IF NEW.rejected = true AND OLD.rejected IS DISTINCT FROM true THEN
    SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
    IF req.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        NEW.pro_id, 'quote_answered', 'El cliente rechazó tu presupuesto',
        'Tu presupuesto para ' || req.category || ' no fue seleccionado.', req.id, '/pro'
      );
      PERFORM public.trigger_email_notification(
        NEW.pro_id, 'quote_answered', 'El cliente rechazó tu presupuesto',
        'Tu presupuesto para ' || req.category || ' no fue seleccionado.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_notify_rejected ON public.quotes;
CREATE TRIGGER quotes_notify_rejected
AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_rejected();

-- Notificación al profesional cuando el cliente cancela el pedido.
CREATE OR REPLACE FUNCTION public.notify_request_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE winner_pro uuid;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    SELECT pro_id INTO winner_pro FROM public.quotes WHERE request_id = NEW.id AND accepted = true LIMIT 1;
    IF winner_pro IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        winner_pro, 'quote_answered', 'El cliente canceló el trabajo',
        'El pedido de ' || NEW.category || ' fue cancelado por el cliente.', NEW.id, '/pro'
      );
      PERFORM public.trigger_email_notification(
        winner_pro, 'quote_answered', 'El cliente canceló el trabajo',
        'El pedido de ' || NEW.category || ' fue cancelado por el cliente.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS service_requests_notify_cancelled ON public.service_requests;
CREATE TRIGGER service_requests_notify_cancelled
AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_cancelled();

REVOKE ALL ON FUNCTION public.notify_quote_rejected() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_request_cancelled() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 2) Fecha propuesta para el trabajo. Vive en el PRESUPUESTO (quotes), no
--    en el pedido: cada profesional que cotiza un pedido general puede
--    proponer su propia fecha disponible, junto con el precio, en el mismo
--    paso de "Enviar presupuesto" (no hace falta esperar a que se acepte).
--    Como "Pros manage own quotes" ya permite al profesional actualizar
--    su propio presupuesto, no hace falta una función aparte: puede
--    reagendar en cualquier momento mientras siga siendo su presupuesto.
-- =========================================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Notificación al cliente cuando el profesional propone/actualiza una fecha.
CREATE OR REPLACE FUNCTION public.notify_quote_scheduled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
    IF req.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        req.client_id, 'quote_answered', 'Fecha propuesta para tu trabajo',
        'El profesional propuso el ' || to_char(NEW.scheduled_at, 'DD/MM/YYYY HH24:MI') || ' para ' || req.category || '.',
        req.id, '/cliente'
      );
      PERFORM public.trigger_email_notification(
        req.client_id, 'quote_answered', 'Fecha propuesta para tu trabajo',
        'El profesional propuso el ' || to_char(NEW.scheduled_at, 'DD/MM/YYYY HH24:MI') || ' para ' || req.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_notify_scheduled_update ON public.quotes;
CREATE TRIGGER quotes_notify_scheduled_update
AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_scheduled();

-- La misma función también debe dispararse en el INSERT inicial (cuando el
-- profesional ya manda una fecha junto con el primer presupuesto), donde no
-- existe un OLD; usamos una función separada más simple para ese caso.
CREATE OR REPLACE FUNCTION public.notify_quote_scheduled_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  IF NEW.scheduled_at IS NOT NULL THEN
    SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
    IF req.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        req.client_id, 'quote_answered', 'Fecha propuesta para tu trabajo',
        'El profesional propuso el ' || to_char(NEW.scheduled_at, 'DD/MM/YYYY HH24:MI') || ' para ' || req.category || '.',
        req.id, '/cliente'
      );
      PERFORM public.trigger_email_notification(
        req.client_id, 'quote_answered', 'Fecha propuesta para tu trabajo',
        'El profesional propuso el ' || to_char(NEW.scheduled_at, 'DD/MM/YYYY HH24:MI') || ' para ' || req.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_notify_scheduled_insert ON public.quotes;
CREATE TRIGGER quotes_notify_scheduled_insert
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_scheduled_on_insert();

REVOKE ALL ON FUNCTION public.notify_quote_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_quote_scheduled_on_insert() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 3) Backfill: perfiles faltantes para cuentas creadas antes de que este
--    esquema quedara del todo aplicado (causa de "Usuario"/"Hola, vecino"
--    en vez del nombre real). Usa el mismo criterio que handle_new_user.
-- =========================================================================
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- =========================================================================
-- 4) Filtro de contenido en el chat interno: mientras el presupuesto de
--    ese profesional para ese pedido NO esté aceptado, se ocultan teléfonos,
--    emails y links, y se bloquean mensajes con palabras que buscan eludir
--    la plataforma (pago en efectivo/por afuera, etc). Una vez aceptado el
--    presupuesto dentro del sistema, el filtro se desactiva.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.filter_message_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deal_accepted boolean;
  banned_words text[] := ARRAY[
    'efectivo', 'en negro', 'sin factura', 'cbu', 'alias mp', 'alias de mercado pago',
    'por afuera', 'por fuera de la app', 'fuera de la app', 'sin la app', 'directo sin',
    'whatsapp', 'wsp', 'te escribo al', 'mandame un whatsapp'
  ];
  w text;
  masked text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.quotes WHERE request_id = NEW.request_id AND pro_id = NEW.pro_id AND accepted = true
  ) INTO deal_accepted;

  IF NOT deal_accepted THEN
    FOREACH w IN ARRAY banned_words LOOP
      IF NEW.body ILIKE '%' || w || '%' THEN
        RAISE EXCEPTION 'MESSAGE_BLOCKED_CIRCUMVENTION: Por seguridad, no podés compartir esto hasta aceptar un presupuesto dentro de la plataforma.';
      END IF;
    END LOOP;

    masked := regexp_replace(NEW.body, '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[correo oculto]', 'gi');
    masked := regexp_replace(masked, 'https?://\S+', '[enlace oculto]', 'gi');
    masked := regexp_replace(masked, '\mwww\.\S+', '[enlace oculto]', 'gi');
    masked := regexp_replace(masked, '(\+?\d[\d\-\s\(\)]{7,}\d)', '[teléfono oculto]', 'g');
    NEW.body := masked;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS messages_filter_content ON public.messages;
CREATE TRIGGER messages_filter_content
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.filter_message_content();

REVOKE ALL ON FUNCTION public.filter_message_content() FROM PUBLIC, anon, authenticated;