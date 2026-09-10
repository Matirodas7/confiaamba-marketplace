import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wrench, ClipboardList, User } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Navegación inferior fija, solo en mobile. Pensada para el flujo del
 * cliente (o visitante anónimo) — los profesionales y administradores ya
 * tienen su panel con tabs propias, así que no se las mostramos.
 */
export function BottomNav() {
  const { role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (role === "professional" || role === "admin") return null;

  const items = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/buscar", label: "Servicios", icon: Wrench },
    { to: dashboardPathFor(role) ?? "/cliente", label: "Pedidos", icon: ClipboardList },
    { to: "/cuenta", label: "Mi perfil", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      {items.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            to={item.to as "/"}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
          >
            <Icon className={cn("size-5", active ? "text-verified" : "text-muted-foreground")} />
            <span
              className={cn(
                "text-[11px] font-medium",
                active ? "text-verified" : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
