import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  CreditCard,
  MessageCircle,
  DollarSign,
  CalendarClock,
  ShieldCheck,
  MapPin,
  FileText,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StarPicker, StarRating, VerifiedBadge } from "@/components/trust";
import { DateTimePicker } from "@/components/DateTimePicker";
import { ReasonDialog } from "@/components/ReasonDialog";
import { JobDetailDialog } from "@/components/JobDetailDialog";
import { ImageUploader, type UploadedFile } from "@/components/ImageUploader";
import { cn } from "@/lib/utils";
import {
  REQUEST_STATUS_LABELS,
  formatARS,
  STORAGE_BUCKETS,
  getSignedUrl,
  QUOTE_REJECT_REASONS,
  REQUEST_CANCEL_REASONS,
  PRO_DECLINE_REASONS,
  REVIEW_TAGS,
  reasonLabel,
  ZONE_LABELS,
  type Zone,
} from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/cliente")({
  beforeLoad: async ({ context }) => {
    const roles = context.roles ?? [];
    if (roles.length > 0 && !roles.includes("client") && !roles.includes("admin")) {
      throw redirect({ to: "/pro" });
    }
  },
  head: () => ({
    meta: [
      { title: "Mi panel de cliente | ConfiaAMBA" },
      {
        name: "description",
        content: "Seguí tus pedidos activos, compará presupuestos y calificá los trabajos.",
      },
      { property: "og:title", content: "Mi panel de cliente | ConfiaAMBA" },
      { property: "og:description", content: "Pedidos, presupuestos y reseñas en un solo lugar." },
    ],
  }),
  component: ClientDashboard,
});

const ACTIVE_STATUS_ORDER = ["pending_confirmation", "accepted", "quoted", "pending"];
const ACTIVE_STATUS_TITLES: Record<string, string> = {
  pending_confirmation: "Necesitan tu confirmación",
  accepted: "En proceso",
  quoted: "Con presupuestos para revisar",
  pending: "Esperando presupuestos",
};

