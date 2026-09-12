import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ArrowLeft, Loader2, ShieldCheck, Lock, MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, ZONES, ZONE_LABELS, NEIGHBORHOODS, type Zone } from "@/lib/marketplace";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ImageUploader, type UploadedFile } from "@/components/ImageUploader";
import { STORAGE_BUCKETS, MAX_REQUEST_PHOTOS } from "@/lib/marketplace";

type SolicitarSearch = { proId?: string };

export const Route = createFileRoute("/solicitar")({
  validateSearch: (search: Record<string, unknown>): SolicitarSearch => {
    const proId = typeof search["proId"] === "string" ? search["proId"] : undefined;
    return proId ? { proId } : {};
  },
  head: () => ({
    meta: [
      { title: "Pedí presupuestos gratis en AMBA | ConfiaAMBA" },
      {
        name: "description",
        content:
          "Personalizá tu pedido en 2 pasos y recibí presupuestos gratis y sin compromiso de profesionales verificados de CABA, Norte, Sur y Oeste.",
      },
      { property: "og:title", content: "Pedí presupuestos gratis en AMBA" },
      {
        property: "og:description",
        content: "Describí el trabajo, elegí tu zona y recibí propuestas sin compromiso.",
      },
    ],
  }),
  component: RequestPage,
});

const STEPS = ["Detalles del pedido", "Revisá y confirmá"];

function RequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { proId } = Route.useSearch();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    description: "",
    category: "",
    address: "",
    zone: "" as Zone | "",
    neighborhood: "",
  });
  const [photos, setPhotos] = useState<UploadedFile[]>([]);

  const targetPro = useQuery({
    queryKey: ["target-pro", proId],
    enabled: !!proId,
    queryFn: async () => {
      const [{ data: profile, error: pErr }, { data: details, error: dErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("id", proId!).maybeSingle(),
        supabase
          .from("pro_details")
          .select("pro_id, categories")
          .eq("pro_id", proId!)
          .maybeSingle(),
      ]);
      if (pErr) throw pErr;
      if (dErr) throw dErr;
      if (!profile || !details) return null;
      return { profile, details };
    },
  });

  const isTargeted = !!proId && !!targetPro.data;
  const isSelfBooking = !!user && !!proId && user.id === proId;

  useEffect(() => {
    if (isSelfBooking) {
      toast.error("No podés solicitarte un presupuesto a vos mismo.");
      navigate({ to: "/buscar", replace: true });
    }
  }, [isSelfBooking, navigate]);

  useEffect(() => {
    if (isTargeted && targetPro.data) {
      const cats = targetPro.data.details.categories ?? [];
      setForm((f) => ({ ...f, category: cats[0] ?? f.category }));
    }
  }, [isTargeted, targetPro.data]);

  const proName = targetPro.data?.profile.full_name ?? "";
  const proCategories = targetPro.data?.details.categories ?? [];

  const valid =
    form.description.trim().length > 12 && form.category && form.zone && form.address.trim();

  async function submit() {
    if (!user) {
      toast.info("Creá tu cuenta para enviar el pedido");
      navigate({ to: "/auth" });
      return;
    }
    if (isSelfBooking) {
      toast.error("No podés solicitarte un presupuesto a vos mismo.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("service_requests").insert({
      client_id: user.id,
      category: form.category,
      description: form.description,
      address: `${form.address}${form.neighborhood ? `, ${form.neighborhood}` : ""}`,
      zone: form.zone as Zone,
      target_pro_id: isTargeted ? proId : null,
      photos: photos.map((p) => p.url),
    });
    setSaving(false);
    if (error) {
      toast.error("No pudimos crear el pedido. Intentá nuevamente.");
      return;
    }
    setDone(true);
  }

  if (isSelfBooking) {
    return null;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </span>
          <h1 className="mt-6 font-display text-2xl sm:text-3xl font-bold">¡Pedido publicado!</h1>
          <p className="mt-2 text-base text-emerald-700 font-medium">Recibí presupuestos gratis y sin compromiso</p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {isTargeted
              ? `Le avisamos a ${proName} sobre tu pedido. Te contactará con un presupuesto en tu panel.`
              : `Los profesionales verificados de ${form.zone && ZONE_LABELS[form.zone as Zone]} que trabajan en "${form.category}" ya pueden ver tu pedido.`}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 w-full">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/cliente">Ver mis pedidos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/buscar">Explorar profesionales</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Stepper Superior */}
        <div className="flex items-center gap-3 max-w-xl mx-auto mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  "flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors",
                  i <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold truncate",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i === 0 && <span className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="trust-card p-6 sm:p-8 border border-border/80 rounded-2xl bg-card shadow-sm">
          {step === 0 ? (
            <div className="space-y-6">
              {/* Encabezado */}
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {isTargeted ? `¿Qué servicio necesitás de ${proName}?` : "¿Qué servicio necesitás?"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Completá los detalles para recibir presupuestos de profesionales verificados.
                </p>
                {isTargeted && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                    Este pedido se enviará directamente a {proName}.
                  </p>
                )}
              </div>

              {/* Categoría y Presupuesto en 2 columnas en Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 text-xs font-semibold">
                    Categoría / Rubro <span className="text-destructive">*</span>
                    {isTargeted && <Lock className="size-3 text-muted-foreground ml-1" />}
                  </Label>
                  {isTargeted ? (
                    <>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                        disabled={proCategories.length <= 1}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {proCategories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Fijado según la especialidad del profesional.
                      </p>
                    </>
                  ) : (
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Seleccioná un rubro (ej. Plomería)" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Detalle del trabajo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="desc" className="text-xs font-semibold">
                    Detalle del trabajo <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Sé lo más explícito posible</span>
                </div>
                <Textarea
                  id="desc"
                  rows={4}
                  placeholder="Ej: Necesito instalar 4 luminarias LED y revisar el tablero eléctrico de un PH. Tengo las lámparas compradas."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="rounded-xl resize-none text-sm p-3.5"
                />
              </div>

              {/* Ubicación Agrupada */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <Label className="text-xs font-semibold">¿Dónde hay que realizar el trabajo? <span className="text-destructive">*</span></Label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    value={form.zone}
                    onValueChange={(v) => setForm({ ...form, zone: v as Zone, neighborhood: "" })}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Zona (ej. CABA)" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {ZONE_LABELS[z]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={form.neighborhood}
                    disabled={!form.zone}
                    onValueChange={(v) => setForm({ ...form, neighborhood: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Barrio / Partido (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(form.zone ? NEIGHBORHOODS[form.zone as Zone] : []).map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="addr"
                    placeholder="Calle y altura exacta"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="h-11 rounded-xl pl-10 text-sm"
                  />
                </div>
              </div>

              {/* Fotos del problema */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Fotos del problema (opcional)</Label>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Hasta {MAX_REQUEST_PHOTOS} fotos</span>
                </div>

                {user ? (
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5">
                    <ImageUploader
                      bucket={STORAGE_BUCKETS.requestPhotos}
                      folder={user.id}
                      isPublic
                      value={photos}
                      onChange={setPhotos}
                      maxFiles={MAX_REQUEST_PHOTOS}
                      label="Adjuntar fotos del lugar o falla"
                      helpText="Ayudan a que el profesional entienda el trabajo y cotice con exactitud."
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground border border-border/60">
                    Iniciá sesión para adjuntar fotos del problema.
                  </div>
                )}
              </div>

              {/* Botón Siguiente */}
              <Button
                className="w-full h-12 rounded-xl font-bold text-base mt-4 shadow-sm"
                disabled={!valid}
                onClick={() => setStep(1)}
              >
                Continuar al paso 2
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          ) : (
            /* Paso 2: Revisar y confirmar */
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">Revisá y confirmá</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Verificá los datos de tu pedido antes de enviarlo a los profesionales.
                </p>
              </div>

              <dl className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-surface/50 overflow-hidden">
                {[
                  ...(isTargeted ? [["Dirigido a", proName]] : []),
                  ["Categoría", form.category],
                  ["Detalle del trabajo", form.description],
                  ["Dirección", form.address],
                  [
                    "Zona",
                    `${ZONE_LABELS[form.zone as Zone]}${form.neighborhood ? ` · ${form.neighborhood}` : ""}`,
                  ],
                  ["Fotos adjuntas", photos.length > 0 ? `${photos.length} foto(s)` : "Ninguna"],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 p-4 sm:grid-cols-3">
                    <dt className="text-xs sm:text-sm text-muted-foreground font-medium">{k}</dt>
                    <dd className="text-xs sm:text-sm font-semibold sm:col-span-2 text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-800 border border-emerald-500/20">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>
                  Tu dirección exacta solo se compartirá de forma privada con los profesionales verificados que te envíen un presupuesto.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="rounded-xl h-11 px-5" onClick={() => setStep(0)}>
                  <ArrowLeft className="size-4 mr-1.5" /> Volver
                </Button>
                <Button className="flex-1 rounded-xl h-11 font-bold shadow-sm" onClick={submit} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Confirmar pedido
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}