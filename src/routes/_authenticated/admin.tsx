import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  ShieldCheck,
  Users,
  Wallet,
  ClipboardList,
  Crown,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/trust";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatARS,
  REQUEST_STATUS_LABELS,
  QUOTE_REJECT_REASONS,
  REQUEST_CANCEL_REASONS,
  PRO_DECLINE_REASONS,
  reasonLabel,
  CATEGORIES,
} from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/admin")({
  // Antes el chequeo de rol vivía en el componente, después de que todos los
  // useQuery ya se habían disparado: un no-admin igual generaba el tráfico
  // de red hacia las tablas de administración (protegidas por RLS, pero es
  // una capa de defensa frágil). Ahora se corta acá, antes de montar nada.
  beforeLoad: ({ context }) => {
    const roles = (context as { roles?: string[] }).roles ?? [];
    if (!roles.includes("admin")) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Panel de administración | ConfiaAMBA" },
      {
        name: "description",
        content:
          "Verificación KYC de profesionales, gestión de usuarios, métricas de la plataforma y moderación de reseñas.",
      },
      { property: "og:title", content: "Panel de administración | ConfiaAMBA" },
      { property: "og:description", content: "Control total de la plataforma ConfiaAMBA." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const PAGE_SIZE = 15;
  const [requestsPage, setRequestsPage] = useState(1);

  const pros = useQuery({
    queryKey: ["admin-pros"],
    queryFn: async () => {
      const [{ data, error }, { data: docs, error: docsError }] = await Promise.all([
        supabase.from("pro_details").select("*"),
        supabase.from("profile_private_data").select("id, pro_id_document_url"),
      ]);
      if (error) throw error;
      if (docsError) throw docsError;
      const docById = new Map((docs ?? []).map((d) => [d.id, d.pro_id_document_url]));
      return (data ?? []).map((p) => ({
        ...p,
        id_document_url: docById.get(p.pro_id) ?? null,
      }));
    },
  });
  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const [{ data, error }, { data: priv, error: privError }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("profile_private_data").select("*"),
      ]);
      if (error) throw error;
      if (privError) throw privError;
      const privById = new Map((priv ?? []).map((d) => [d.id, d]));
      return (data ?? []).map((p) => ({ ...p, ...(privById.get(p.id) ?? {}) }));
    },
  });

  // Los pedidos se paginan (van creciendo indefinidamente con el uso de la
  // plataforma); las métricas de arriba usan conteos livianos aparte, no
  // dependen de tener todo cargado en el cliente.
  const requestsQuery = useQuery({
    queryKey: ["admin-requests", requestsPage],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("service_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(0, requestsPage * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
  const requests = { data: requestsQuery.data?.rows ?? [], isLoading: requestsQuery.isLoading };
  const requestsTotal = requestsQuery.data?.total ?? 0;
  const requestsHasMore = requests.data.length < requestsTotal;

  // Los presupuestos se piden solo para los pedidos que ya están cargados
  // en pantalla, no la tabla completa.
  const requestIds = requests.data.map((r) => r.id);
  const quotes = useQuery({
    queryKey: ["admin-quotes", requestIds.join(",")],
    enabled: requestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .in("request_id", requestIds);
      if (error) throw error;
      return data;
    },
  });

  const roles = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const reviews = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Números de cabecera: consultas livianas (solo cuentan/agregan en el
  // servidor), independientes de la paginación de las listas de abajo.
  const summary = useQuery({
    queryKey: ["admin-tx-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_transactions_summary");
      if (error) throw error;
      return (
        data?.[0] ?? { total_billed: 0, total_collected: 0, pending_amount: 0, pending_count: 0 }
      );
    },
  });
  const profilesCount = useQuery({
    queryKey: ["admin-profiles-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
  const activeBookingsCount = useQuery({
    queryKey: ["admin-active-bookings-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "quoted", "accepted", "pending_confirmation"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const settings = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });
  const overrides = useQuery({
    queryKey: ["admin-category-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_commission_overrides")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  // Disputas: pedidos cancelados con motivo, o donde el cliente marcó que
  // el trabajo no se resolvió — pendientes de una nota/resolución del admin.
  const disputes = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .or("dispute_note.not.is.null,and(status.eq.cancelled,cancel_reason.not.is.null)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es exclusiva del equipo de administración de ConfiaAMBA.
        </p>
      </main>
    );
  }

  const nameOf = (id: string) => profiles.data?.find((p) => p.id === id)?.full_name ?? "Usuario";
  const rolesOf = (id: string) =>
    (roles.data ?? []).filter((r) => r.user_id === id).map((r) => r.role);

  async function updatePro(proId: string, patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("pro_details")
      .update(patch as never)
      .eq("pro_id", proId);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    toast.success("Actualizado");
    qc.invalidateQueries();
  }

  async function updateProfile(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    toast.success("Actualizado");
    qc.invalidateQueries();
  }

  async function updatePrivateData(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("profile_private_data")
      .update(patch as never)
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    qc.invalidateQueries();
  }

  const stats = [
    {
      icon: Wallet,
      label: "Volumen aceptado",
      value: formatARS(Number(summary.data?.total_billed ?? 0)),
    },
    {
      icon: ClipboardList,
      label: "Reservas activas",
      value: String(activeBookingsCount.data ?? 0),
    },
    { icon: Users, label: "Usuarios", value: String(profilesCount.data ?? 0) },
    {
      icon: ShieldCheck,
      label: "Pendientes de KYC",
      value: String((pros.data ?? []).filter((p) => p.verification === "pending").length),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Administración</h1>
      <p className="text-muted-foreground">Verificación, moderación y métricas de la plataforma.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="trust-card p-3.5 sm:p-5">
            <s.icon className="size-5 text-verified" />
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">{s.label}</p>
            <p className="font-display text-lg sm:text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="kyc" className="mt-8">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 p-1.5">
          <TabsTrigger value="kyc">Verificación (KYC)</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="transacciones">Transacciones</TabsTrigger>
          <TabsTrigger value="disputas">Disputas</TabsTrigger>
          <TabsTrigger value="moderacion">Moderación</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="mt-6 space-y-8">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Profesionales</h2>
            <div className="space-y-4">
              {pros.isLoading && <Loader2 className="size-5 animate-spin" />}
              {(pros.data ?? []).map((p) => (
                <article key={p.pro_id} className="trust-card p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold">{nameOf(p.pro_id)}</h3>
                    <Badge
                      className={
                        p.verification === "approved"
                          ? "bg-verified text-verified-foreground"
                          : p.verification === "rejected"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {p.verification}
                    </Badge>
                    <StarRating value={Number(p.rating_avg)} count={p.reviews_count} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.headline || "Sin título"} · {p.categories.join(", ") || "sin categorías"} ·{" "}
                    {p.zones.join(", ") || "sin zonas"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Documento: {p.id_document_url ? "cargado" : "no cargado"} · Certificados:{" "}
                    {p.certificates_url.length}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        updatePro(p.pro_id, { verification: "approved" }).then(() =>
                          updateProfile(p.pro_id, { security_verified: true }),
                        )
                      }
                    >
                      Aprobar KYC
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updatePro(p.pro_id, { verification: "rejected" }).then(() =>
                          updateProfile(p.pro_id, { security_verified: false }),
                        )
                      }
                    >
                      Rechazar
                    </Button>
                    <label className="ml-auto flex items-center gap-2 text-sm font-medium">
                      <Crown className="size-4 text-featured" /> Destacado
                      <Switch
                        checked={p.is_featured}
                        onCheckedChange={(v) => updatePro(p.pro_id, { is_featured: v })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      Premium
                      <Switch
                        checked={p.is_premium}
                        onCheckedChange={(v) => updatePro(p.pro_id, { is_premium: v })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Verificación de clientes (opcional)</h2>
            {(() => {
              const clientVerifications = (profiles.data ?? []).filter(
                (p) =>
                  rolesOf(p.id).includes("client") &&
                  (p.id_document_url || p.selfie_url) &&
                  !p.security_verified,
              );
              if (clientVerifications.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No hay solicitudes de verificación de clientes pendientes.
                  </p>
                );
              }
              return (
                <div className="space-y-4">
                  {clientVerifications.map((p) => (
                    <article key={p.id} className="trust-card p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">{p.full_name}</h3>
                        <Badge
                          className={
                            p.verification_status === "rejected"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }
                        >
                          {p.verification_status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        DNI: {p.dni || "sin cargar"} · Documento:{" "}
                        {p.id_document_url ? "cargado" : "no cargado"} · Selfie:{" "}
                        {p.selfie_url ? "cargada" : "no cargada"}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateProfile(p.id, { security_verified: true });
                            updatePrivateData(p.id, { verification_status: "approved" });
                          }}
                        >
                          Aprobar verificación
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateProfile(p.id, { security_verified: false });
                            updatePrivateData(p.id, { verification_status: "rejected" });
                          }}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6 space-y-6">
          {(() => {
            const pros_ = (profiles.data ?? []).filter((u) =>
              rolesOf(u.id).includes("professional"),
            );
            const clients_ = (profiles.data ?? []).filter((u) => rolesOf(u.id).includes("client"));
            const admins_ = (profiles.data ?? []).filter((u) => rolesOf(u.id).includes("admin"));
            const renderUser = (u: (typeof pros_)[number]) => (
              <div key={u.id} className="trust-card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.full_name || "Sin nombre"}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.location || "Sin localidad"} ·{" "}
                    {u.security_verified ? "Verificado" : "Sin verificar"}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                </div>
                {rolesOf(u.id).map((r) => (
                  <Badge key={r} variant="secondary">
                    {r === "professional" ? "Profesional" : r === "admin" ? "Admin" : "Cliente"}
                  </Badge>
                ))}
                {u.is_blocked && <Badge variant="destructive">Bloqueado</Badge>}
                <Button
                  size="sm"
                  variant={u.is_blocked ? "default" : "outline"}
                  onClick={() => updateProfile(u.id, { is_blocked: !u.is_blocked })}
                >
                  {u.is_blocked ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>
            );
            return (
              <>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Profesionales ({pros_.length})</h2>
                  <div className="space-y-3">
                    {pros_.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin profesionales todavía.</p>
                    ) : (
                      pros_.map(renderUser)
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Clientes ({clients_.length})</h2>
                  <div className="space-y-3">
                    {clients_.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin clientes todavía.</p>
                    ) : (
                      clients_.map(renderUser)
                    )}
                  </div>
                </div>
                {admins_.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold">
                      Administradores ({admins_.length})
                    </h2>
                    <div className="space-y-3">{admins_.map(renderUser)}</div>
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="pedidos" className="mt-6 space-y-3">
          {requests.isLoading && <Loader2 className="size-5 animate-spin" />}
          {(requests.data ?? []).map((r) => (
            <div key={r.id} className="trust-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{r.category}</Badge>
                <Badge>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                <span className="text-sm text-muted-foreground">{r.zone}</span>
                <span className="ml-auto text-sm text-muted-foreground">{nameOf(r.client_id)}</span>
              </div>
              <p className="mt-2 text-sm">{r.description}</p>
              {r.status === "cancelled" && r.cancel_reason && (
                <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  Motivo de cancelación: {reasonLabel(REQUEST_CANCEL_REASONS, r.cancel_reason)}
                  {r.cancel_reason_note ? ` — "${r.cancel_reason_note}"` : ""}
                </p>
              )}
              {r.declined_by_pro_id && (
                <p className="mt-2 rounded-lg bg-featured/10 p-2 text-xs text-featured-foreground">
                  {nameOf(r.declined_by_pro_id)} rechazó este trabajo dirigido:{" "}
                  {reasonLabel(PRO_DECLINE_REASONS, r.decline_reason)}
                  {r.decline_reason_note ? ` — "${r.decline_reason_note}"` : ""}
                </p>
              )}
              {r.dispute_note && (
                <p className="mt-2 rounded-lg bg-secondary p-2 text-xs text-muted-foreground">
                  El cliente marcó que el trabajo no se resolvió: "{r.dispute_note}"
                </p>
              )}
            </div>
          ))}
          {requestsHasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setRequestsPage((p) => p + 1)}
                disabled={requestsQuery.isFetching}
              >
                {requestsQuery.isFetching && <Loader2 className="size-4 animate-spin" />}
                Cargar más ({requests.data.length}/{requestsTotal})
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transacciones" className="mt-6 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="trust-card p-4">
              <p className="text-sm text-muted-foreground">Total facturado (aceptado)</p>
              <p className="font-display text-xl font-bold">
                {formatARS(Number(summary.data?.total_billed ?? 0))}
              </p>
            </div>
            <div className="trust-card p-4">
              <p className="text-sm text-muted-foreground">Cobrado (confirmado por cliente)</p>
              <p className="font-display text-xl font-bold text-verified">
                {formatARS(Number(summary.data?.total_collected ?? 0))}
              </p>
            </div>
            <div className="trust-card p-4">
              <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
              <p className="font-display text-xl font-bold">
                {formatARS(Number(summary.data?.pending_amount ?? 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.data?.pending_count ?? 0} trabajo(s) en proceso o finalizado sin pago
                confirmado
              </p>
            </div>
            <div className="trust-card p-4">
              <p className="text-sm text-muted-foreground">
                Comisión proyectada ({Number(settings.data?.default_commission_percent ?? 10)}%)
              </p>
              <p className="font-display text-xl font-bold text-featured">
                {formatARS(
                  (Number(summary.data?.total_billed ?? 0) *
                    Number(settings.data?.default_commission_percent ?? 10)) /
                    100,
                )}
              </p>
              <p className="text-xs text-muted-foreground">Sobre el total facturado y aceptado</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            "Pendiente de cobro" incluye trabajos en proceso (todavía no finalizados) y finalizados
            que el cliente aún no marcó como pagados. Ajustá el % de comisión en la pestaña
            "Configuración".
          </p>

          <div className="mt-2 space-y-3">
            {(requests.data ?? []).map((r) => {
              const acceptedQuote = (quotes.data ?? []).find(
                (q) => q.request_id === r.id && q.accepted,
              );
              return (
                <div key={r.id} className="trust-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{r.category}</Badge>
                    <Badge>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                    {["accepted", "pending_confirmation", "done"].includes(r.status) && (
                      <Badge
                        className={r.is_paid ? "bg-verified text-verified-foreground" : ""}
                        variant={r.is_paid ? "default" : "outline"}
                      >
                        <DollarSign className="size-3.5" />{" "}
                        {r.is_paid ? "Pagado" : "Pago pendiente"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Cliente: {nameOf(r.client_id)}</span>
                    {acceptedQuote && (
                      <>
                        <span>Profesional: {nameOf(acceptedQuote.pro_id)}</span>
                        <span className="font-semibold text-foreground">
                          {formatARS(Number(acceptedQuote.price_offered))}
                        </span>
                      </>
                    )}
                    {r.paid_at && (
                      <span>Pagado el {new Date(r.paid_at).toLocaleDateString("es-AR")}</span>
                    )}
                  </div>
                  {(quotes.data ?? [])
                    .filter((q) => q.request_id === r.id && q.rejected)
                    .map((q) => (
                      <p
                        key={q.id}
                        className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive"
                      >
                        Presupuesto de {nameOf(q.pro_id)} rechazado:{" "}
                        {reasonLabel(QUOTE_REJECT_REASONS, q.reject_reason)}
                        {q.reject_reason_note ? ` — "${q.reject_reason_note}"` : ""}
                      </p>
                    ))}
                </div>
              );
            })}
          </div>
          {requestsHasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setRequestsPage((p) => p + 1)}
                disabled={requestsQuery.isFetching}
              >
                {requestsQuery.isFetching && <Loader2 className="size-4 animate-spin" />}
                Cargar más ({requests.data.length}/{requestsTotal})
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="disputas" className="mt-6 space-y-3">
          {disputes.isLoading && <Loader2 className="size-5 animate-spin" />}
          {!disputes.isLoading && (disputes.data ?? []).length === 0 && (
            <div className="trust-card p-8 text-center text-sm text-muted-foreground">
              No hay disputas o reclamos pendientes.
            </div>
          )}
          {(disputes.data ?? []).map((r) => (
            <DisputeCard
              key={r.id}
              request={r}
              nameOf={nameOf}
              onSaved={() => qc.invalidateQueries()}
            />
          ))}
        </TabsContent>

        <TabsContent value="moderacion" className="mt-6 space-y-3">
          {(reviews.data ?? []).map((rv) => (
            <div key={rv.id} className="trust-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <StarRating value={rv.stars} size={14} />
                <span className="text-sm text-muted-foreground">
                  {nameOf(rv.client_id)} → {nameOf(rv.pro_id)}
                </span>
                {rv.is_hidden && <Badge variant="destructive">Oculta</Badge>}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("reviews")
                      .update({ is_hidden: !rv.is_hidden })
                      .eq("id", rv.id);
                    if (error) {
                      toast.error("No se pudo moderar");
                      return;
                    }
                    qc.invalidateQueries();
                  }}
                >
                  {rv.is_hidden ? "Mostrar" : "Ocultar"}
                </Button>
              </div>
              <p className="mt-2 text-sm">{rv.comment}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="configuracion" className="mt-6 space-y-6">
          <PlatformSettingsCard settings={settings.data} onSaved={() => qc.invalidateQueries()} />
          <CategoryOverridesCard
            overrides={overrides.data ?? []}
            defaultPercent={Number(settings.data?.default_commission_percent ?? 10)}
            onSaved={() => qc.invalidateQueries()}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
/** Tarjeta de disputa/reclamo: motivo + nota interna del admin + resolución. */
function DisputeCard({
  request: r,
  nameOf,
  onSaved,
}: {
  request: {
    id: string;
    category: string;
    description: string;
    status: string;
    client_id: string;
    declined_by_pro_id: string | null;
    cancel_reason: string | null;
    cancel_reason_note: string | null;
    dispute_note: string | null;
    dispute_resolved: boolean;
    dispute_admin_note: string | null;
    updated_at: string;
  };
  nameOf: (id: string) => string;
  onSaved: () => void;
}) {
  const [adminNote, setAdminNote] = useState(r.dispute_admin_note ?? "");
  const [saving, setSaving] = useState(false);

  async function save(resolved: boolean) {
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({ dispute_admin_note: adminNote || null, dispute_resolved: resolved })
      .eq("id", r.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success(resolved ? "Marcada como resuelta" : "Nota guardada");
    onSaved();
  }

  return (
    <div className="trust-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{r.category}</Badge>
        <Badge variant={r.dispute_resolved ? "default" : "destructive"}>
          {r.dispute_resolved ? "Resuelta" : "Pendiente"}
        </Badge>
        <span className="ml-auto text-sm text-muted-foreground">
          Cliente: {nameOf(r.client_id)}
        </span>
      </div>
      <p className="mt-2 text-sm">{r.description}</p>

      {r.dispute_note && (
        <p className="mt-2 rounded-lg bg-secondary p-2 text-xs text-muted-foreground">
          El cliente marcó que el trabajo no se resolvió: "{r.dispute_note}"
        </p>
      )}
      {r.status === "cancelled" && r.cancel_reason && (
        <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          Motivo de cancelación: {reasonLabel(REQUEST_CANCEL_REASONS, r.cancel_reason)}
          {r.cancel_reason_note ? ` — "${r.cancel_reason_note}"` : ""}
        </p>
      )}

      <div className="mt-3 space-y-2">
        <Label htmlFor={`note-${r.id}`} className="text-xs">
          Nota interna / resolución
        </Label>
        <Input
          id={`note-${r.id}`}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Ej: se reembolsó al cliente, se avisó al profesional..."
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => save(r.dispute_resolved)}
          disabled={saving}
        >
          Guardar nota
        </Button>
        {!r.dispute_resolved && (
          <Button size="sm" onClick={() => save(true)} disabled={saving}>
            Marcar como resuelta
          </Button>
        )}
      </div>
    </div>
  );
}

/** Tarifa base y % de comisión global de la plataforma. */
function PlatformSettingsCard({
  settings,
  onSaved,
}: {
  settings: { default_commission_percent: number; service_fee_flat: number } | undefined;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="trust-card p-6">
      <h2 className="text-lg font-semibold">Tarifas y comisión general</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Se aplica a todas las categorías salvo que tengan una excepción abajo.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setSaving(true);
          const { error } = await supabase
            .from("platform_settings")
            .update({
              default_commission_percent: Number(fd.get("commission")),
              service_fee_flat: Number(fd.get("fee")),
            })
            .eq("id", true);
          setSaving(false);
          if (error) {
            toast.error("No se pudo guardar");
            return;
          }
          toast.success("Configuración actualizada");
          onSaved();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="commission">Comisión de la plataforma (%)</Label>
          <Input
            id="commission"
            name="commission"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={settings?.default_commission_percent ?? 10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">Tarifa base de servicio (ARS)</Label>
          <Input
            id="fee"
            name="fee"
            type="number"
            min={0}
            defaultValue={settings?.service_fee_flat ?? 0}
          />
        </div>
        <Button type="submit" disabled={saving} className="sm:col-span-2 sm:w-fit">
          Guardar
        </Button>
      </form>
    </div>
  );
}

/** Excepciones de comisión por categoría (agregar / editar / quitar). */
function CategoryOverridesCard({
  overrides,
  defaultPercent,
  onSaved,
}: {
  overrides: { category: string; commission_percent: number }[];
  defaultPercent: number;
  onSaved: () => void;
}) {
  const [newCategory, setNewCategory] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const usedCategories = new Set(overrides.map((o) => o.category));
  const availableCategories = CATEGORIES.filter((c) => !usedCategories.has(c));

  async function addOverride() {
    if (!newCategory || !newPercent) return;
    const { error } = await supabase
      .from("category_commission_overrides")
      .upsert({ category: newCategory, commission_percent: Number(newPercent) });
    if (error) {
      toast.error("No se pudo guardar la excepción");
      return;
    }
    setNewCategory("");
    setNewPercent("");
    toast.success("Excepción agregada");
    onSaved();
  }

  async function removeOverride(category: string) {
    const { error } = await supabase
      .from("category_commission_overrides")
      .delete()
      .eq("category", category);
    if (error) {
      toast.error("No se pudo quitar");
      return;
    }
    onSaved();
  }

  return (
    <div className="trust-card p-6">
      <h2 className="text-lg font-semibold">Excepciones por categoría</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comisión general: {defaultPercent}%. Agregá una categoría acá solo si necesita un %
        distinto.
      </p>

      <div className="mt-4 space-y-2">
        {overrides.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin excepciones cargadas.</p>
        )}
        {overrides.map((o) => (
          <div
            key={o.category}
            className="flex items-center justify-between rounded-lg bg-surface p-3 text-sm"
          >
            <span className="font-medium">{o.category}</span>
            <div className="flex items-center gap-3">
              <span>{o.commission_percent}%</span>
              <Button size="sm" variant="ghost" onClick={() => removeOverride(o.category)}>
                Quitar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/60 pt-4">
        <div className="space-y-1">
          <Label className="text-xs">Categoría</Label>
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Elegir categoría" />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Comisión (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={newPercent}
            onChange={(e) => setNewPercent(e.target.value)}
            className="w-28"
          />
        </div>
        <Button onClick={addOverride} disabled={!newCategory || !newPercent}>
          Agregar
        </Button>
      </div>
    </div>
  );
}