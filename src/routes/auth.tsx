import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, dashboardPathFor } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar o registrarse | ConfiaAMBA" },
      {
        name: "description",
        content:
          "Accedé a tu cuenta de ConfiaAMBA para pedir presupuestos o gestionar tu perfil profesional verificado en AMBA.",
      },
      { property: "og:title", content: "Ingresar o registrarse | ConfiaAMBA" },
      {
        property: "og:description",
        content: "Cuenta segura para clientes y profesionales verificados del AMBA.",
      },
    ],
  }),
  component: AuthPage,
});

// Logo SVG de Google
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"client" | "professional">("client");

  useEffect(() => {
    if (!loading && user) navigate({ to: dashboardPathFor(role) as "/cliente", replace: true });
  }, [loading, user, role, navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("¡Bienvenido de nuevo!");
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: String(form.get("first_name")),
          last_name: String(form.get("last_name")),
          role: accountType,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cuenta creada. Revisá tu email si te pedimos confirmarlo.");
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setGoogleBusy(false);
      toast.error("No pudimos iniciar sesión con Google.");
    }
  }

  async function handleResetPassword() {
    const email = prompt("Ingresá tu email para enviarte el enlace de recuperación:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Enlace enviado. Revisá tu casilla de correo.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Columna Izquierda (Branding en PC) */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <img src={logo} alt="" className="size-7" /> ConfiaAMBA
        </Link>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Profesionales verificados,
            <br />
            trabajos sin sorpresas.
          </h1>
          <ul className="mt-8 space-y-3 text-primary-foreground/80 text-sm">
            <li className="flex items-center gap-2">✓ Identidad y antecedentes validados por nuestro equipo</li>
            <li className="flex items-center gap-2">✓ Presupuestos gratis y sin compromiso</li>
            <li className="flex items-center gap-2">✓ Reseñas reales de vecinos del AMBA</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Datos protegidos con cifrado HTTPS y aislamiento de privacidad por usuario.
        </p>
      </div>

      {/* Columna Derecha / Formulario */}
      <div className="flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-6">
          
          {/* Logo visible en celulares */}
          <div className="flex justify-center lg:hidden pb-2">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
              <img src={logo} alt="ConfiaAMBA" className="size-8" />
              <span>Confia<span className="text-emerald-600">AMBA</span></span>
            </Link>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 p-1 bg-muted">
              <TabsTrigger value="login" className="rounded-lg text-sm font-semibold">
                Ingresar
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-sm font-semibold">
                Crear cuenta
              </TabsTrigger>
            </TabsList>

            {/* Iniciar Sesión */}
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="l-email" className="text-xs font-semibold">Email</Label>
                  <Input id="l-email" name="email" type="email" required autoComplete="email" className="h-11 rounded-xl" placeholder="ejemplo@correo.com" />
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="l-pass" className="text-xs font-semibold">Contraseña</Label>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      ¿Olvidaste tu clave?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="l-pass"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-bold rounded-xl" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Ingresar
                </Button>
              </form>
            </TabsContent>

            {/* Crear Cuenta */}
            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["client", "Soy cliente"],
                      ["professional", "Soy profesional"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccountType(value)}
                      className={cn(
                        "rounded-xl border p-3 text-sm font-semibold transition-all",
                        accountType === value
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 font-bold"
                          : "border-border hover:bg-secondary text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-first-name" className="text-xs font-semibold">Nombre</Label>
                    <Input id="r-first-name" name="first_name" required className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-last-name" className="text-xs font-semibold">Apellido</Label>
                    <Input id="r-last-name" name="last_name" required className="h-11 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="r-email" className="text-xs font-semibold">Email</Label>
                  <Input id="r-email" name="email" type="email" required className="h-11 rounded-xl" placeholder="ejemplo@correo.com" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="r-pass" className="text-xs font-semibold">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="r-pass"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      required
                      autoComplete="new-password"
                      className="h-11 rounded-xl pr-10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-bold rounded-xl" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null} Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o continuá con{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Botón Google con indicador de carga */}
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-semibold border-border/80 hover:bg-muted/50 gap-2.5"
            onClick={handleGoogle}
            disabled={googleBusy}
          >
            {googleBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon className="size-5 shrink-0" />
            )}
            <span>Continuar con Google</span>
          </Button>

          {/* Términos y aviso legal */}
          <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
            Al continuar, aceptás los{" "}
            <Link to="/" className="underline hover:text-foreground">Términos de servicio</Link> y la{" "}
            <Link to="/" className="underline hover:text-foreground">Política de privacidad</Link>.
          </p>

          <p className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
            <Link to="/" className="underline underline-offset-4 hover:text-foreground">
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}