import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Se resuelve UNA sola vez acá y se comparte a las rutas hijas vía
    // contexto. Antes cada ruta (/cliente, /pro) hacía su propia consulta
    // fresca a user_roles en su propio beforeLoad; si esa consulta fallaba
    // o devolvía vacío por una carrera con la sesión recién creada, las dos
    // rutas se redirigían mutuamente sin parar (loop /cliente <-> /pro).
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const roles = (roleRows ?? []).map((r) => r.role);

    return { user: data.user, roles };
  },
  component: () => (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <Outlet />
    </div>
  ),
});