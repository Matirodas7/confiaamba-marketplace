import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, Send, ImageOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl, uploadToBucket, STORAGE_BUCKETS } from "@/lib/marketplace";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/Lightbox";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  request_id: string;
  pro_id: string;
  sender_id: string;
  body: string;
  image_url: string | null; // storage path dentro de chat-attachments, no URL directa
  created_at: string;
};

/**
 * Chat 1:1 vinculado a un pedido (service_request) y a un profesional
 * puntual. El cliente y ese profesional pueden intercambiar texto y fotos
 * para afinar el presupuesto sin necesidad de una visita presencial.
 */
export function ChatRoom({
  requestId,
  proId,
  currentUserId,
  otherPartyName,
  dealAccepted = false,
}: {
  requestId: string;
  proId: string;
  currentUserId: string;
  otherPartyName: string;
  dealAccepted?: boolean;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", requestId, proId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", requestId)
        .eq("pro_id", proId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  // Realtime: nuevos mensajes de este hilo se agregan sin recargar.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${requestId}-${proId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          if (row.pro_id !== proId) return;
          qc.setQueryData<Message[]>(["chat-messages", requestId, proId], (prev) =>
            prev && prev.some((m) => m.id === row.id) ? prev : [...(prev ?? []), row],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, proId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data?.length]);

  // Resolvemos URLs firmadas (bucket privado) para las imágenes adjuntas.
  useEffect(() => {
    const withImages = (messagesQuery.data ?? []).filter((m) => m.image_url && !imageUrls[m.id]);
    if (withImages.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        withImages.map(async (m) => {
          const url = await getSignedUrl(supabase, STORAGE_BUCKETS.chatAttachments, m.image_url!);
          return [m.id, url] as const;
        }),
      );
      setImageUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of entries) if (url) next[id] = url;
        return next;
      });
    })();
  }, [messagesQuery.data, imageUrls]);

  async function sendMessage(imagePath?: string) {
    const body = draft.trim();
    if (!body && !imagePath) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      pro_id: proId,
      sender_id: currentUserId,
      body,
      image_url: imagePath ?? null,
    });
    setSending(false);
    if (error) {
      if (error.message?.includes("MESSAGE_BLOCKED_CIRCUMVENTION")) {
        toast.error(
          "Por seguridad, no podés compartir teléfonos, links, ni coordinar pagos por fuera de la plataforma hasta aceptar un presupuesto.",
        );
      } else {
        toast.error("No se pudo enviar el mensaje.");
      }
      return;
    }
    setDraft("");
    qc.invalidateQueries({ queryKey: ["chat-messages", requestId, proId] });
  }

  async function handleAttachment(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen pesa más de 10MB.");
      return;
    }
    setSending(true);
    try {
      const { path } = await uploadToBucket({
        supabase,
        bucket: STORAGE_BUCKETS.chatAttachments,
        folder: `${requestId}/${proId}`,
        file,
        isPublic: false,
      });
      await sendMessage(path);
    } catch {
      toast.error("No pudimos subir la imagen.");
      setSending(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      {!dealAccepted && (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-featured/10 p-2.5 text-xs text-featured-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Por tu seguridad, ocultamos teléfonos, emails y links hasta aceptar un presupuesto
            dentro de la plataforma. Coordinar pagos por fuera no está permitido.
          </p>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-3">
        {messagesQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (messagesQuery.data ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay mensajes con {otherPartyName}. Escribí para empezar a coordinar el
            trabajo.
          </p>
        ) : (
          (messagesQuery.data ?? []).map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.image_url && (
                    <div className="mb-1.5 overflow-hidden rounded-lg">
                      {imageUrls[m.id] ? (
                        <img
                          src={imageUrls[m.id]}
                          alt="Adjunto"
                          onClick={() => setZoomSrc(imageUrls[m.id] ?? null)}
                          className="max-h-56 w-full cursor-zoom-in object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-40 items-center justify-center bg-black/10">
                          <ImageOff className="size-5 opacity-60" />
                        </div>
                      )}
                    </div>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  <p
                    className={cn("mt-1 text-[10px] opacity-70", mine ? "text-right" : "text-left")}
                  >
                    {new Date(m.created_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-2 flex items-center gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleAttachment(e.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={sending}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar foto"
        >
          <Paperclip className="size-4" />
        </Button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Enviar">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>

      {zoomSrc && <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}
    </div>
  );
}
