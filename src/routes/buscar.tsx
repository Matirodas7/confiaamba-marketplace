import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Search, Loader2, SlidersHorizontal, Star, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryGrid } from "@/components/CategoryGrid";
import { VerifiedBadge, FeaturedBadge } from "@/components/trust";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, ZONES, ZONE_LABELS, zoneFromCoords, formatARS, type Zone } from "@/lib/marketplace";
import { useAuth } from "@/hooks/useAuth";

type BuscarSearch = { category?: string };

export const Route = createFileRoute("/buscar")({
  validateSearch: (search: Record<string, unknown>): BuscarSearch => {
    const category = typeof search["category"] === "string" ? search["category"] : undefined;
    return category ? { category } : {};
  },
  head: () => ({
    meta: [
      { title: "Buscar profesionales verificados en AMBA | ConfiaAMBA" },
      {
        name: "description",
        content:
          "Encontrá electricistas, plomeros, pintores y más en CABA, Norte, Sur y Oeste. Perfiles verificados, calificaciones y precios desde.",
      },
      { property: "og:title", content: "Buscar profesionales verificados en AMBA" },
      {
        property: "og:description",
        content: "Compará profesionales verificados por zona, categoría y calificación.",
      },
    ],
  }),
  component: SearchPage,
});

const PAGE_SIZE = 12;

type ProRow = {
  pro_id: string;
  headline: string;
  bio: string;
  categories: string[];
  zones: string[];
  work_radius_km: number;
  starting_price: number;
  rating_avg: number;
  reviews_count: number;
  jobs_done: number;
  is_featured: boolean;
  is_premium: boolean;
  verification: string;
  profile: {
    id: string;
    full_name: string;
    location: string | null;
    zone: string | null;
    security_verified: boolean;
    avatar_url: string | null;
  } | null;
};

