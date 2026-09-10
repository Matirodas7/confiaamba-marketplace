import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatRoom } from "@/components/ChatRoom";
import { Button } from "@/components/ui/button";

type MensajesSearch = { requestId?: string; proId?: string };

export const Route = createFileRoute("/_authenticated/mensajes")({
  validateSearch: (search: Record<string, unknown>): MensajesSearch => {
    const result: MensajesSearch = {};
    if (typeof search["requestId"] === "string") result.requestId = search["requestId"];
    if (typeof search["proId"] === "string") result.proId = search["proId"];
    return result;
  },
  head: () => ({ meta: [{ title: "Mensajes | ConfiaAMBA" }] }),
  component: MensajesPage,
});

function MensajesPage() {
  const { user, role } = useAuth();
  const { requestId, proId } = Route.useSearch();

  const requestQuery = useQuery({
    queryKey: ["chat-request", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("id", requestId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const otherPartyId = role === "professional" ? requestQuery.data?.client_id : proId;

  const otherPartyQuery = useQuery({
    queryKey: ["chat-other-party", otherPartyId],
    enabled: !!otherPartyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", otherPartyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Mientras el presupuesto de este profesional puntual para este pedido
  // no esté aceptado, el chat oculta datos de contacto automáticamente.
  const quoteQuery = useQuery({
    queryKey: ["chat-quote", requestId, proId],
    enabled: !!requestId && !!proId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("accepted")
        .eq("request_id", requestId!)
        .eq("pro_id", proId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const backTo = role === "professional" ? "/pro" : "/cliente";

  if (!requestId || !proId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">
          Este enlace de chat no es válido. Volvé a tu panel para abrir una conversación.
        </p>
        <Button asChild className="mt-4">
          <Link to={backTo as "/cliente"}>Volver a mi panel</Link>
        </Button>
      </main>
    );
  }

  if (requestQuery.isLoading || !user) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requestQuery.data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">No encontramos este pedido o no tenés acceso.</p>
        <Button asChild className="mt-4">
          <Link to={backTo as "/cliente"}>Volver a mi panel</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-4">
      <div className="mb-2 flex items-center gap-3 border-b border-border pb-3">
        <Button asChild variant="ghost" size="icon">
          <Link to={backTo as "/cliente"}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <p className="font-semibold">{otherPartyQuery.data?.full_name ?? "Conversación"}</p>
          <p className="text-xs text-muted-foreground">
            {requestQuery.data.category} · {requestQuery.data.address}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatRoom
          requestId={requestId}
          proId={proId}
          currentUserId={user.id}
          otherPartyName={otherPartyQuery.data?.full_name ?? "la otra parte"}
          dealAccepted={!!quoteQuery.data?.accepted}
        />
      </div>
    </main>
  );
}
