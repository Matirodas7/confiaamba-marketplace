import { Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { Menu, LogOut, LayoutDashboard, Bell, UserRound, Briefcase } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/buscar", label: "Buscar profesionales" },
  { to: "/solicitar", label: "Pedir presupuesto" },
  { to: "/como-funciona", label: "Cómo funciona" },
];

/** Texto del panel principal, distinto según a quién le hable. */
function panelLabel(role: string | null) {
  if (role === "professional") return "Mi panel profesional";
  if (role === "admin") return "Panel de administración";
  return "Mi actividad";
}

export function SiteHeader() {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notifications = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
  const unreadCount = (notifications.data ?? []).filter((n) => !n.is_read).length;

  async function markAllRead() {
    const unread = (notifications.data ?? []).filter((n) => !n.is_read);
    if (unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in(
        "id",
        unread.map((n) => n.id),
      );
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/", replace: true });
  }

  const NotificationsBell = (
    <Popover onOpenChange={(o) => o && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="max-h-96 overflow-y-auto">
          {(notifications.data ?? []).length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No tenés notificaciones todavía.
            </p>
          ) : (
            (notifications.data ?? []).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border p-3 last:border-0",
                  !n.is_read && "bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {!n.is_read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("es-AR")}
                  </p>
                  {n.link && (
                    <Button asChild size="sm" variant="outline">
                      <a href={n.link}>Ver detalle</a>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl [transform:translateZ(0)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="" className="size-9" />
          <span className="font-display text-lg font-bold tracking-tight">
            Confia<span className="text-verified">AMBA</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ---- Desktop: notificaciones + un único menú de perfil ---- */}
        <div className="ml-auto hidden items-center gap-1 md:flex">
          {user ? (
            <>
              {NotificationsBell}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-secondary"
                    aria-label="Tu cuenta"
                  >
                    <Avatar className="size-8">
                      <AvatarImage
                        src={profile?.avatar_url ?? undefined}
                        alt={profile?.full_name}
                      />
                      <AvatarFallback className="text-xs">
                        {profile?.full_name?.slice(0, 1).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-28 truncate text-sm font-medium">
                      {profile?.first_name || profile?.full_name || "Cuenta"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate font-semibold">{profile?.full_name}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {role === "professional"
                        ? "Cuenta de profesional"
                        : role === "admin"
                          ? "Cuenta de administrador"
                          : "Cuenta de cliente"}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={dashboardPathFor(role) as "/cliente"} className="cursor-pointer">
                      {role === "professional" ? (
                        <Briefcase className="size-4" />
                      ) : (
                        <LayoutDashboard className="size-4" />
                      )}
                      {panelLabel(role)}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/cuenta" className="cursor-pointer">
                      <UserRound className="size-4" />
                      Mi perfil y documentos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Ingresar</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>

        {/* ---- Mobile: notificaciones + menú hamburguesa ---- */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          {user && NotificationsBell}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              {user && (
                <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Avatar className="size-10">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name} />
                    <AvatarFallback>
                      {profile?.full_name?.slice(0, 1).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {role === "professional"
                        ? "Profesional"
                        : role === "admin"
                          ? "Administrador"
                          : "Cliente"}
                    </p>
                  </div>
                </div>
              )}
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                {user ? (
                  <>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link to={dashboardPathFor(role) as "/cliente"}>{panelLabel(role)}</Link>
                    </Button>
                    <Button asChild variant="ghost" onClick={() => setOpen(false)}>
                      <Link to="/cuenta">Mi perfil y documentos</Link>
                    </Button>
                    <Button variant="outline" onClick={handleSignOut}>
                      <LogOut className="size-4" /> Cerrar sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link to="/auth">Crear cuenta</Link>
                    </Button>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/auth">Ingresar</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}