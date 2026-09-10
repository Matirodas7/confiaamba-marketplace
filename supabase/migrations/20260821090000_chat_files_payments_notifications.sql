-- =========================================================================
-- 0) Nuevos valores de enum para notificaciones (deben declararse antes de
--    usarse; en PG >= 12 se pueden usar más adelante en la misma
--    transacción siempre que no sea en el mismo comando).
-- =========================================================================
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'message_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_confirmed';

-- =========================================================================
-- 1) Ciclo de vida del trabajo y pagos
--    Estados de negocio (mapeados sobre el enum existente para no romper
--    datos ya cargados):
--      pending   -> "Pendiente"
--      quoted    -> "Presupuestado"
--      accepted  -> "En proceso"
--      done      -> "Finalizado"
--      cancelled -> "Cancelado"
--    El pago es un estado independiente de status: is_paid/paid_at.
-- =========================================================================
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Solo puede haber fecha de pago si el pedido está realmente pago.
DO $$
BEGIN
  ALTER TABLE public.service_requests
    ADD CONSTRAINT service_requests_paid_at_consistency
    CHECK ((is_paid = false AND paid_at IS NULL) OR (is_paid = true));
EXCEPTION WHEN duplicate_object THEN
  NULL; -- ya existía (corrida parcial anterior)
END $$;

-- Portfolio de trabajos anteriores del profesional.
ALTER TABLE public.pro_details
  ADD COLUMN IF NOT EXISTS portfolio_urls text[] NOT NULL DEFAULT '{}';

