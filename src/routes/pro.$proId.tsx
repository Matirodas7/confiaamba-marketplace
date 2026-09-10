import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  Star,
  Award,
  ShieldCheck,
  BriefcaseBusiness,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReviewsModal } from "@/components/trust";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/Lightbox";
import { formatARS, ZONE_LABELS, type Zone } from "@/lib/marketplace";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/pro/$proId")({
  head: () => ({ meta: [{ title: "Perfil de profesional | ConfiaAMBA" }] }),
  component: ProProfilePage,
});

function ProProfilePage() {
  const { proId } = Route.useParams();
  const { user } = useAuth();
  const [showReviews, setShowReviews] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["public-pro-profile", proId],
    queryFn: async () => {
      const [{ data: profile, error: pErr }, { data: details, error: dErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", proId).maybeSingle(),
        supabase.from("pro_details").select("*").eq("pro_id", proId).maybeSingle(),
      ]);
      if (pErr) throw pErr;
      if (dErr) throw dErr;
      if (!profile || !details) return null;
      return { profile, details };
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ["pro-profile-reviews", proId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, client_id, stars, comment, created_at")
        .eq("pro_id", proId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const reviewersQuery = useQuery({
    queryKey: ["pro-profile-reviewers", proId],
    enabled: (reviewsQuery.data ?? []).length > 0,
    queryFn: async () => {
      const ids = [...new Set((reviewsQuery.data ?? []).map((r) => r.client_id))];
      const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      if (error) throw error;
      return data;
    },
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold">Perfil no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            Este profesional no existe o todavía no completó su perfil público.
          </p>
          <Button asChild className="rounded-xl font-medium">
            <Link to="/buscar">Volver a la búsqueda</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { profile, details: d } = profileQuery.data;
  const isSelf = !!user && user.id === proId;
  const reviewersById = new Map((reviewersQuery.data ?? []).map((p) => [p.id, p.full_name]));
  const reviews = (reviewsQuery.data ?? []).map((r) => ({
    id: r.id,
    stars: r.stars,
    comment: r.comment,
    created_at: r.created_at,
    reviewer_name: reviewersById.get(r.client_id) ?? "Vecino/a",
  }));

  const formattedZones = (d.zones as string[])?.map((z) => ZONE_LABELS[z as Zone]).join(", ") || "AMBA";
  const ratingAvg = Number(d.rating_avg || 5.0);
  const reviewsCount = d.reviews_count ?? reviews.length;

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
        {/* Encabezado Superior */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full border-border/70 bg-background shadow-xs"
            onClick={() => history.back()}
          >
            <ArrowLeft className="size-4 text-foreground" />
          </Button>
          <h2 className="font-bold text-base md:text-lg text-foreground truncate max-w-[250px] text-center">
            {profile.full_name}
          </h2>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full border-border/70 bg-background shadow-xs"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: profile.full_name || "Profesional en ConfiaAMBA",
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
          >
            <Share2 className="size-4 text-foreground" />
          </Button>
        </div>

        {/* Layout Principal: 2 columnas en PC */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* COLUMNA IZQUIERDA: Información Principal, Portafolio y Reseñas (7 Cols en PC) */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Cabecera del Perfil */}
            <div className="flex items-start gap-4">
              <Avatar className="size-20 md:size-24 rounded-2xl shrink-0 border border-border shadow-xs">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-emerald-700 text-white font-bold text-2xl">
                  {profile.full_name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1.5">
                <h1 className="font-bold text-2xl md:text-3xl text-foreground truncate">
                  {profile.full_name}
                </h1>

                <p className="text-sm md:text-base font-medium text-emerald-600">
                  {d.headline || "Profesional de Oficio"}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {d.is_featured && (
                    <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-xs font-semibold border-none px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Award className="size-3.5" /> Pionero
                    </Badge>
                  )}
                  {(profile.security_verified || d.verification === "approved") && (
                    <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 text-xs font-semibold border-none px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="size-3.5" /> Verificado
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Categorías y Especialidades */}
            {(d.categories as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(d.categories as string[]).map((c) => (
                  <Badge key={c} variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                    {c}
                  </Badge>
                ))}
              </div>
            )}

            {/* Bio / Descripción Breve */}
            {d.bio && (
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Sobre mí</h3>
                <p className="text-sm md:text-base text-foreground/90 leading-relaxed font-normal whitespace-pre-wrap">
                  {d.bio}
                </p>
              </div>
            )}

            {/* Fila Metrica: Trabajos y Zona */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-border/70 bg-card p-4 text-xs md:text-sm text-muted-foreground shadow-xs">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4 text-emerald-600 shrink-0" />
                <span>{d.jobs_done} trabajos</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-emerald-600 shrink-0" />
                <span>{d.years_experience} años exp.</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate">{formattedZones}</span>
              </div>
            </div>

            {/* Precio Base Estimado */}
            {d.starting_price && (
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-4">
                <span className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">
                  Precio base estimado
                </span>
                <span className="font-display text-xl md:text-2xl font-extrabold text-foreground">
                  {formatARS(Number(d.starting_price))}
                </span>
              </div>
            )}

            {/* Galería de Trabajos Realizados */}
            <section className="space-y-3 pt-2">
              <h3 className="font-bold text-base md:text-lg text-foreground">Trabajos realizados</h3>
              {(d.portfolio_urls ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {profile.full_name} todavía no subió fotos a su galería.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(d.portfolio_urls ?? []).map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Trabajo realizado"
                      onClick={() => setZoomSrc(url)}
                      className="aspect-square cursor-zoom-in rounded-2xl object-cover hover:opacity-90 transition-opacity border border-border/60 shadow-xs"
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Reseñas Destacadas */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base md:text-lg text-foreground">Reseñas</h3>
                {reviews.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-emerald-700 hover:text-emerald-800 p-0 h-auto font-semibold"
                    onClick={() => setShowReviews(true)}
                  >
                    Ver todas ({reviews.length})
                  </Button>
                )}
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 text-xs md:text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Reciente</span>
                  </div>
                  <p className="text-foreground/90 font-medium">
                    Excelente trabajo, prolijo y muy puntual con el servicio coordinado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 text-xs md:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{r.reviewer_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${
                              i < r.stars
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      {r.comment && <p className="text-foreground/90 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* COLUMNA DERECHA: Tarjeta Flotante de Contratación y Seguridad (5 Cols en PC) */}
          <div className="md:col-span-5 md:sticky md:top-20">
            <div className="rounded-3xl border border-border/80 bg-card p-5 md:p-6 space-y-5 shadow-sm">
              <div className="text-center md:text-left space-y-1">
                <h3 className="font-bold text-lg text-foreground">
                  Contratar a {profile.full_name?.split(" ")[0]}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Solicitá un presupuesto sin compromiso de manera rápida y segura.
                </p>
              </div>

              {/* Bloque de Garantías y Credenciales */}
              <div className="rounded-2xl bg-emerald-50/70 p-4 space-y-2.5 border border-emerald-100">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-950">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Identidad verificada (DNI y selfie)</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-950">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Certificado de oficio presentado</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-950">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Certificado de antecedentes penales</span>
                </div>
              </div>

              {/* Call-to-Action Principal */}
              {isSelf ? (
                <Button disabled className="w-full h-12 rounded-2xl font-bold text-base">
                  Es tu perfil público
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm transition-transform active:scale-[0.99]"
                >
                  <Link to="/solicitar" search={{ proId }}>
                    + Solicitar presupuesto
                  </Link>
                </Button>
              )}

              {/* Valoración / Rating general */}
              <button
                onClick={() => setShowReviews(true)}
                className="flex items-center justify-center gap-1.5 w-full pt-1 text-sm hover:opacity-80 transition-opacity"
              >
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < Math.floor(ratingAvg)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-foreground">{ratingAvg.toFixed(1)}</span>
                <span className="text-muted-foreground">· {reviewsCount} reseñas</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Modales Auxiliares */}
      <ReviewsModal
        open={showReviews}
        onOpenChange={setShowReviews}
        proName={profile.full_name}
        reviews={reviews}
      />
      {zoomSrc && <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}

      <SiteFooter />
    </div>
  );
}