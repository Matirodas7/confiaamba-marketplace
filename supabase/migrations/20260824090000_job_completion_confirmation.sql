-- =========================================================================
-- Nuevo paso en el ciclo de vida: el profesional marca el trabajo como
-- finalizado de su lado, pero el pedido no pasa a "done" (cerrado) hasta
-- que el CLIENTE confirme que se resolvió con éxito. Si el cliente dice
-- que no, el pedido vuelve a "accepted" (en proceso) para que el
-- profesional lo retome.
--
--   accepted --(pro marca finalizado)--> pending_confirmation
--   pending_confirmation --(cliente confirma éxito)--> done
--   pending_confirmation --(cliente dice que no se resolvió)--> accepted
-- =========================================================================
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'pending_confirmation';

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS pro_marked_done_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_note text;

-- El profesional con el presupuesto aceptado marca el trabajo como
-- finalizado de su lado. Usamos una función SECURITY DEFINER (en vez de
-- ampliar la RLS de UPDATE a los profesionales) para que solo pueda mover
-- el pedido de "accepted" a "pending_confirmation", nada más.
CREATE OR REPLACE FUNCTION public.mark_job_finished_by_pro(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = _request_id;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.quotes WHERE request_id = _request_id AND pro_id = auth.uid() AND accepted = true
  ) THEN
    RAISE EXCEPTION 'Solo el profesional con el presupuesto aceptado puede marcar este trabajo como finalizado';
  END IF;
  IF req.status <> 'accepted' THEN
    RAISE EXCEPTION 'Este pedido no está en proceso';
  END IF;

  UPDATE public.service_requests
  SET status = 'pending_confirmation', pro_marked_done_at = now()
  WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
  VALUES (
    req.client_id, 'job_done', 'El profesional marcó tu trabajo como finalizado',
    'Confirmá si el trabajo de ' || req.category || ' se resolvió con éxito.', req.id, '/cliente'
  );
  PERFORM public.trigger_email_notification(
    req.client_id, 'job_done', 'El profesional marcó tu trabajo como finalizado',
    'Confirmá si el trabajo de ' || req.category || ' se resolvió con éxito.'
  );
END; $$;

REVOKE ALL ON FUNCTION public.mark_job_finished_by_pro(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_job_finished_by_pro(uuid) TO authenticated;

-- Notificación al profesional cuando el cliente dice que el trabajo NO se
-- resolvió con éxito (el pedido vuelve a "accepted").
CREATE OR REPLACE FUNCTION public.notify_completion_rejected()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE winner_pro uuid;
BEGIN
  IF OLD.status = 'pending_confirmation' AND NEW.status = 'accepted' THEN
    SELECT pro_id INTO winner_pro FROM public.quotes WHERE request_id = NEW.id AND accepted = true LIMIT 1;
    IF winner_pro IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        winner_pro, 'job_done', 'El cliente dice que el trabajo no quedó resuelto',
        COALESCE(NULLIF(NEW.dispute_note, ''), 'El cliente marcó que el trabajo de ' || NEW.category || ' no se resolvió con éxito.'),
        NEW.id, '/pro'
      );
      PERFORM public.trigger_email_notification(
        winner_pro, 'job_done', 'El cliente dice que el trabajo no quedó resuelto',
        COALESCE(NULLIF(NEW.dispute_note, ''), 'El cliente marcó que el trabajo de ' || NEW.category || ' no se resolvió con éxito.')
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS service_requests_notify_completion_rejected ON public.service_requests;
CREATE TRIGGER service_requests_notify_completion_rejected
AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_completion_rejected();

REVOKE ALL ON FUNCTION public.notify_completion_rejected() FROM PUBLIC, anon, authenticated;