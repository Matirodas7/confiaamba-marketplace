import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Bell,
  Lock,
  MessageCircle,
  Mail,
  FileText,
  Shield,
  ChevronRight,
  Hammer,
  LogOut,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonalDataForm } from "@/components/PersonalDataForm";
import { ProfileForm, AvatarUploader } from "@/routes/_authenticated/pro";
import { ClientVerificationCard } from "@/routes/_authenticated/cliente";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta | ConfiaAMBA" }] }),
  component: CuentaPage,
});

type TabType = "data" | "pro_profile" | "security";

function CuentaPage() {
  const { user, profile, role, loading, refresh, signOut } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("data");
  const [mobileModal, setMobileModal] = useState<TabType | null>(null);

  const proDetails = useQuery({
    queryKey: ["pro-details", user?.id],
    enabled: !!user && role === "professional",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_details")
        .select("*")
        .eq("pro_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || (role === "professional" && proDetails.isLoading)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ✅ SOLUCIÓN: Si es una pantalla de PC (ancho >= 768px), NO abre el modal móvil.
  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setMobileModal(tab);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Mi cuenta
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gestioná tus datos personales, seguridad y preferencias de servicio.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notificaciones" asChild>
          <Link to="/mensajes">
            <Bell className="size-5 text-muted-foreground" />
          </Link>
        </Button>
      </div>

      {/* Grid Principal Responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA / SIDEBAR (4 cols en PC) */}
        <div className="md:col-span-4 space-y-5">
          {/* Tarjeta de Perfil / Usuario */}
          <div className="trust-card flex items-center gap-3.5 p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
            <AvatarUploader userId={user!.id} avatarUrl={profile?.avatar_url ?? null} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-bold text-base text-foreground truncate">
                {profile?.full_name || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <Badge className="bg-emerald-500/10 text-emerald-700 font-semibold text-[10px] hover:bg-emerald-500/20 px-2 py-0">
                {role === "professional" ? "Profesional" : role === "admin" ? "Admin" : "Cliente"}
              </Badge>
            </div>
          </div>

          {/* Banner Promocional para Clientes */}
          {role === "client" && (
            <Link
              to="/auth"
              className="relative block overflow-hidden rounded-2xl bg-emerald-700 p-4 text-white shadow-xs transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Hammer className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">¿Ofrecés un oficio?</p>
                  <p className="text-xs text-emerald-100 line-clamp-1">
                    Sumate como profesional y recibí pedidos.
                  </p>
                </div>
                <ChevronRight className="size-5 text-emerald-200 shrink-0" />
              </div>
            </Link>
          )}

          {/* Menú de Navegación Lateral */}
          <div className="space-y-4">
            {/* Grupo: MI CUENTA */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-1">
                Mi cuenta
              </p>
              <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                <button
                  onClick={() => handleSelectTab("data")}
                  className={cn(
                    "flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50",
                    activeTab === "data" && "md:bg-emerald-50/80 md:text-emerald-900 md:font-semibold"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <User className="size-4 text-muted-foreground" />
                    <span>Mis datos</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </button>

                {role === "professional" && (
                  <button
                    onClick={() => handleSelectTab("pro_profile")}
                    className={cn(
                      "flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50",
                      activeTab === "pro_profile" && "md:bg-emerald-50/80 md:text-emerald-900 md:font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Hammer className="size-4 text-muted-foreground" />
                      <span>Perfil de servicio y documentación</span>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/70" />
                  </button>
                )}
              </div>
            </div>

            {/* Grupo: SEGURIDAD */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-1">
                Seguridad
              </p>
              <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                <button
                  onClick={() => handleSelectTab("security")}
                  className={cn(
                    "flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50",
                    activeTab === "security" && "md:bg-emerald-50/80 md:text-emerald-900 md:font-semibold"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Lock className="size-4 text-muted-foreground" />
                    <span>Verificación de identidad</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </button>
              </div>
            </div>

            {/* Grupo: SOPORTE */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase px-1">
                Soporte
              </p>
              <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                <a
                  href="https://wa.me/5491100000000"
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="size-4 text-muted-foreground" />
                    <span>WhatsApp · soporte directo</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </a>

                <a
                  href="mailto:soporte@confiaamba.ar"
                  className="flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>Escribinos por email</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </a>

                <Link
                  to="/como-funciona"
                  className="flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-muted-foreground" />
                    <span>Términos y condiciones</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </Link>

                <Link
                  to="/como-funciona"
                  className="flex w-full items-center justify-between p-3.5 text-left text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="size-4 text-muted-foreground" />
                    <span>Política de privacidad</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </Link>
              </div>
            </div>

            {/* Botón de Cerrar Sesión */}
            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 font-semibold gap-2"
              onClick={signOut}
            >
              <LogOut className="size-4" /> Cerrar sesión
            </Button>
          </div>
        </div>

        {/* COLUMNA DERECHA / PANEL PRINCIPAL (Solo se ve en PC) */}
        <div className="hidden md:block md:col-span-8">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs min-h-[500px]">
            {activeTab === "data" && (
              <div className="space-y-6">
                <div className="border-b border-border/60 pb-3">
                  <h2 className="text-xl font-bold text-foreground">Mis datos personales</h2>
                  <p className="text-xs text-muted-foreground">
                    Modificá la información de contacto y ubicación de tu cuenta.
                  </p>
                </div>
                <PersonalDataForm
                  userId={user!.id}
                  profile={profile}
                  onSaved={() => refresh()}
                />
              </div>
            )}

            {activeTab === "pro_profile" && role === "professional" && (
              <ProfileForm
                details={proDetails.data}
                userId={user!.id}
                onSaved={() => qc.invalidateQueries()}
              />
            )}

            {activeTab === "security" && (
              <ClientVerificationCard
                userId={user!.id}
                profile={profile}
                onSaved={() => refresh()}
              />
            )}
          </div>
        </div>

      </div>

      {/* MODALES EXCLUSIVOS PARA DISPOSITIVOS MÓVILES */}
      <div className="md:hidden">
        {/* Modal: Mis Datos */}
        <Dialog open={mobileModal === "data"} onOpenChange={(o) => !o && setMobileModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mis datos personales</DialogTitle>
            </DialogHeader>
            <PersonalDataForm
              userId={user!.id}
              profile={profile}
              onSaved={() => {
                refresh();
                setMobileModal(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Modal: Perfil Profesional */}
        {role === "professional" && (
          <Dialog open={mobileModal === "pro_profile"} onOpenChange={(o) => !o && setMobileModal(null)}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <ProfileForm
                details={proDetails.data}
                userId={user!.id}
                onSaved={() => {
                  qc.invalidateQueries();
                  setMobileModal(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Modal: Verificación y Seguridad */}
        <Dialog open={mobileModal === "security"} onOpenChange={(o) => !o && setMobileModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <ClientVerificationCard
              userId={user!.id}
              profile={profile}
              onSaved={() => {
                refresh();
                setMobileModal(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}