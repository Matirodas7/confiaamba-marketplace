import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Wrench,
  ClipboardList,
  User,
  Briefcase,
  MessageCircle,
  ShieldCheck,
  FilePlus2,
} from "lucide-react";
import { useAuth, dashboardPathFor, type AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Home };

/**
 * Navegación inferior fija, solo en mobile. Cada rol ve sus propios accesos:
 * el cliente navega el marketplace, el profesional su panel y mensajes, y el
 * administrador su panel de control.
 */
function itemsForRole(role: AppRole | null): NavItem[] {
  if (role === "professional") {
    return [
      { to: "/pro", label: "Panel", icon: Briefcase },
      { to: "/mensajes", label: "Mensajes", icon: MessageCircle },
      { to: "/cuenta", label: "Mi perfil", icon: User },
    ];
  }

  if (role === "admin") {
    return [
      { to: "/admin", label: "Panel", icon: ShieldCheck },
      { to: "/cuenta", label: "Mi perfil", icon: User },
    ];
  }

  // Cliente logueado o visitante anónimo.
  return [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/buscar", label: "Servicios", icon: Wrench },
    { to: "/solicitar", label: "Solicitar", icon: FilePlus2 },
    { to: dashboardPathFor(role) ?? "/cliente", label: "Pedidos", icon: ClipboardList },
    { to: "/cuenta", label: "Mi perfil", icon: User },
  ];
}

export function BottomNav() {
  const { role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = itemsForRole(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 backdrop-blur-lg [transform:translateZ(0)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
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
