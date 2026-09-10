-- =========================================================================
-- Flujo de revisión de presupuesto: el cliente puede pedirle al profesional
-- que reconsidere un presupuesto (con una nota opcional) y el profesional
-- puede editarlo y reenviarlo. Reutilizamos la misma fila de `quotes`
-- (hay UNIQUE(request_id, pro_id)), así queda un solo presupuesto vigente
-- por hilo, con su historial de revisión.
-- =========================================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS revision_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_note text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Un presupuesto aceptado no puede quedar simultáneamente en revisión.
DO $$
BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_no_revision_if_accepted CHECK (NOT (accepted = true AND revision_requested = true));
EXCEPTION WHEN duplicate_object THEN
  NULL; -- ya existía (corrida parcial anterior)
END $$;

CREATE OR REPLACE FUNCTION public.touch_quote_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_touch_updated_at ON public.quotes;
CREATE TRIGGER quotes_touch_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.touch_quote_updated_at();

-- Notificación al profesional cuando el cliente pide revisar el presupuesto.
CREATE OR REPLACE FUNCTION public.notify_revision_requested()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  IF NEW.revision_requested = true AND OLD.revision_requested IS DISTINCT FROM true THEN
    SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
    IF req.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        NEW.pro_id, 'quote_answered', 'El cliente pidió revisar tu presupuesto',
        COALESCE(NULLIF(NEW.revision_note, ''), 'Te pidieron ajustar el presupuesto de ' || req.category || '.'),
        req.id, '/pro'
      );
      PERFORM public.trigger_email_notification(
        NEW.pro_id, 'quote_answered', 'El cliente pidió revisar tu presupuesto',
        COALESCE(NULLIF(NEW.revision_note, ''), 'Te pidieron ajustar el presupuesto de ' || req.category || '.')
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_notify_revision ON public.quotes;
CREATE TRIGGER quotes_notify_revision
AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_revision_requested();

REVOKE ALL ON FUNCTION public.notify_revision_requested() FROM PUBLIC, anon, authenticated;