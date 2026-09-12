import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function SiteFooter() {
  return (
    <footer className="hidden border-t border-border bg-surface md:block">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="size-8" />
            <span className="font-display font-bold">ConfiaAMBA</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Profesionales verificados en CABA y Gran Buenos Aires. Presupuestos gratis y sin
            compromiso.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Servicios</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link to="/buscar">Buscar profesionales</Link>
            </li>
            <li>
              <Link to="/solicitar">Pedir presupuesto</Link>
            </li>
            <li>
              <Link to="/como-funciona">Cómo funciona</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Zonas</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>CABA</li>
            <li>GBA Norte</li>
            <li>GBA Sur</li>
            <li>GBA Oeste</li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Confianza</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Verificación de identidad (KYC)</li>
            <li>Antecedentes revisados</li>
            <li>Reseñas reales de clientes</li>
            <li>Conexión cifrada HTTPS</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} ConfiaAMBA. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/terminos" className="hover:text-foreground hover:underline">
              Términos y Condiciones
            </Link>
            <Link to="/privacidad" className="hover:text-foreground hover:underline">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}