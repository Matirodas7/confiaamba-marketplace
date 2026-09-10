-- =========================================================================
-- 1) Solicitud dirigida (targeted booking): un cliente puede pedir presupuesto
--    a un profesional específico. Cuando target_pro_id es NULL, el pedido es
--    "general" (broadcast) y solo debe llegar a los profesionales cuya
--    categoría coincida.
-- =========================================================================
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS target_pro_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS service_requests_target_pro_idx ON public.service_requests (target_pro_id);

-- A client can never target themselves (defense in depth; UI also blocks this).
DO $$
BEGIN
  ALTER TABLE public.service_requests
    ADD CONSTRAINT service_requests_no_self_target CHECK (target_pro_id IS DISTINCT FROM client_id);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- ya existía (corrida parcial anterior)
END $$;

-- Replace the old "any professional can read any open request" policy with
-- one that only exposes: (a) requests targeted directly at that pro, or
-- (b) general/broadcast requests whose category is one the pro offers.
DROP POLICY IF EXISTS "Pros read open requests" ON public.service_requests;
DROP POLICY IF EXISTS "Pros read targeted or matching-category requests" ON public.service_requests;
CREATE POLICY "Pros read targeted or matching-category requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professional')
    AND (
      target_pro_id = auth.uid()
      OR (
        target_pro_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.pro_details pd
          WHERE pd.pro_id = auth.uid()
            AND category = ANY (pd.categories)
        )
      )
    )
  );

-- =========================================================================
-- 2) Contador de "Trabajos realizados": +1 al profesional aceptado cada vez
--    que un pedido pasa a estado 'done'.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.increment_jobs_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE winner_pro uuid;
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    SELECT pro_id INTO winner_pro
    FROM public.quotes
    WHERE request_id = NEW.id AND accepted = true
    LIMIT 1;

    IF winner_pro IS NOT NULL THEN
      UPDATE public.pro_details
      SET jobs_done = jobs_done + 1
      WHERE pro_id = winner_pro;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS service_requests_jobs_done ON public.service_requests;
CREATE TRIGGER service_requests_jobs_done
AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.increment_jobs_done();

REVOKE ALL ON FUNCTION public.increment_jobs_done() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 3) Notificaciones (en-app; disparadas también hacia una Edge Function que
--    envía el email real — ver supabase/functions/notify-email).
-- =========================================================================
DO $$
BEGIN
  CREATE TYPE public.notification_type AS ENUM ('quote_received', 'quote_answered', 'job_done');
EXCEPTION WHEN duplicate_object THEN
  NULL; -- el tipo ya existe (corrida parcial anterior)
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: fire-and-forget call to the notify-email Edge Function. Uses pg_net
-- when available; silently no-ops otherwise so the trigger never blocks the
-- write that triggered it (email delivery is best-effort/simulated).
CREATE OR REPLACE FUNCTION public.trigger_email_notification(
  _user_id uuid, _type text, _title text, _body text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  edge_url text := current_setting('app.settings.notify_email_url', true);
BEGIN
  IF edge_url IS NULL OR edge_url = '' THEN
    RETURN; -- Edge Function URL not configured in this environment; skip.
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := edge_url,
      body := jsonb_build_object('user_id', _user_id, 'type', _type, 'title', _title, 'body', _body),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not installed or reachable in this environment — safe to ignore.
    NULL;
  END;
END; $$;
REVOKE ALL ON FUNCTION public.trigger_email_notification(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- 3a) Cliente y profesional reciben notificación al RECIBIR un presupuesto.
CREATE OR REPLACE FUNCTION public.notify_quote_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
  IF req.id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, request_id)
    VALUES (
      req.client_id, 'quote_received', 'Nuevo presupuesto recibido',
      'Un profesional respondió tu pedido de ' || req.category || '.', req.id
    );
    PERFORM public.trigger_email_notification(
      req.client_id, 'quote_received', 'Nuevo presupuesto recibido',
      'Un profesional respondió tu pedido de ' || req.category || '.'
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_notify_received ON public.quotes;
CREATE TRIGGER quotes_notify_received
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_received();

-- 3b) Cliente y profesional reciben notificación al CONTESTAR (aceptar) un presupuesto.
CREATE OR REPLACE FUNCTION public.notify_quote_answered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  IF NEW.accepted = true AND OLD.accepted IS DISTINCT FROM true THEN
    SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
    IF req.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id)
      VALUES (
        NEW.pro_id, 'quote_answered', '¡Presupuesto aceptado!',
        'El cliente aceptó tu presupuesto para ' || req.category || '.', req.id
      );
      PERFORM public.trigger_email_notification(
        NEW.pro_id, 'quote_answered', '¡Presupuesto aceptado!',
        'El cliente aceptó tu presupuesto para ' || req.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS quotes_notify_answered ON public.quotes;
CREATE TRIGGER quotes_notify_answered
AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_answered();

-- 3c) Cliente y profesional reciben notificación al FINALIZAR el trabajo.
CREATE OR REPLACE FUNCTION public.notify_job_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE winner_pro uuid;
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    SELECT pro_id INTO winner_pro FROM public.quotes WHERE request_id = NEW.id AND accepted = true LIMIT 1;

    INSERT INTO public.notifications (user_id, type, title, body, request_id)
    VALUES (NEW.client_id, 'job_done', 'Trabajo finalizado', 'Marcaste como finalizado tu pedido de ' || NEW.category || '. ¡Contanos cómo te fue!', NEW.id);
    PERFORM public.trigger_email_notification(
      NEW.client_id, 'job_done', 'Trabajo finalizado',
      'Marcaste como finalizado tu pedido de ' || NEW.category || '.'
    );

    IF winner_pro IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id)
      VALUES (winner_pro, 'job_done', 'Trabajo finalizado', 'El cliente marcó como finalizado el trabajo de ' || NEW.category || '.', NEW.id);
      PERFORM public.trigger_email_notification(
        winner_pro, 'job_done', 'Trabajo finalizado',
        'El cliente marcó como finalizado el trabajo de ' || NEW.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS service_requests_notify_done ON public.service_requests;
CREATE TRIGGER service_requests_notify_done
AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_job_done();

REVOKE ALL ON FUNCTION public.notify_quote_received() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_quote_answered() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_job_done() FROM PUBLIC, anon, authenticated;