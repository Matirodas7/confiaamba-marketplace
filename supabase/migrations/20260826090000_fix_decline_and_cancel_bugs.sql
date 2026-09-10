-- =========================================================================
-- BUG FIX 1: un profesional que rechaza un trabajo dirigido ("No puedo
-- realizar este trabajo") podía seguir viéndolo en sus Leads y enviar un
-- presupuesto nuevo, porque solo guardábamos el ÚLTIMO profesional que
-- rechazó en una columna (declined_by_pro_id), no un registro permanente
-- por profesional. Pasamos a una tabla dedicada y reforzamos la RLS para
-- excluir a ese profesional puntual de ese pedido puntual, para siempre.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.declined_leads (
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  pro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  reason_note text,
  declined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, pro_id)
);
GRANT SELECT ON public.declined_leads TO authenticated;
GRANT ALL ON public.declined_leads TO service_role;
ALTER TABLE public.declined_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros read own declined leads" ON public.declined_leads;
CREATE POLICY "Pros read own declined leads" ON public.declined_leads
  FOR SELECT TO authenticated USING (pro_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- La RLS de lectura de pedidos ahora excluye los que este profesional ya
-- rechazó explícitamente (aplica tanto a solicitudes dirigidas como, por
-- las dudas, a generales).
DROP POLICY IF EXISTS "Pros read targeted or matching-category requests" ON public.service_requests;
CREATE POLICY "Pros read targeted or matching-category requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'professional')
    AND NOT EXISTS (
      SELECT 1 FROM public.declined_leads dl WHERE dl.request_id = service_requests.id AND dl.pro_id = auth.uid()
    )
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

-- Refuerzo adicional a nivel de escritura: ni siquiera con una llamada
-- directa a la API se puede insertar un presupuesto para un pedido ya
-- rechazado por ese mismo profesional.
DROP POLICY IF EXISTS "Pros manage own quotes" ON public.quotes;
CREATE POLICY "Pros manage own quotes" ON public.quotes FOR ALL TO authenticated
  USING (auth.uid() = pro_id)
  WITH CHECK (
    auth.uid() = pro_id
    AND NOT EXISTS (
      SELECT 1 FROM public.declined_leads dl
      WHERE dl.request_id = quotes.request_id AND dl.pro_id = auth.uid()
    )
  );

-- La función de rechazo ahora registra en la tabla dedicada (permanente,
-- por profesional) además de los campos informativos que ya se mostraban
-- en el pedido para el cliente/admin.
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

  INSERT INTO public.declined_leads (request_id, pro_id, reason, reason_note)
  VALUES (_request_id, auth.uid(), _reason, _reason_note)
  ON CONFLICT (request_id, pro_id) DO UPDATE
    SET reason = EXCLUDED.reason, reason_note = EXCLUDED.reason_note, declined_at = now();

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

-- =========================================================================
-- BUG FIX 2: mientras el profesional espera la confirmación del cliente
-- (pending_confirmation), el cliente podía apretar "Cancelar pedido" y
-- saltarse el flujo de "¿se resolvió con éxito?", dejando estados
-- inconsistentes (el profesional cree que terminó, el pedido queda
-- cancelado sin más explicación). Bloqueamos la cancelación directa en ese
-- estado a nivel de base: solo se puede salir de pending_confirmation vía
-- el flujo de confirmación (a 'done' o de vuelta a 'accepted').
-- =========================================================================
CREATE OR REPLACE FUNCTION public.prevent_cancel_during_confirmation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'pending_confirmation' AND NEW.status = 'cancelled' THEN
    RAISE EXCEPTION 'No podés cancelar mientras el profesional espera tu confirmación. Usá "¿Se resolvió con éxito?" para continuar.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS service_requests_prevent_cancel_confirmation ON public.service_requests;
CREATE TRIGGER service_requests_prevent_cancel_confirmation
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_cancel_during_confirmation();