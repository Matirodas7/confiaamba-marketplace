import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Users, ShieldCheck, Star } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Cómo funciona ConfiaAMBA | Presupuestos verificados" },
      {
        name: "description",
        content:
          "Publicá tu pedido, recibí presupuestos de profesionales verificados del AMBA y calificá el trabajo terminado. Gratis y sin compromiso.",
      },
      { property: "og:title", content: "Cómo funciona ConfiaAMBA" },
      {
        property: "og:description",
        content: "Cuatro pasos simples para contratar un profesional verificado en AMBA.",
      },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    icon: ClipboardList,
    title: "1. Contanos el trabajo",
    text: "Describí lo que necesitás, elegí la categoría y tu zona del AMBA. Toma menos de 2 minutos.",
  },
  {
    icon: Users,
    title: "2. Recibí presupuestos",
    text: "Los profesionales de tu zona te envían su precio y propuesta. Gratis y sin compromiso.",
  },
  {
    icon: ShieldCheck,
    title: "3. Elegí con confianza",
    text: "Compará reseñas reales, distancia y verificación de identidad antes de decidir.",
  },
  {
    icon: Star,
    title: "4. Calificá el servicio",
    text: "Cuando el trabajo está completado, dejás tu puntuación de 1 a 5 estrellas y tu comentario.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">Cómo funciona</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          ConfiaAMBA conecta vecinos de CABA y Gran Buenos Aires con profesionales cuya identidad y
          antecedentes fueron revisados por nuestro equipo.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="trust-card p-6">
              <s.icon className="size-6 text-verified" />
              <h2 className="mt-4 text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/solicitar">Pedir presupuesto gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/buscar">Ver profesionales</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}