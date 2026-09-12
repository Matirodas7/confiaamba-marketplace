import { Link } from "@tanstack/react-router";
import {
  Zap,
  Droplets,
  Flame,
  Wind,
  Building2,
  PaintRoller,
  Hammer,
  KeyRound,
  Truck,
  Sparkles,
  Trees,
  Monitor,
  Wrench,
} from "lucide-react";
import { CATEGORIES, CATEGORY_ICON_NAMES } from "@/lib/marketplace";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Droplets,
  Flame,
  Wind,
  Building2,
  PaintRoller,
  Hammer,
  KeyRound,
  Truck,
  Sparkles,
  Trees,
  Monitor,
};

/** Grilla/carrusel de categorías con ícono circular, estilo PedidosYa. */
export function CategoryGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
      }
    >
      {CATEGORIES.map((c) => {
        const Icon = ICONS[CATEGORY_ICON_NAMES[c] ?? ""] ?? Wrench;
        return (
          <Link
            key={c}
            to="/buscar"
            search={{ category: c }}
            className={`flex flex-col items-center gap-2 text-center ${compact ? "shrink-0 w-20" : ""}`}
          >
            <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary transition-colors hover:bg-verified/15">
              <Icon className="size-7 text-verified" />
            </span>
            <span className="text-xs font-medium leading-tight text-foreground">{c}</span>
          </Link>
        );
      })}
    </div>
  );
}