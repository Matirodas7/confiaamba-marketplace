import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShieldCheck, MapPin, ChevronRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryGrid } from "@/components/CategoryGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZONES, ZONE_LABELS, type Zone } from "@/lib/marketplace";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ConfiaAMBA | Profesionales verificados en CABA y GBA" },
      {
        name: "description",
        content:
          "Encontrá electricistas, plomeros, pintores y más en el AMBA. Profesionales con identidad verificada, reseñas reales y presupuestos gratis sin compromiso.",
      },
      { property: "og:title", content: "ConfiaAMBA | Profesionales verificados en CABA y GBA" },
      {
        property: "og:description",
        content:
          "Publicá tu pedido y recibí presupuestos gratis de profesionales verificados del AMBA.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [zone, setZone] = useState<Zone | "todas">("todas");
  const [term, setTerm] = useState("");
  // El cartel de "registrate como profesional" es para captar profesionales
  // nuevos: no tiene sentido mostrárselo a alguien que ya es pro, ni al admin.
  const showProCta = role !== "professional" && role !== "admin";

  const handleSearch = () => {
    const trimmed = term.trim();
    navigate({
      to: "/buscar",
      search: trimmed ? { category: trimmed } : {},
    });
  };

  return (
    <div className="min-h-screen bg-background pb-12 sm:pb-0">
      <SiteHeader />

      <main>
        {/* Header / Hero adaptado a Desktop y Mobile */}
        <section className="bg-primary text-primary-foreground px-4 pt-8 pb-14 sm:py-16 rounded-b-[2rem] shadow-md">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Ubicación y Badge */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 opacity-90">
                <MapPin className="size-4 text-emerald-400 shrink-0" />
                <span className="font-semibold tracking-wide">AMBA · Buenos Aires</span>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-primary-foreground/15 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                <ShieldCheck className="size-3.5 text-emerald-400" /> Verificados
              </span>
            </div>

            {/* Titular */}
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight">
                ¿Qué servicio necesitás hoy?
              </h1>
              <p className="text-sm sm:text-lg text-primary-foreground/80">
                Presupuestos gratis de profesionales de confianza cerca tuyo.
              </p>
            </div>

            {/* Unificación de Búsqueda para PC (Contenedor blanco integral) */}
            <div className="pt-2">
              <div className="flex flex-col md:flex-row items-center gap-2 p-2 rounded-2xl md:rounded-full bg-background text-foreground shadow-lg">
                
                {/* Input Principal */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                  <Input
                    className="h-12 pl-11 border-0 bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Ej: Plomero, Electricista, Pintor..."
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>

                <div className="h-8 w-px bg-border hidden md:block" />

                {/* Select de Zona */}
                <div className="w-full md:w-auto">
                  <Select value={zone} onValueChange={(v) => setZone(v as Zone)}>
                    <SelectTrigger className="h-12 border-0 bg-transparent text-foreground text-sm font-medium focus:ring-0 focus:ring-offset-0 min-w-[160px]">
                      <SelectValue placeholder="Todas las zonas" />
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
                </div>

                {/* Botón Buscar */}
                <Button
                  size="lg"
                  onClick={handleSearch}
                  className="h-12 w-full md:w-auto rounded-xl md:rounded-full font-bold px-8 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all"
                >
                  Buscar
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Acceso Rápido a Solicitar (Ancho alineado a max-w-5xl) */}
        <section className="mx-auto max-w-5xl px-4 -mt-6">
          <Link
            to="/solicitar"
            className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-md hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Sparkles className="size-6" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">¿Querés pedir presupuestos directo?</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Publicá tu pedido en 2 pasos sin cargo y recibí propuestas de profesionales</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
          </Link>
        </section>

        {/* Categorías / Rubros */}
        <section className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">Rubros populares</h2>
            <Link to="/buscar" className="text-xs font-semibold text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <CategoryGrid />
        </section>

        {/* Beneficios */}
        <section className="mx-auto max-w-5xl px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: ShieldCheck,
                title: "Identidad Verificada",
                text: "Validamos DNI y documentación.",
              },
              {
                icon: MapPin,
                title: "Cobertura AMBA",
                text: "CABA y Gran Buenos Aires.",
              },
              {
                icon: Sparkles,
                title: "Presupuestos Gratis",
                text: "Sin compromiso de contratación.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="trust-card flex items-center gap-3 p-3.5 border border-border/60 rounded-2xl bg-surface"
              >
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                  <f.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{f.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Registro para Profesionales — solo para clientes/visitantes */}
        {showProCta && (
          <section className="mx-auto max-w-5xl px-4 py-8">
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8 space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-xl font-bold">¿Ofrecés un servicio?</h2>
                <p className="text-xs sm:text-sm text-primary-foreground/80 leading-relaxed">
                  Registrate como profesional, elegí tu zona de trabajo y empezá a recibir pedidos de vecinos.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button asChild size="default" variant="secondary" className="font-bold rounded-xl h-11">
                  <Link to="/auth">Registrarme como profesional</Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}