function ClientDashboard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [pendingReview, setPendingReview] = useState<{
    proId: string;
    proName: string;
    requestId: string;
  } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    requestId: string;
    proId: string;
    proName: string;
    price: number;
  } | null>(null);

  const requests = useQuery({
    queryKey: ["client-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const quotes = useQuery({
    queryKey: ["client-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*");
      if (error) throw error;
      return data;
    },
  });

  const proIds = (quotes.data ?? []).map((q) => q.pro_id);
  const { nameOf } = useProfileLookup(proIds);

  const myReviews = useQuery({
    queryKey: ["client-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("client_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  async function acceptQuote(quoteId: string, requestId: string) {
    const { error } = await supabase.from("quotes").update({ accepted: true }).eq("id", quoteId);
    if (error) {
      toast.error("No se pudo aceptar el presupuesto");
      return;
    }
    await supabase
      .from("service_requests")
      .update({ status: "accepted", accepted_quote_id: quoteId })
      .eq("id", requestId);
    toast.success("Presupuesto aceptado");
    qc.invalidateQueries();
  }

  async function markDone(requestId: string) {
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "done" })
      .eq("id", requestId);
    if (error) {
      toast.error("No se pudo actualizar el pedido");
      return;
    }
    toast.success("¡Genial! Confirmá el pago para poder calificar al profesional.");
    const acceptedQuote = (quotes.data ?? []).find((q) => q.request_id === requestId && q.accepted);
    if (acceptedQuote) {
      setPendingPayment({
        requestId,
        proId: acceptedQuote.pro_id,
        proName: nameOf(acceptedQuote.pro_id),
        price: Number(acceptedQuote.price_offered),
      });
    }
    qc.invalidateQueries();
  }

  async function rejectCompletion(requestId: string, note: string) {
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "accepted", dispute_note: note || null })
      .eq("id", requestId);
    if (error) {
      toast.error("No se pudo actualizar el pedido");
      return;
    }
    toast.success("Le avisamos al profesional que hay que seguir trabajando en esto");
    qc.invalidateQueries();
  }

  async function markPaid(requestId: string, proId: string, proName: string) {
    const { error } = await supabase
      .from("service_requests")
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) {
      toast.error("No se pudo confirmar el pago");
      return;
    }
    toast.success("Pago confirmado. ¡Ahora podés calificar al profesional!");
    setPendingPayment(null);
    setPendingReview({ proId, proName, requestId });
    qc.invalidateQueries();
  }

  const active = (requests.data ?? []).filter(
    (r) => r.status !== "done" && r.status !== "cancelled",
  );
  const history = (requests.data ?? []).filter((r) => r.status === "done");
  const cancelled = (requests.data ?? []).filter((r) => r.status === "cancelled");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Hola, {profile?.full_name || "vecino"}
          </h1>
          <p className="text-sm text-muted-foreground">Gestioná tus pedidos y presupuestos.</p>
        </div>
        <Button asChild size="sm" className="sm:size-default">
          <Link to="/solicitar">
            <Plus className="size-4 mr-1" /> Nuevo pedido
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="activos" className="mt-6 sm:mt-8">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="activos">En curso</TabsTrigger>
          <TabsTrigger value="historial">Finalizados</TabsTrigger>
          <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-6 space-y-6">
          {requests.isLoading && <Loader2 className="size-5 animate-spin" />}
          {!requests.isLoading && active.length === 0 && (
            <div className="trust-card p-8 text-center text-sm text-muted-foreground">
              Todavía no tenés pedidos activos.
            </div>
          )}
          {ACTIVE_STATUS_ORDER.filter((status) => active.some((r) => r.status === status)).map(
            (status) => (
              <div key={status}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  {ACTIVE_STATUS_TITLES[status]}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {active.filter((r) => r.status === status).length}
                  </span>
                </h2>
                <div className="space-y-3">
                  <Accordion type="single" collapsible className="space-y-3">
                    {active
                      .filter((r) => r.status === status)
                      .map((r) => {
                        const rq = (quotes.data ?? []).filter(
                          (q) => q.request_id === r.id && !q.rejected,
                        );
                        const acceptedQ = rq.find((q) => q.accepted);
                        return (
                          <AccordionItem
                            key={r.id}
                            value={r.id}
                            className="trust-card overflow-hidden border border-border/70 rounded-2xl px-4 sm:px-6"
                          >
                            {/* Resumen reestructurado y responsive */}
                            <AccordionTrigger className="py-4 hover:no-underline">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between min-w-0 flex-1 gap-2 pr-2 text-left">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground">{r.category}</h3>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
                                      <MapPin className="size-3 text-primary" />
                                      {ZONE_LABELS[r.zone as Zone] ?? r.zone}
                                    </span>
                                  </div>
                                  <p className="truncate text-xs sm:text-sm text-muted-foreground">
                                    {r.description}
                                  </p>
                                </div>

                                <div className="flex items-center shrink-0 pt-1 sm:pt-0">
                                  {acceptedQ ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Aceptado</span>
                                      <span className="font-display text-base sm:text-lg font-bold text-foreground">
                                        {formatARS(Number(acceptedQ.price_offered))}
                                      </span>
                                    </div>
                                  ) : rq.length > 0 ? (
                                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                                      {rq.length} presupuesto{rq.length === 1 ? "" : "s"}
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                                      Sin presupuestos
                                    </span>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="pb-5 sm:pb-6">
                              {/* Detalle + cancelar */}
                              <div className="grid gap-5 border-t border-border/60 pt-4 md:grid-cols-3">
                                <div className="md:col-span-2">
                                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <FileText className="size-3.5" />
                                    Detalle de tu solicitud
                                  </p>
                                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{r.description}</p>
                                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <MapPin className="size-4 shrink-0 text-primary" />
                                    {r.address}
                                  </p>
                                </div>

                                <div className="flex flex-col gap-3 md:col-span-1 md:border-l md:border-border/60 md:pl-5">
                                  <div className="rounded-xl bg-surface p-3 text-center border border-border/50">
                                    <Inbox className="mx-auto size-4 text-muted-foreground" />
                                    <p className="mt-1 text-xl font-bold">{rq.length}</p>
                                    <p className="text-xs font-medium text-muted-foreground">
                                      presupuesto{rq.length === 1 ? "" : "s"} recibido
                                      {rq.length === 1 ? "" : "s"}
                                    </p>
                                  </div>

                                  {r.status !== "cancelled" &&
                                    r.status !== "pending_confirmation" && (
                                      <ReasonDialog
                                        trigger={
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                          >
                                            Cancelar pedido
                                          </Button>
                                        }
                                        title="¿Por qué cancelás este pedido?"
                                        reasons={REQUEST_CANCEL_REASONS}
                                        destructive
                                        confirmLabel="Cancelar pedido"
                                        onConfirm={async (reason, note) => {
                                          const { error } = await supabase
                                            .from("service_requests")
                                            .update({
                                              status: "cancelled",
                                              cancel_reason: reason,
                                              cancel_reason_note: note || null,
                                            })
                                            .eq("id", r.id);
                                          if (error) {
                                            toast.error(
                                              error.message || "No se pudo cancelar el pedido",
                                            );
                                            return;
                                          }
                                          toast.success("Pedido cancelado");
                                          qc.invalidateQueries();
                                        }}
                                      />
                                    )}
                                </div>
                              </div>

                              {/* Presupuestos Recibidos: Diseño limpio que evita cortes de precio */}
                              <div className="mt-4 space-y-2.5">
                                {rq.map((q) => (
                                  <div
                                    key={q.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-surface p-3.5 border border-border/60"
                                  >
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <p className="text-sm font-bold text-foreground">{nameOf(q.pro_id)}</p>
                                      {q.message && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{q.message}</p>
                                      )}
                                      {q.scheduled_at && (
                                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                          <CalendarClock className="size-3.5" />
                                          Propone el{" "}
                                          {new Date(q.scheduled_at).toLocaleString("es-AR", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          })}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                                      <span className="font-display font-extrabold text-base sm:text-lg text-foreground shrink-0">
                                        {formatARS(Number(q.price_offered))}
                                      </span>

                                      <div className="flex items-center gap-2">
                                        <Button asChild size="icon" variant="outline" className="size-8 shrink-0" title="Mensajes">
                                          <Link
                                            to="/mensajes"
                                            search={{ requestId: r.id, proId: q.pro_id }}
                                          >
                                            <MessageCircle className="size-4" />
                                          </Link>
                                        </Button>
                                        {q.accepted ? (
                                          <Badge className="bg-emerald-600 text-white font-semibold">
                                            Aceptado
                                          </Badge>
                                        ) : q.revision_requested ? (
                                          <Badge variant="secondary" className="text-xs">
                                            Revisión pedida
                                          </Badge>
                                        ) : (
                                          <>
                                            <Button size="sm" onClick={() => acceptQuote(q.id, r.id)}>
                                              Aceptar
                                            </Button>
                                            <RequestRevisionDialog
                                              quoteId={q.id}
                                              proName={nameOf(q.pro_id)}
                                              onDone={() => qc.invalidateQueries()}
                                            />
                                            <ReasonDialog
                                              trigger={
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-destructive hover:text-destructive px-2"
                                                >
                                                  Rechazar
                                                </Button>
                                              }
                                              title={`¿Por qué rechazás el presupuesto de ${nameOf(q.pro_id)}?`}
                                              reasons={QUOTE_REJECT_REASONS}
                                              destructive
                                              confirmLabel="Rechazar presupuesto"
                                              onConfirm={async (reason, note) => {
                                                const { error } = await supabase
                                                  .from("quotes")
                                                  .update({
                                                    rejected: true,
                                                    reject_reason: reason,
                                                    reject_reason_note: note || null,
                                                  })
                                                  .eq("id", q.id);
                                                if (error) {
                                                  toast.error("No se pudo rechazar el presupuesto");
                                                  return;
                                                }
                                                toast.success("Presupuesto rechazado");
                                                qc.invalidateQueries();
                                              }}
                                            />
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {r.declined_by_pro_id && r.status === "pending" && (
                                <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                                  Un profesional no pudo tomar este pedido
                                  {r.decline_reason
                                    ? `: ${reasonLabel(PRO_DECLINE_REASONS, r.decline_reason)}${r.decline_reason_note ? ` (${r.decline_reason_note})` : ""}`
                                    : ""}
                                  . Tu pedido sigue visible para otros profesionales de la
                                  categoría.
                                </p>
                              )}

                              {(r.status === "accepted" || r.status === "pending_confirmation") &&
                                acceptedQ && (
                                  <div className="mt-3 rounded-2xl bg-emerald-500/10 p-3.5 text-xs sm:text-sm text-foreground space-y-2 border border-emerald-500/20">
                                    <p className="flex items-center gap-2 font-medium">
                                      <MapPin className="size-4 text-emerald-600 shrink-0" /> {r.address}
                                    </p>
                                    {acceptedQ.scheduled_at ? (
                                      <p className="flex items-center gap-2 text-muted-foreground">
                                        <CalendarClock className="size-4 text-emerald-600 shrink-0" />
                                        {new Date(acceptedQ.scheduled_at).toLocaleString("es-AR", {
                                          dateStyle: "long",
                                          timeStyle: "short",
                                        })}
                                      </p>
                                    ) : (
                                      <div className="pt-1">
                                        <p className="mb-2 text-muted-foreground">
                                          Todavía no hay una fecha programada para el trabajo.
                                        </p>
                                        <DateTimePicker
                                          label="Elegir fecha para el trabajo"
                                          value={undefined}
                                          onChange={async (d) => {
                                            if (!d) return;
                                            const { error } = await supabase.rpc(
                                              "client_schedule_job",
                                              {
                                                _quote_id: acceptedQ.id,
                                                _scheduled_at: d.toISOString(),
                                              },
                                            );
                                            if (error) {
                                              toast.error("No se pudo guardar la fecha");
                                              return;
                                            }
                                            toast.success("Le avisamos la fecha al profesional");
                                            qc.invalidateQueries();
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}

                              {r.status === "accepted" && (
                                <p className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                                  <Loader2 className="size-3.5 animate-spin shrink-0" />
                                  En proceso. Cuando el profesional termine, te va a pedir que
                                  confirmes acá.
                                </p>
                              )}

                              {r.status === "pending_confirmation" && (
                                <div className="mt-3 rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
                                  <p className="text-sm font-semibold text-amber-900">
                                    El profesional marcó este trabajo como finalizado.
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    ¿Se resolvió con éxito?
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => markDone(r.id)}>
                                      Sí, se resolvió con éxito
                                    </Button>
                                    <RejectCompletionDialog
                                      onConfirm={(note) => rejectCompletion(r.id, note)}
                                    />
                                  </div>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                  </Accordion>
                </div>
              </div>
            ),
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-6 space-y-4">
          {history.length === 0 && (
            <div className="trust-card p-8 text-center text-sm text-muted-foreground">
              Todavía no tenés servicios completados.
            </div>
          )}
          <Accordion type="single" collapsible className="space-y-3">
            {history.map((r) => {
              const accepted = (quotes.data ?? []).find((q) => q.request_id === r.id && q.accepted);
              const review = (myReviews.data ?? []).find((rv) => rv.request_id === r.id);
              return (
                <AccordionItem
                  key={r.id}
                  value={r.id}
                  className="trust-card overflow-hidden border border-border/70 rounded-2xl px-4 sm:px-6"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between min-w-0 flex-1 gap-2 pr-2 text-left">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-emerald-600 text-white font-medium">Finalizado</Badge>
                          <h3 className="text-base font-bold text-foreground">{r.category}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.updated_at).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {accepted && ` · ${nameOf(accepted.pro_id)}`}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-display text-base sm:text-lg font-bold text-foreground">
                          {formatARS(Number(accepted?.price_offered ?? 0))}
                        </span>
                        {r.is_paid ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0">
                            <DollarSign className="size-3 mr-1" /> Pagado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="size-3 mr-1" /> Pendiente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="space-y-4 border-t border-border/60 pt-4 pb-5 sm:pb-6">
                    {accepted && (
                      <Button asChild size="sm" className="w-full">
                        <Link to="/solicitar" search={{ proId: accepted.pro_id }}>
                          Recontratar a {nameOf(accepted.pro_id)}
                        </Link>
                      </Button>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Detalle del trabajo
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground">{r.description}</p>
                    </div>

                    <div className="rounded-xl bg-surface p-3 border border-border/50">
                      <dl className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Presupuesto acordado</dt>
                          <dd className="font-medium">
                            {formatARS(Number(accepted?.price_offered ?? 0))}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                          <dt>Total</dt>
                          <dd>{formatARS(Number(accepted?.price_offered ?? 0))}</dd>
                        </div>
                        {r.is_paid && r.paid_at && (
                          <p className="pt-1 text-xs text-muted-foreground">
                            Pagado el{" "}
                            {new Date(r.paid_at).toLocaleDateString("es-AR", {
                              dateStyle: "long",
                            })}
                          </p>
                        )}
                      </dl>
                    </div>

                    <p className="flex items-start gap-1.5 text-xs sm:text-sm text-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {r.address}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {accepted && !r.is_paid && (
                        <Button
                          size="sm"
                          onClick={() => markPaid(r.id, accepted.pro_id, nameOf(accepted.pro_id))}
                        >
                          <CreditCard className="size-4 mr-1.5" /> Marcar como pagado
                        </Button>
                      )}
                      {accepted && (
                        <Button asChild size="icon" variant="outline" className="size-8" title="Mensajes">
                          <Link to="/mensajes" search={{ requestId: r.id, proId: accepted.pro_id }}>
                            <MessageCircle className="size-4" />
                          </Link>
                        </Button>
                      )}
                      <JobDetailDialog
                        data={{
                          requestId: r.id,
                          category: r.category,
                          description: r.description,
                          address: r.address,
                          zone: r.zone,
                          createdAt: r.created_at,
                          scheduledAt: accepted?.scheduled_at ?? null,
                          price: Number(accepted?.price_offered ?? 0),
                          status: r.status,
                          statusLabel: REQUEST_STATUS_LABELS[r.status] ?? r.status,
                          isPaid: r.is_paid,
                          paidAt: r.paid_at,
                          clientName: profile?.full_name ?? "Vos",
                          proName: accepted ? nameOf(accepted.pro_id) : "Sin asignar",
                        }}
                      />
                    </div>

                    {review ? (
                      <div className="rounded-xl bg-surface p-3 border border-border/50">
                        <StarRating value={review.stars} size={14} />
                        {review.tags?.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {review.tags.map((t: string) => (
                              <span
                                key={t}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ) : accepted && r.is_paid ? (
                      <ReviewDialog
                        proId={accepted.pro_id}
                        proName={nameOf(accepted.pro_id)}
                        requestId={r.id}
                        clientId={user!.id}
                        onDone={() => qc.invalidateQueries()}
                      />
                    ) : accepted ? (
                      <p className="text-xs text-muted-foreground">
                        Confirmá el pago para poder calificar al profesional.
                      </p>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        <TabsContent value="cancelados" className="mt-6 space-y-4">
          {cancelled.length === 0 && (
            <div className="trust-card p-8 text-center text-sm text-muted-foreground">
              No tenés pedidos cancelados.
            </div>
          )}
          <Accordion type="single" collapsible className="space-y-3">
            {cancelled.map((r) => (
              <AccordionItem
                key={r.id}
                value={r.id}
                className="trust-card overflow-hidden border border-border/70 rounded-2xl px-4 sm:px-6"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-3 pr-2 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">Cancelado</Badge>
                        <h3 className="text-sm font-semibold">{r.category}</h3>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {new Date(r.updated_at).toLocaleDateString("es-AR", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 border-t border-border/60 pt-4 pb-5 sm:pb-6">
                  <p className="text-sm text-foreground">{r.description}</p>
                  {r.cancel_reason && (
                    <p className="text-xs text-muted-foreground">
                      Motivo: {reasonLabel(REQUEST_CANCEL_REASONS, r.cancel_reason)}
                      {r.cancel_reason_note ? ` — "${r.cancel_reason_note}"` : ""}
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/solicitar">Pedir de nuevo</Link>
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>

      {pendingPayment && (
        <Dialog open={!!pendingPayment} onOpenChange={(o) => !o && setPendingPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Ya le pagaste a {pendingPayment.proName}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Confirmá el pago de {formatARS(pendingPayment.price)} para poder calificar el
              servicio. Si todavía no pagaste, podés confirmarlo más tarde desde "Historial".
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  markPaid(pendingPayment.requestId, pendingPayment.proId, pendingPayment.proName)
                }
              >
                Sí, ya pagué
              </Button>
              <Button variant="outline" onClick={() => setPendingPayment(null)}>
                Todavía no
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {pendingReview && (
        <ReviewDialog
          proId={pendingReview.proId}
          proName={pendingReview.proName}
          requestId={pendingReview.requestId}
          clientId={user!.id}
          open={!!pendingReview}
          onOpenChange={(o) => !o && setPendingReview(null)}
          onDone={() => {
            setPendingReview(null);
            qc.invalidateQueries();
          }}
        />
      )}
    </main>
  );
}

function ReviewDialog({
  proId,
  proName,
  requestId,
  clientId,
  onDone,
  open,
  onOpenChange,
}: {
  proId: string;
  proName: string;
  requestId: string;
  clientId: string;
  onDone: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : uncontrolledOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setUncontrolledOpen;

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" className="mt-4">Calificar a {proName}</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cómo fue el servicio con {proName}?</DialogTitle>
        </DialogHeader>
        <StarPicker value={stars} onChange={setStars} />
        <div className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                tags.includes(t)
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Textarea
          rows={4}
          placeholder="Contá tu experiencia para ayudar a otros vecinos (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button
          onClick={async () => {
            const { error } = await supabase.from("reviews").insert({
              pro_id: proId,
              client_id: clientId,
              request_id: requestId,
              stars,
              comment,
              tags,
            });
            if (error) {
              toast.error("No se pudo publicar la reseña");
              return;
            }
            toast.success("¡Gracias por tu reseña!");
            setDialogOpen(false);
            onDone();
          }}
        >
          Publicar reseña
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function RequestRevisionDialog({
  quoteId,
  proName,
  onDone,
}: {
  quoteId: string;
  proName: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    const { error } = await supabase
      .from("quotes")
      .update({ revision_requested: true, revision_note: note || null })
      .eq("id", quoteId);
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar el pedido de revisión");
      return;
    }
    toast.success("Le avisamos al profesional que revise el presupuesto");
    setOpen(false);
    setNote("");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Pedir revisión
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedir revisión a {proName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Contale qué te gustaría ajustar (precio, alcance del trabajo, etc.). Podrá editar y
          reenviarte el presupuesto.
        </p>
        <Textarea
          rows={4}
          placeholder="Ej: ¿Podrías incluir los materiales en el presupuesto?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button onClick={submit} disabled={sending}>
          {sending && <Loader2 className="size-4 animate-spin mr-1.5" />} Enviar pedido de revisión
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ClientVerificationCard({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: {
    id_document_url: string | null;
    selfie_url: string | null;
    verification_status: string;
    security_verified: boolean;
  } | null;
  onSaved: () => void;
}) {
  const [idDoc, setIdDoc] = useState<UploadedFile[]>([]);
  const [selfie, setSelfie] = useState<UploadedFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) return;
    (async () => {
      const [idUrl, selfieUrl] = await Promise.all([
        profile?.id_document_url
          ? getSignedUrl(supabase, STORAGE_BUCKETS.proDocuments, profile.id_document_url)
          : null,
        profile?.selfie_url
          ? getSignedUrl(supabase, STORAGE_BUCKETS.proDocuments, profile.selfie_url)
          : null,
      ]);
      if (profile?.id_document_url && idUrl) {
        setIdDoc([{ path: profile.id_document_url, url: idUrl, name: "DNI" }]);
      }
      if (profile?.selfie_url && selfieUrl) {
        setSelfie([{ path: profile.selfie_url, url: selfieUrl, name: "Selfie" }]);
      }
      setLoaded(true);
    })();
  }, [profile, loaded]);

  async function submit() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        id_document_url: idDoc[0]?.path ?? null,
        selfie_url: selfie[0]?.path ?? null,
        verification_status: "pending",
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo enviar tu verificación");
      return;
    }
    toast.success("Enviamos tu verificación. Te avisamos cuando esté aprobada.");
    onSaved();
  }

  if (profile?.security_verified) {
    return (
      <div className="trust-card p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
          <ShieldCheck className="size-4" /> Tu cuenta está verificada
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tenés la insignia <VerifiedBadge className="inline-flex" /> visible para los
          profesionales.
        </p>
      </div>
    );
  }

  return (
    <div className="trust-card space-y-3 p-4 border border-border/70 rounded-2xl">
      <div>
        <p className="text-sm font-semibold">Verificación de identidad (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Subí tu DNI y una selfie para obtener la insignia de verificado. Es información privada,
          solo la ve el equipo de ConfiaAMBA.
        </p>
      </div>
      {profile?.verification_status === "pending" && (idDoc.length > 0 || selfie.length > 0) && (
        <p className="rounded-lg bg-secondary p-2 text-xs text-muted-foreground">
          Tu verificación está en revisión.
        </p>
      )}
      {profile?.verification_status === "rejected" && (
        <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          Tu verificación anterior no fue aprobada. Podés volver a intentarlo.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Foto de tu DNI</Label>
          <div className="mt-1.5">
            <ImageUploader
              bucket={STORAGE_BUCKETS.proDocuments}
              folder={userId}
              isPublic={false}
              value={idDoc}
              onChange={(next) => setIdDoc(next.slice(-1))}
              maxFiles={1}
              multiple={false}
              label="Subir DNI"
              square
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Selfie</Label>
          <div className="mt-1.5">
            <ImageUploader
              bucket={STORAGE_BUCKETS.proDocuments}
              folder={userId}
              isPublic={false}
              value={selfie}
              onChange={(next) => setSelfie(next.slice(-1))}
              maxFiles={1}
              multiple={false}
              label="Subir selfie"
              square
            />
          </div>
        </div>
      </div>
      <Button
        size="sm"
        disabled={idDoc.length === 0 || selfie.length === 0 || saving}
        onClick={submit}
      >
        {saving && <Loader2 className="size-4 animate-spin mr-1.5" />} Enviar para verificación
      </Button>
    </div>
  );
}

function RejectCompletionDialog({ onConfirm }: { onConfirm: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          No, no se resolvió
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Qué faltó resolver?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          El profesional va a ver esto y el pedido vuelve a quedar "En proceso".
        </p>
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contanos brevemente qué faltó"
        />
        <Button
          onClick={() => {
            onConfirm(note);
            setOpen(false);
            setNote("");
          }}
        >
          Enviar
        </Button>
      </DialogContent>
    </Dialog>
  );
}