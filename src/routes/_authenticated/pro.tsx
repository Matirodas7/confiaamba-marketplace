import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  Loader2,
  ShieldCheck,
  Crown,
  TrendingUp,
  Wallet,
  BriefcaseBusiness,
  Check,
  Phone,
  PhoneOff,
  MessageCircle,
  Camera,
  BadgeCheck,
  DollarSign,
  MapPin,
  X,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
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
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader, type UploadedFile } from "@/components/ImageUploader";
import { Lightbox } from "@/components/Lightbox";
import { DateTimePicker } from "@/components/DateTimePicker";
import { ReasonDialog } from "@/components/ReasonDialog";
import { JobDetailDialog } from "@/components/JobDetailDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StarRating } from "@/components/trust";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CATEGORIES,
  ZONES,
  ZONE_LABELS,
  formatARS,
  STORAGE_BUCKETS,
  getSignedUrl,
  REQUEST_STATUS_LABELS,
  QUOTE_REJECT_REASONS,
  PRO_DECLINE_REASONS,
  reasonLabel,
  type Zone,
} from "@/lib/marketplace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pro")({
  beforeLoad: async ({ context }) => {
    const roles = context.roles ?? [];
    if (roles.length > 0 && !roles.includes("professional") && !roles.includes("admin")) {
      throw redirect({ to: "/cliente" });
    }
  },
  head: () => ({
    meta: [
      { title: "Panel del profesional | ConfiaAMBA" },
      {
        name: "description",
        content:
          "Completá tu verificación, gestioná leads, enviá presupuestos y seguí tus ganancias en AMBA.",
      },
    ],
  }),
  component: ProDashboard,
});