-- =========================================================================
-- 2) Chat interno por pedido. Cada conversación queda identificada por el
--    par (request_id, pro_id): un pedido general puede recibir presupuestos
--    de varios profesionales y cada uno tiene su propio hilo con el cliente.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  pro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_not_empty CHECK (length(trim(body)) > 0 OR image_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS messages_thread_idx ON public.messages (request_id, pro_id, created_at);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Solo participan: el cliente dueño del pedido, y el profesional del hilo.
CREATE OR REPLACE FUNCTION public.is_message_participant(_request_id uuid, _pro_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = _pro_id
    OR EXISTS (
      SELECT 1 FROM public.service_requests r WHERE r.id = _request_id AND r.client_id = auth.uid()
    );
$$;
REVOKE ALL ON FUNCTION public.is_message_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_message_participant(uuid, uuid) TO authenticated;

-- El profesional del hilo debe ser un participante legítimo del pedido:
-- o tiene una solicitud dirigida a él, o ya envió un presupuesto.
CREATE OR REPLACE FUNCTION public.is_valid_chat_pro(_request_id uuid, _pro_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_requests r WHERE r.id = _request_id AND r.target_pro_id = _pro_id
  ) OR EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.request_id = _request_id AND q.pro_id = _pro_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_valid_chat_pro(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_chat_pro(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Participants read thread messages" ON public.messages;
CREATE POLICY "Participants read thread messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_message_participant(request_id, pro_id));

DROP POLICY IF EXISTS "Participants send thread messages" ON public.messages;
CREATE POLICY "Participants send thread messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_message_participant(request_id, pro_id)
    AND public.is_valid_chat_pro(request_id, pro_id)
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
  NULL; -- ya estaba agregada, o la publicación no existe en este entorno.
END $$;

-- =========================================================================
-- 3) Notificaciones inteligentes: agregamos un link de "Ver detalle" para
--    que el front pueda redirigir directamente al chat o a la oferta.
-- =========================================================================
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;

-- Reemplazamos las funciones de notificación existentes para incluir link.
CREATE OR REPLACE FUNCTION public.notify_quote_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
  IF req.id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
    VALUES (
      req.client_id, 'quote_received', 'Nuevo presupuesto recibido',
      'Un profesional respondió tu pedido de ' || req.category || '.', req.id, '/cliente'
    );
    PERFORM public.trigger_email_notification(
      req.client_id, 'quote_received', 'Nuevo presupuesto recibido',
      'Un profesional respondió tu pedido de ' || req.category || '.'
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_quote_answered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
BEGIN
  IF NEW.accepted = true AND OLD.accepted IS DISTINCT FROM true THEN
    SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
    IF req.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        NEW.pro_id, 'quote_answered', '¡Presupuesto aceptado!',
        'El cliente aceptó tu presupuesto para ' || req.category || '.', req.id, '/pro'
      );
      PERFORM public.trigger_email_notification(
        NEW.pro_id, 'quote_answered', '¡Presupuesto aceptado!',
        'El cliente aceptó tu presupuesto para ' || req.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_job_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE winner_pro uuid;
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    SELECT pro_id INTO winner_pro FROM public.quotes WHERE request_id = NEW.id AND accepted = true LIMIT 1;

    INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
    VALUES (NEW.client_id, 'job_done', 'Trabajo finalizado', 'Marcaste como finalizado tu pedido de ' || NEW.category || '. ¡Contanos cómo te fue!', NEW.id, '/cliente');
    PERFORM public.trigger_email_notification(
      NEW.client_id, 'job_done', 'Trabajo finalizado',
      'Marcaste como finalizado tu pedido de ' || NEW.category || '.'
    );

    IF winner_pro IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (winner_pro, 'job_done', 'Trabajo finalizado', 'El cliente marcó como finalizado el trabajo de ' || NEW.category || '.', NEW.id, '/pro');
      PERFORM public.trigger_email_notification(
        winner_pro, 'job_done', 'Trabajo finalizado',
        'El cliente marcó como finalizado el trabajo de ' || NEW.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 3a) Notificación al recibir un mensaje nuevo, con link directo al chat.
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.service_requests;
DECLARE recipient uuid;
DECLARE chat_link text;
BEGIN
  SELECT * INTO req FROM public.service_requests WHERE id = NEW.request_id;
  IF req.id IS NULL THEN
    RETURN NEW;
  END IF;

  recipient := CASE WHEN NEW.sender_id = req.client_id THEN NEW.pro_id ELSE req.client_id END;
  chat_link := '/mensajes?requestId=' || NEW.request_id::text || '&proId=' || NEW.pro_id::text;

  INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
  VALUES (
    recipient, 'message_received', 'Nuevo mensaje',
    'Tenés un mensaje nuevo sobre tu pedido de ' || req.category || '.', req.id, chat_link
  );
  PERFORM public.trigger_email_notification(
    recipient, 'message_received', 'Nuevo mensaje',
    'Tenés un mensaje nuevo sobre tu pedido de ' || req.category || '.'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS messages_notify_new ON public.messages;
CREATE TRIGGER messages_notify_new
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 3b) Notificación al profesional cuando el cliente confirma el pago.
CREATE OR REPLACE FUNCTION public.notify_payment_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE winner_pro uuid;
BEGIN
  IF NEW.is_paid = true AND OLD.is_paid IS DISTINCT FROM true THEN
    SELECT pro_id INTO winner_pro FROM public.quotes WHERE request_id = NEW.id AND accepted = true LIMIT 1;
    IF winner_pro IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id, link)
      VALUES (
        winner_pro, 'payment_confirmed', '¡Pago confirmado!',
        'El cliente confirmó el pago del trabajo de ' || NEW.category || '.', NEW.id, '/pro'
      );
      PERFORM public.trigger_email_notification(
        winner_pro, 'payment_confirmed', '¡Pago confirmado!',
        'El cliente confirmó el pago del trabajo de ' || NEW.category || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS service_requests_notify_payment ON public.service_requests;
CREATE TRIGGER service_requests_notify_payment
AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_confirmed();

REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_payment_confirmed() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 4) Storage buckets
--    - avatars           (público)  {user_id}/{file}
--    - request-photos    (privado)  {request_id}/{file}   fotos del problema
--    - chat-attachments  (privado)  {request_id}/{pro_id}/{file}
--    - portfolio         (público)  {pro_id}/{file}        galería de trabajos
--    - pro-documents     (privado)  {pro_id}/{file}         DNI y certificados
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png','image/jpeg','image/webp']),
  ('request-photos', 'request-photos', true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('chat-attachments', 'chat-attachments', false, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('portfolio', 'portfolio', true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('pro-documents', 'pro-documents', false, 10485760, ARRAY['image/png','image/jpeg','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ---- avatars: público, solo el dueño escribe en su propia carpeta ----
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---- portfolio: público de lectura, solo el pro dueño escribe ----
DROP POLICY IF EXISTS "portfolio_public_read" ON storage.objects;
CREATE POLICY "portfolio_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio');
DROP POLICY IF EXISTS "portfolio_owner_write" ON storage.objects;
CREATE POLICY "portfolio_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "portfolio_owner_delete" ON storage.objects;
CREATE POLICY "portfolio_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---- request-photos: público de lectura (foto del problema, no es un
--      dato sensible), pero solo el dueño puede subir/borrar en su propia
--      carpeta. Se sube ANTES de crear el pedido (path: {client_id}/{file}),
--      así el cliente no necesita esperar a tener un request_id todavía. ----
DROP POLICY IF EXISTS "request_photos_public_read" ON storage.objects;
CREATE POLICY "request_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'request-photos');
DROP POLICY IF EXISTS "request_photos_owner_write" ON storage.objects;
CREATE POLICY "request_photos_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "request_photos_owner_delete" ON storage.objects;
CREATE POLICY "request_photos_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'request-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---- chat-attachments: privado, solo el cliente del pedido y el
--      profesional de ese hilo puntual (path: request_id/pro_id/file) ----
DROP POLICY IF EXISTS "chat_attachments_participants_read" ON storage.objects;
CREATE POLICY "chat_attachments_participants_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.is_message_participant((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid)
  );
DROP POLICY IF EXISTS "chat_attachments_participants_write" ON storage.objects;
CREATE POLICY "chat_attachments_participants_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.is_message_participant((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid)
  );

-- ---- pro-documents: PRIVADO Y SENSIBLE (DNI, certificados). Solo el
--      profesional dueño y el administrador pueden leer. Nadie más. ----
DROP POLICY IF EXISTS "pro_documents_owner_or_admin_read" ON storage.objects;
CREATE POLICY "pro_documents_owner_or_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pro-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );
DROP POLICY IF EXISTS "pro_documents_owner_write" ON storage.objects;
CREATE POLICY "pro_documents_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pro-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "pro_documents_owner_delete" ON storage.objects;
CREATE POLICY "pro_documents_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pro-documents' AND (storage.foldername(name))[1] = auth.uid()::text);