function SearchPage() {
  const { profile } = useAuth();
  const { category: categoryFromUrl } = Route.useSearch();
  const [term, setTerm] = useState("");
  const [zone, setZone] = useState<Zone | "todas">("todas");
  const [category, setCategory] = useState<string>(categoryFromUrl ?? "todas");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [locating, setLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  useEffect(() => {
    if (categoryFromUrl) setCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    if (profile?.zone && (ZONES as readonly string[]).includes(profile.zone)) {
      setZone(profile.zone as Zone);
      setCurrentAddress(profile.location || ZONE_LABELS[profile.zone as Zone]);
    }
  }, [profile]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no permite compartir ubicación.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detected = zoneFromCoords(pos.coords.latitude, pos.coords.longitude);
        setZone(detected);
        const label = ZONE_LABELS[detected];
        setCurrentAddress(label);
        setLocating(false);
        toast.success(`Ubicación establecida en ${label}`);
      },
      () => {
        setLocating(false);
        toast.error("No pudimos acceder a tu ubicación. Elegí tu zona manualmente.");
        setShowFilters(true);
      },
      { timeout: 8000 },
    );
  }

  useEffect(() => {
    setPage(1);
  }, [zone, category]);

  const prosQuery = useQuery({
    queryKey: ["pros", zone, category, page],
    queryFn: async () => {
      let query = supabase
        .from("pro_details")
        .select(
          "*, profile:profiles!pro_details_pro_profile_fkey(id, full_name, location, zone, security_verified, avatar_url)",
          { count: "exact" },
        )
        .eq("onboarding_complete", true)
        .order("is_featured", { ascending: false })
        .order("rating_avg", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (zone !== "todas") query = query.contains("zones", [zone]);
      if (category !== "todas") query = query.contains("categories", [category]);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as ProRow[], total: count ?? 0 };
    },
  });

  const [accumulated, setAccumulated] = useState<ProRow[]>([]);
  useEffect(() => {
    setAccumulated([]);
  }, [zone, category]);
  useEffect(() => {
    if (!prosQuery.data) return;
    setAccumulated((prev) => {
      const seen = new Set(prev.map((p) => p.pro_id));
      const fresh = prosQuery.data.rows.filter((p) => !seen.has(p.pro_id));
      return page === 1 ? prosQuery.data.rows : [...prev, ...fresh];
    });
  }, [prosQuery.data, page]);

  const rows = accumulated;
  const total = prosQuery.data?.total ?? 0;

  const results = term.trim()
    ? rows.filter(({ profile: p, headline, categories }) => {
        const hay = `${p?.full_name ?? ""} ${headline} ${categories.join(" ")}`;
        return hay.toLowerCase().includes(term.trim().toLowerCase());
      })
    : rows;

  const filtersActive = zone !== "todas" || category !== "todas" || term.trim().length > 0;
  const hasMore = page * PAGE_SIZE < total;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Cabecera superior compacta */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-5">
          
          {/* Selector de Ubicación */}
          <div className="flex items-center mb-3">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 text-left group transition-opacity hover:opacity-80"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                {locating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MapPin className="size-4" />
                )}
              </div>
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                  <span className="truncate max-w-[250px] sm:max-w-md">
                    {currentAddress ? currentAddress : "Ingresar ubicación"}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                </span>
              </div>
            </button>
          </div>

          {/* Buscador + Botón Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 sm:size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar profesionales, rubros..."
                className="h-12 rounded-full pl-11 text-sm sm:text-base bg-background shadow-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-full"
              onClick={() => setShowFilters((v) => !v)}
              title="Filtros"
            >
              <SlidersHorizontal className="size-5" />
            </Button>
          </div>

          {/* Filtros desplegables */}
          {showFilters && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 pt-3 border-t border-border/50">
              <Select
                value={zone}
                onValueChange={(v) => {
                  const selectedZone = v as Zone | "todas";
                  setZone(selectedZone);
                  setCurrentAddress(selectedZone === "todas" ? null : ZONE_LABELS[selectedZone]);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las zonas</SelectItem>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {ZONE_LABELS[z]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Rubros */}
        <section>
          <h2 className="font-display text-lg sm:text-xl font-bold">Rubros</h2>
          <div className="mt-4">
            <CategoryGrid compact />
          </div>
        </section>

        {/* Lista de Profesionales cerca tuyo */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg sm:text-xl font-bold">
              {category !== "todas" ? category : "Profesionales cerca tuyo"}
            </h2>
            {total > 0 && <span className="text-sm text-muted-foreground font-medium">{total} resultados</span>}
          </div>

          {prosQuery.isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="size-7 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="trust-card mt-4 p-10 text-center border border-border/80 rounded-2xl">
              <p className="font-semibold text-base sm:text-lg">
                {filtersActive
                  ? "No se encontraron profesionales para esta búsqueda"
                  : "Todavía no hay profesionales publicados"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {filtersActive
                  ? "Probá con otra categoría, zona o término de búsqueda."
                  : "Publicá tu pedido y los profesionales de tu zona te contactarán con presupuestos."}
              </p>
              <Button asChild className="mt-6" size="lg">
                <Link to="/solicitar">Pedir presupuesto gratis</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((pro) => {
                const p = pro.profile;
                if (!p) return null;
                const isVerified = p.security_verified || pro.verification === "approved";

                return (
                  <Link
                    key={pro.pro_id}
                    to="/pro/$proId"
                    params={{ proId: pro.pro_id }}
                    className="trust-card flex items-center gap-4 sm:gap-5 p-4 sm:p-5 transition-all hover:shadow-md border border-border/80 rounded-2xl bg-card"
                  >
                    {/* Avatar más amplio en PC */}
                    <Avatar className="size-16 sm:size-20 shrink-0 rounded-2xl border border-border/50">
                      <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name} className="object-cover" />
                      <AvatarFallback className="rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
                        {p.full_name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Información del Profesional */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Nombre y Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="truncate text-base sm:text-lg font-bold text-foreground leading-snug">
                          {p.full_name}
                        </h3>
                        {pro.is_featured && <FeaturedBadge />}
                        {isVerified && <VerifiedBadge />}
                      </div>

                      {/* Rubro / Titular */}
                      <p className="text-sm sm:text-base font-medium text-muted-foreground line-clamp-1">
                        {pro.headline || (pro.categories?.[0] ?? "Profesional")}
                      </p>

                      {/* Información de Precio y Zonas */}
                      <div className="pt-0.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span>Desde <strong className="text-foreground font-bold">{formatARS(Number(pro.starting_price))}</strong></span>
                        <span>·</span>
                        <span className="truncate">
                          {(pro.zones as string[]).map((z) => ZONE_LABELS[z as Zone]).join(", ") || "AMBA"}
                        </span>
                      </div>
                    </div>

                    {/* Calificación a la derecha */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                      <Star className="size-4 sm:size-5 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="text-sm sm:text-base font-extrabold text-foreground">
                        {Number(pro.rating_avg).toFixed(1)}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        ({pro.reviews_count})
                      </span>
                    </div>
                  </Link>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={prosQuery.isFetching}
                  >
                    {prosQuery.isFetching && <Loader2 className="size-4 animate-spin mr-2" />}
                    Ver más profesionales
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}