function ProDashboard() {
  const { user, profile, loading } = useAuth();
  const qc = useQueryClient();
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const details = useQuery({
    queryKey: ["pro-details", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_details")
        .select("*")
        .eq("pro_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const leads = useQuery({
    queryKey: ["pro-leads", user?.id, details.data?.categories],
    enabled: !!user && !!details.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .in("status", ["pending", "quoted", "accepted", "pending_confirmation"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const myCategories = new Set(details.data?.categories ?? []);
      return (data ?? []).filter(
        (r) => r.target_pro_id === user!.id || (!r.target_pro_id && myCategories.has(r.category)),
      );
    },
  });

  const myQuotes = useQuery({
    queryKey: ["pro-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").eq("pro_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const acceptedRequestIds = (myQuotes.data ?? [])
    .filter((q) => q.accepted)
    .map((q) => q.request_id);

  const jobsQuery = useQuery({
    queryKey: ["pro-jobs", acceptedRequestIds.join(",")],
    enabled: acceptedRequestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .in("id", acceptedRequestIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { profileOf: jobClientOf } = useProfileLookup([
    ...(leads.data ?? []).map((r) => r.client_id),
    ...(jobsQuery.data ?? []).map((j) => j.client_id),
  ]);
  const clientById = { get: jobClientOf };

  if (loading || details.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const d = details.data;
  const accepted = (myQuotes.data ?? []).filter((q) => q.accepted);
  const pendingQuotes = (myQuotes.data ?? []).filter((q) => !q.accepted && !q.revision_requested);
  const earned = accepted.reduce((s, q) => s + Number(q.price_offered), 0);
  const pending = pendingQuotes.reduce((s, q) => s + Number(q.price_offered), 0);
  const finishedJobs = (jobsQuery.data ?? []).filter((j) => j.status === "done");
  const collected = finishedJobs
    .filter((j) => j.is_paid)
    .reduce((s, j) => {
      const q = accepted.find((q) => q.request_id === j.id);
      return s + (q ? Number(q.price_offered) : 0);
    }, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      {/* Header Estilo Dashboard Profesional */}
      <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <AvatarUploader userId={user!.id} avatarUrl={profile?.avatar_url ?? null} />
            
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                  {profile?.full_name || "Usuario"}
                </h1>
                {d?.is_premium && (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    PRO
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                <Badge
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold border-none flex items-center gap-1",
                    d?.verification === "approved"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : d?.verification === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary text-secondary-foreground"
                  )}
                >
                  <ShieldCheck className="size-3.5" />
                  {d?.verification === "approved"
                    ? "Verificado"
                    : d?.verification === "rejected"
                      ? "Rechazado"
                      : "Verificación pendiente"}
                </Badge>

                {d?.is_featured && (
                  <Badge className="bg-amber-500/10 text-amber-800 text-xs font-semibold border-none px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="size-3.5" /> Destacado
                  </Badge>
                )}

                <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                  <StarRating value={Number(d?.rating_avg ?? 0)} count={d?.reviews_count ?? 0} />
                </div>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 shrink-0">
            <Link to="/pro/$proId" params={{ proId: user!.id }}>
              <ExternalLink className="size-3.5" /> Ver mi perfil público
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Principales de Control */}
      <Tabs defaultValue="leads" className="w-full space-y-6">
        <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-muted/60 p-1 text-muted-foreground w-full sm:w-auto">
          <TabsTrigger value="leads" className="rounded-xl px-4 text-xs sm:text-sm font-semibold">Leads</TabsTrigger>
          <TabsTrigger value="portafolio" className="rounded-xl px-4 text-xs sm:text-sm font-semibold">Portafolio</TabsTrigger>
          <TabsTrigger value="ganancias" className="rounded-xl px-4 text-xs sm:text-sm font-semibold">Ganancias</TabsTrigger>
          <TabsTrigger value="premium" className="rounded-xl px-4 text-xs sm:text-sm font-semibold">Premium</TabsTrigger>
        </TabsList>

        {/* TAB 1: LEADS */}
        <TabsContent value="leads" className="space-y-4">
          {!d?.onboarding_complete && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900">
              <span>Completá tu perfil y subí tu documentación para aparecer en las búsquedas.</span>
              <Button asChild size="sm" className="rounded-xl font-semibold bg-amber-700 hover:bg-amber-800 text-white">
                <Link to="/cuenta">Completar perfil</Link>
              </Button>
            </div>
          )}

          {(() => {
            const LEAD_PRIORITY: Record<string, number> = {
              pending_confirmation: 0,
              accepted: 1,
              quoted: 2,
              pending: 3,
            };

            const visibleLeads = (leads.data ?? [])
              .filter((r) => {
                const mine = (myQuotes.data ?? []).find((q) => q.request_id === r.id);
                if ((r.status === "accepted" || r.status === "pending_confirmation") && !mine?.accepted) {
                  return false;
                }
                return true;
              })
              .sort((a, b) => {
                const pa = LEAD_PRIORITY[a.status] ?? 9;
                const pb = LEAD_PRIORITY[b.status] ?? 9;
                if (pa !== pb) return pa - pb;
                return Number(b.target_pro_id === user!.id) - Number(a.target_pro_id === user!.id);
              });

            if (visibleLeads.length === 0) {
              return (
                <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-sm text-muted-foreground shadow-xs">
                  No hay pedidos abiertos por ahora.
                </div>
              );
            }

            return visibleLeads.map((r) => {
              const mine = (myQuotes.data ?? []).find((q) => q.request_id === r.id);
              const client = clientById.get(r.client_id);
              return (
                <article key={r.id} className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                  {/* Fila 1: Badges y fecha */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="rounded-full text-xs font-semibold">
                        {r.category}
                      </Badge>
                      {r.target_pro_id === user!.id && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[11px] font-semibold">
                          Solicitud directa
                        </Badge>
                      )}
                      {r.status === "accepted" && (
                        <Badge className="bg-foreground text-background rounded-full text-[11px] font-semibold">
                          En proceso
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground pl-1 font-medium">
                        <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                        {ZONE_LABELS[r.zone as Zone]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(r.created_at).toLocaleDateString("es-AR")}
                      </span>
                      {r.target_pro_id === user!.id && (r.status === "pending" || r.status === "quoted") && (
                        <ReasonDialog
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 rounded-full text-muted-foreground hover:text-destructive"
                              title="No puedo realizar este trabajo"
                            >
                              <X className="size-4" />
                            </Button>
                          }
                          title="¿Por qué no podés tomar este trabajo?"
                          reasons={PRO_DECLINE_REASONS}
                          destructive
                          confirmLabel="Rechazar y avisar al cliente"
                          onConfirm={async (reason, note) => {
                            const { error } = await supabase.rpc("pro_decline_targeted_job", {
                              _request_id: r.id,
                              _reason: reason,
                              _reason_note: note,
                            });
                            if (error) {
                              toast.error("No se pudo rechazar el trabajo");
                              return;
                            }
                            toast.success("Le avisamos al cliente");
                            qc.invalidateQueries();
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Grid Cliente + Contenido */}
                  <div className="grid gap-4 lg:grid-cols-12 items-start">
                    {/* Tarjeta lateral del cliente */}
                    <div className="lg:col-span-4 rounded-2xl border border-border/70 bg-muted/30 p-3.5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 shrink-0 border border-border shadow-xs">
                          <AvatarImage src={client?.avatar_url ?? undefined} alt={client?.full_name ?? "Cliente"} />
                          <AvatarFallback className="bg-emerald-700 text-white font-bold text-sm">
                            {(client?.full_name ?? "C").slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-sm text-foreground">{client?.full_name ?? "Cliente"}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 text-xs">
                        {client?.phone ? (
                          <a
                            href={`tel:${client.phone}`}
                            className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
                          >
                            <Phone className="size-3.5" /> {client.phone}
                          </a>
                        ) : (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <PhoneOff className="size-3.5" /> Sin teléfono cargado
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Descripción y Presupuesto */}
                    <div className="lg:col-span-8 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Qué necesita</p>
                        <p className="mt-1 text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                          {r.description}
                        </p>
                        {r.photos && r.photos.length > 0 && (
                          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                            {r.photos.map((url) => (
                              <img
                                key={url}
                                src={url}
                                alt="Foto del problema"
                                onClick={() => setZoomSrc(url)}
                                className="size-16 shrink-0 cursor-zoom-in rounded-xl object-cover border border-border/60 hover:opacity-90"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {r.budget_hint && (
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                              <Wallet className="size-4 text-emerald-700" />
                            </span>
                            <span className="text-xs font-medium text-emerald-950">
                              Presupuesto estimado del cliente
                            </span>
                          </div>
                          <span className="font-display text-base font-bold text-emerald-900">
                            {r.budget_hint}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 3: Presupuesto enviado o Formulario */}
                  {mine && !mine.revision_requested && !mine.rejected ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-emerald-700">
                          Presupuesto enviado: {formatARS(Number(mine.price_offered))}
                        </span>
                        {mine.accepted && <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">Aceptado</Badge>}
                        {mine.accepted && r.status === "done" && (
                          <Badge className={r.is_paid ? "bg-emerald-600 text-white" : ""}>
                            <DollarSign className="size-3.5" /> {r.is_paid ? "Pagado" : "Pago pendiente"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {mine.accepted && r.status === "accepted" && (
                          <MarkFinishedButton requestId={r.id} onDone={() => qc.invalidateQueries()} />
                        )}
                        <Button asChild size="icon" variant="outline" className="rounded-full size-9" title="Mensajes">
                          <Link to="/mensajes" search={{ requestId: r.id, proId: user!.id }}>
                            <MessageCircle className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <QuoteForm request={r} mine={mine} proId={user!.id} onSubmitted={() => qc.invalidateQueries()} />
                  )}
                </article>
              );
            });
          })()}
        </TabsContent>

        {/* TAB 2: PORTAFOLIO */}
        <TabsContent value="portafolio">
          <PortfolioSection
            userId={user!.id}
            portfolioUrls={d?.portfolio_urls ?? []}
            onSaved={() => qc.invalidateQueries()}
          />
        </TabsContent>

        {/* TAB 3: GANANCIAS Y HISTORIAL */}
        <TabsContent value="ganancias" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Wallet className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Ganado (aceptado)</p>
              <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{formatARS(earned)}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <DollarSign className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Cobrado</p>
              <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{formatARS(collected)}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <TrendingUp className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">En cotización</p>
              <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{formatARS(pending)}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
              <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <BriefcaseBusiness className="size-4" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Trabajos hechos</p>
              <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{finishedJobs.length}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="font-bold text-base text-foreground">Historial de trabajos</h2>
            <div className="space-y-3">
              {jobsQuery.isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
              {acceptedRequestIds.length === 0 && (
                <p className="text-xs text-muted-foreground">Todavía no tenés presupuestos aceptados.</p>
              )}
              {(jobsQuery.data ?? []).map((j) => {
                const q = accepted.find((q) => q.request_id === j.id);
                const client = jobClientOf(j.client_id);
                return (
                  <div key={j.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="rounded-full">{j.category}</Badge>
                        <Badge className="rounded-full">{REQUEST_STATUS_LABELS[j.status]}</Badge>
                        {j.status === "done" && (
                          <Badge className={j.is_paid ? "bg-emerald-600 text-white" : ""}>
                            <DollarSign className="size-3.5" /> {j.is_paid ? "Pagado" : "Pago pendiente"}
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-foreground text-sm">
                        {formatARS(Number(q?.price_offered ?? 0))}
                      </span>
                    </div>

                    {client && (
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={client.avatar_url ?? undefined} alt={client.full_name} />
                          <AvatarFallback>{client.full_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{j.address}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        Pedido el {new Date(j.created_at).toLocaleDateString("es-AR")}
                      </span>
                      <JobDetailDialog
                        data={{
                          requestId: j.id,
                          category: j.category,
                          description: j.description,
                          address: j.address,
                          zone: ZONE_LABELS[j.zone as Zone],
                          createdAt: j.created_at,
                          scheduledAt: q?.scheduled_at ?? null,
                          price: Number(q?.price_offered ?? 0),
                          status: j.status,
                          statusLabel: REQUEST_STATUS_LABELS[j.status] ?? j.status,
                          isPaid: j.is_paid,
                          paidAt: j.paid_at,
                          clientName: client?.full_name ?? "Cliente",
                          proName: profile?.full_name ?? "Vos",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: PREMIUM */}
        <TabsContent value="premium">
          <PremiumPanel isPremium={!!d?.is_premium} isFeatured={!!d?.is_featured} />
        </TabsContent>
      </Tabs>

      {zoomSrc && <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}
    </main>
  );
}

function MarkFinishedButton({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [saving, setSaving] = useState(false);

  async function markFinished() {
    setSaving(true);
    const { error } = await supabase.rpc("mark_job_finished_by_pro", { _request_id: requestId });
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo marcar el trabajo como finalizado");
      return;
    }
    toast.success("Le avisamos al cliente para que confirme");
    onDone();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={saving} className="rounded-xl font-bold bg-foreground hover:bg-foreground/90 text-background text-xs">
          {saving && <Loader2 className="size-3.5 animate-spin mr-1" />} Marcar trabajo como finalizado
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Terminaste este trabajo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se le va a avisar al cliente para que confirme que el trabajo se resolvió con éxito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Todavía no</AlertDialogCancel>
          <AlertDialogAction onClick={markFinished} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
            Sí, confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type LeadRequest = {
  id: string;
  target_pro_id: string | null;
};
type LeadQuote = {
  id: string;
  price_offered: number;
  message: string;
  revision_requested: boolean;
  revision_note: string | null;
  rejected: boolean;
  reject_reason: string | null;
  reject_reason_note: string | null;
  scheduled_at: string | null;
};

function QuoteForm({
  request,
  mine,
  proId,
  onSubmitted,
}: {
  request: LeadRequest;
  mine: LeadQuote | undefined;
  proId: string;
  onSubmitted: () => void;
}) {
  const [price, setPrice] = useState(mine?.price_offered ? String(mine.price_offered) : "");
  const [message, setMessage] = useState(mine?.message ?? "");
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(
    mine?.scheduled_at ? new Date(mine.scheduled_at) : undefined,
  );
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      price_offered: Number(price),
      message,
      scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
    };
    const { error } = mine
      ? await supabase
          .from("quotes")
          .update({ ...payload, revision_requested: false, revision_note: null, rejected: false })
          .eq("id", mine.id)
      : await supabase.from("quotes").insert({ request_id: request.id, pro_id: proId, ...payload });
    if (error) {
      toast.error("No se pudo enviar el presupuesto");
      setSaving(false);
      return;
    }
    await supabase.from("service_requests").update({ status: "quoted" }).eq("id", request.id);
    toast.success(mine ? "Presupuesto reenviado" : "Presupuesto enviado");
    setSaving(false);
    onSubmitted();
  }

  return (
    <form className="mt-4 space-y-3 border-t border-border/60 pt-4" onSubmit={submit}>
      {mine?.revision_requested && (
        <div className="w-full rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
          <p className="font-semibold">El cliente pidió revisar este presupuesto</p>
          {mine.revision_note && <p className="mt-1">"{mine.revision_note}"</p>}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="space-y-1 sm:w-40">
          <Label htmlFor={`p-${request.id}`} className="text-xs font-semibold">Precio (ARS)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              id={`p-${request.id}`}
              type="number"
              min={0}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-6 h-10 rounded-xl text-xs"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor={`m-${request.id}`} className="text-xs font-semibold">Mensaje · Qué incluye</Label>
          <Input
            id={`m-${request.id}`}
            placeholder="Ej: incluye materiales y garantía por escrito"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
        <Button type="submit" disabled={saving} className="rounded-xl h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
          {mine ? "Reenviar presupuesto" : "Enviar presupuesto"}
        </Button>
      </div>
    </form>
  );
}

export function AvatarUploader({
  userId,
  avatarUrl,
}: {
  userId: string;
  avatarUrl: string | null;
}) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKETS.avatars)
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(path);
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", userId);
      if (profErr) throw profErr;
      toast.success("Foto de perfil actualizada");
      qc.invalidateQueries();
    } catch {
      toast.error("No pudimos actualizar tu foto de perfil.");
    }
    setUploading(false);
  }

  return (
    <label className="group relative cursor-pointer">
      <Avatar className="size-16 sm:size-20 border-2 border-border shadow-xs">
        <AvatarImage src={avatarUrl ?? undefined} alt="Tu foto de perfil" className="object-cover" />
        <AvatarFallback className="bg-emerald-700 text-white font-bold text-xl">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : "?"}
        </AvatarFallback>
      </Avatar>
      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
        <Camera className="size-3.5" />
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </label>
  );
}

function PortfolioSection({
  userId,
  portfolioUrls,
  onSaved,
}: {
  userId: string;
  portfolioUrls: string[];
  onSaved: () => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>(
    portfolioUrls.map((url) => ({ path: url, url, name: "Trabajo anterior" })),
  );
  const [saving, setSaving] = useState(false);

  async function save(next: UploadedFile[]) {
    setFiles(next);
    setSaving(true);
    const { error } = await supabase
      .from("pro_details")
      .update({ portfolio_urls: next.map((f) => f.url) })
      .eq("pro_id", userId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el portafolio");
      return;
    }
    onSaved();
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-xs">
      <h2 className="font-bold text-lg text-foreground">Galería de trabajos realizados</h2>
      <p className="text-xs text-muted-foreground">
        Mostrale a tus futuros clientes fotos de trabajos anteriores. Se ven públicamente en tu perfil.
      </p>
      <ImageUploader
        bucket={STORAGE_BUCKETS.portfolio}
        folder={userId}
        isPublic
        value={files}
        onChange={save}
        maxFiles={20}
        square
        label="Agregar foto"
        helpText="Hasta 20 fotos de trabajos anteriores."
      />
      {saving && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Guardando...
        </p>
      )}
    </div>
  );
}

type Details =
  | {
      headline: string;
      bio: string;
      categories: string[];
      zones: string[];
      work_radius_km: number;
      starting_price: number;
      hourly_rate: number;
      years_experience: number;
      certificates_url: string[];
      id_document_url: string | null;
    }
  | null
  | undefined;

const PRO_STEP_LABELS = ["Experiencia", "Servicios y zona", "Documentación"];

export function ProfileForm({
  details,
  userId,
  onSaved,
}: {
  details: Details;
  userId: string;
  onSaved: () => void;
}) {
  const alreadyOnboarded = !!(
    details?.headline &&
    (details?.categories?.length ?? 0) > 0 &&
    (details?.zones?.length ?? 0) > 0
  );
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(
    alreadyOnboarded ? PRO_STEP_LABELS.length - 1 : 0,
  );
  const [form, setForm] = useState({
    headline: details?.headline ?? "",
    bio: details?.bio ?? "",
    categories: details?.categories ?? [],
    zones: (details?.zones ?? []) as string[],
    work_radius_km: details?.work_radius_km ?? 10,
    starting_price: Number(details?.starting_price ?? 0),
    hourly_rate: Number(details?.hourly_rate ?? 0),
    years_experience: details?.years_experience ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [idDocument, setIdDocument] = useState<UploadedFile[]>([]);
  const [certificates, setCertificates] = useState<UploadedFile[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);

  useEffect(() => {
    if (docsLoaded) return;
    (async () => {
      const idPaths = details?.id_document_url ? [details.id_document_url] : [];
      const certPaths = details?.certificates_url ?? [];
      const [idResolved, certResolved] = await Promise.all([
        Promise.all(
          idPaths.map(async (path) => ({
            path,
            url: (await getSignedUrl(supabase, STORAGE_BUCKETS.proDocuments, path)) ?? "",
            name: "DNI",
          })),
        ),
        Promise.all(
          certPaths.map(async (path, i) => ({
            path,
            url: (await getSignedUrl(supabase, STORAGE_BUCKETS.proDocuments, path)) ?? "",
            name: `Certificado ${i + 1}`,
          })),
        ),
      ]);
      setIdDocument(idResolved.filter((f) => f.url));
      setCertificates(certResolved.filter((f) => f.url));
      setDocsLoaded(true);
    })();
  }, [details, docsLoaded]);

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("pro_details")
      .update({
        headline: form.headline,
        bio: form.bio,
        categories: form.categories,
        zones: form.zones as Zone[],
        work_radius_km: form.work_radius_km,
        starting_price: form.starting_price,
        hourly_rate: form.hourly_rate,
        years_experience: form.years_experience,
        certificates_url: certificates.map((f) => f.path),
        id_document_url: idDocument[0]?.path || null,
        onboarding_complete: !!form.headline && form.categories.length > 0 && form.zones.length > 0,
      })
      .eq("pro_id", userId);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el perfil");
      return;
    }
    toast.success("Perfil actualizado correctamente.");
    onSaved();
  }

  const step0Valid = form.headline.trim().length > 0 && form.bio.trim().length > 0;
  const step1Valid = form.categories.length > 0 && form.zones.length > 0 && form.starting_price > 0;
  const step2Valid = idDocument.length > 0;
  const canLeaveStep = [step0Valid, step1Valid, step2Valid];
  const isLastStep = step === PRO_STEP_LABELS.length - 1;

  function goNext() {
    if (!canLeaveStep[step]) {
      toast.error("Completá los datos obligatorios de este paso antes de continuar.");
      return;
    }
    const next = Math.min(step + 1, PRO_STEP_LABELS.length - 1);
    setStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PRO_STEP_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => i <= maxStepReached && setStep(i)}
            disabled={i > maxStepReached}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              i === step
                ? "bg-emerald-600 text-white"
                : i <= maxStepReached
                  ? "bg-muted text-foreground"
                  : "cursor-not-allowed bg-muted/40 text-muted-foreground/60"
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="headline" className="text-xs font-semibold">Título profesional</Label>
              <Input
                id="headline"
                value={form.headline}
                placeholder="Ej: Programador web · Técnico en PC y redes"
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-semibold">Sobre tu trabajo</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="years" className="text-xs font-semibold">Años de experiencia</Label>
              <Input
                id="years"
                type="number"
                min={0}
                value={form.years_experience}
                onChange={(e) => setForm({ ...form, years_experience: Number(e.target.value) })}
                className="w-32 h-10 rounded-xl text-xs"
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Categorías de servicio</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={form.categories.includes(c)}
                      onCheckedChange={() =>
                        setForm({ ...form, categories: toggle(form.categories, c) })
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Zonas donde trabajás</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ZONES.map((z) => (
                  <label key={z} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={form.zones.includes(z)}
                      onCheckedChange={() => setForm({ ...form, zones: toggle(form.zones, z) })}
                    />
                    {ZONE_LABELS[z]}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Radio de trabajo: {form.work_radius_km} km</Label>
              <Slider
                value={[form.work_radius_km]}
                min={1}
                max={80}
                step={1}
                onValueChange={(v) => setForm({ ...form, work_radius_km: v[0] ?? 10 })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="start" className="text-xs font-semibold">Precio desde (ARS)</Label>
                <Input
                  id="start"
                  type="number"
                  min={0}
                  value={form.starting_price}
                  onChange={(e) => setForm({ ...form, starting_price: Number(e.target.value) })}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hour" className="text-xs font-semibold">Valor hora (ARS)</Label>
                <Input
                  id="hour"
                  type="number"
                  min={0}
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <BadgeCheck className="size-4 text-emerald-600" /> Foto de tu DNI (frente)
              </Label>
              <ImageUploader
                bucket={STORAGE_BUCKETS.proDocuments}
                folder={userId}
                isPublic={false}
                value={idDocument}
                onChange={(next) => setIdDocument(next.slice(-1))}
                maxFiles={1}
                multiple={false}
                label="Subir DNI"
                helpText="Solo vos y el equipo de verificación pueden ver este archivo."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <BadgeCheck className="size-4 text-emerald-600" /> Certificaciones / matrículas
              </Label>
              <ImageUploader
                bucket={STORAGE_BUCKETS.proDocuments}
                folder={userId}
                isPublic={false}
                value={certificates}
                onChange={setCertificates}
                maxFiles={6}
                accept="image/png,image/jpeg,image/webp,application/pdf"
                label="Subir certificado"
                helpText="Fotos o PDF de tus certificaciones. Privado y seguro."
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          {step > 0 && (
            <Button type="button" variant="outline" className="rounded-xl h-10 text-xs font-semibold" onClick={() => setStep(step - 1)}>
              Atrás
            </Button>
          )}
          {!isLastStep ? (
            <Button type="button" onClick={goNext} className="ml-auto rounded-xl h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
              Siguiente
            </Button>
          ) : (
            <Button
              type="button"
              onClick={save}
              disabled={saving || !step2Valid}
              className="ml-auto rounded-xl h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="size-3.5 animate-spin mr-1" />} Confirmar y guardar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PremiumPanel({ isPremium, isFeatured }: { isPremium: boolean; isFeatured: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-12 items-start">
      <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-xs">
        <Badge className="bg-amber-500/10 text-amber-800 text-xs font-semibold border-none rounded-full px-3 py-1">
          <Crown className="size-3.5 mr-1" /> Suscripción Premium
        </Badge>
        <h2 className="font-display text-2xl font-bold text-foreground">Aparecé primero, ganá más trabajos</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Los perfiles con prioridad reciben en promedio 3x más contactos de clientes en su zona del AMBA.
        </p>
        <ul className="space-y-2.5 pt-2">
          {[
            "Prioridad en resultados de búsqueda por encima de perfiles estándar",
            "Insignia Premium visible en tu perfil y en cada presupuesto",
            "Leads ilimitados en todas tus zonas del AMBA",
            "Soporte prioritario y revisión acelerada de documentación",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
              <Check className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-5 rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-xs">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Plan Prioridad AMBA</p>
        <p className="font-display text-3xl font-bold text-foreground">
          {formatARS(24900)}
          <span className="text-xs font-normal text-muted-foreground"> /mes</span>
        </p>
        <div className="space-y-2 text-xs border-t border-border/60 pt-3">
          <p className="flex items-center justify-between">
            <span>Estado actual</span>
            <Badge variant={isPremium ? "default" : "secondary"} className="rounded-full">
              {isPremium ? "Premium activo" : "Plan gratuito"}
            </Badge>
          </p>
        </div>
        <Button
          className="w-full rounded-2xl h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          onClick={() =>
            toast.info(
              "Estamos habilitando los pagos online. Nuestro equipo te contactará para activar Premium.",
            )
          }
        >
          Quiero ser Premium
        </Button>
      </div>
    </div>
  );
}