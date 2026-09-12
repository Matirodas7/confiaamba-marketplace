# Cambios aplicados — leer antes de mover nada

Este ZIP es tu proyecto completo reconstruido a partir del export de texto que me
pasaste (repomix). **Ese export no incluye archivos binarios** (logo, imágenes de
`public/`, favicon, etc.), así que **no reemplaces tu repo entero con esto** —
copiá puntualmente los archivos de la lista de abajo sobre tu repo real. Todo lo
demás (imágenes, assets, lockfile si usás otro package manager, etc.) seguí
usando el que ya tenés.

## Ronda 3 — presupuestos: ver perfil del pro, sacar precio sugerido del cliente, comisión del 20%

**Archivo nuevo:**
- `supabase/migrations/20260912090000_default_commission_20.sql` — fija en 20%
  la comisión por defecto (la tabla `platform_settings` ya existía con 10%,
  simplemente no se usaba del lado del cliente todavía).

**Modificados:**
- `src/lib/marketplace.ts` — nuevo helper `priceForClient()` (precio del
  profesional + comisión) y `DEFAULT_COMMISSION_PERCENT`.
- `src/routes/_authenticated/cliente.tsx` —
  - Link "Ver perfil y trabajos" en cada presupuesto recibido, antes de
    aceptar/rechazar (abre `/pro/$proId` en pestaña nueva).
  - Todos los precios que ve el cliente (lista de presupuestos, resumen del
    pedido, historial, diálogo de "marcar como pagado") ahora muestran
    presupuesto del profesional + comisión, usando el % configurado en
    `platform_settings` / `category_commission_overrides` (con fallback a 20%).
  - Desglose "Presupuesto del profesional / Servicio ConfiaAMBA / Total a
    pagar" en el detalle del trabajo aceptado.
- `src/routes/_authenticated/pro.tsx` — el profesional sigue viendo y
  cobrando su monto real sin cambios; se agregó un texto chico bajo el campo
  de precio ("el cliente va a ver $X, vos cobrás $Y") para que no se
  sorprenda con la diferencia.
- `src/routes/solicitar.tsx` — se eliminó el campo "Presupuesto estimado"
  del formulario de pedido del cliente (input, estado, resumen y payload de
  creación). El precio depende exclusivamente del profesional.

**Nota:** esto es la capa de visualización del precio. No hay pasarela de
pago real todavía (el pago se sigue coordinando directo entre cliente y
profesional, como ya estaba). Es la base para el siguiente paso cuando
quieras cobrar la comisión de verdad.

---

## Ronda 1 y 2 (seguridad, deploy, UI, legales)

Verifiqué que todo el proyecto tipa correctamente con `tsc --noEmit` (0 errores)
y que `vite build` genera bien los chunks de las rutas nuevas antes de fallar
por la imagen faltante (`src/assets/logo.png`, que no viaja en el export de
texto — en tu repo real sí existe y el build va a terminar bien).

## 1. Archivo nuevo — migración de seguridad (🔴 el más importante)

- `supabase/migrations/20260911090000_fix_public_pii_exposure.sql`

Corré esta migración contra tu proyecto de Supabase (`supabase db push` o
pegándola en el SQL Editor) **antes** de desplegar el código nuevo, porque el
código nuevo ya asume que `dni`/`street`/`id_document_url`/`selfie_url` viven
en la tabla `profile_private_data`, no en `profiles`/`pro_details`.

## 2. Archivos modificados por el fix de seguridad

- `src/hooks/useAuth.tsx`
- `src/components/PersonalDataForm.tsx`
- `src/routes/_authenticated/cliente.tsx`
- `src/routes/_authenticated/admin.tsx` (también incluye el fix del guard de admin)
- `src/routes/_authenticated/pro.tsx`
- `src/routes/_authenticated/cuenta.tsx`
- `src/routes/pro.$proId.tsx`
- `src/integrations/supabase/types.ts` (tipos actualizados a mano — ver nota abajo)

## 3. Deploy en Netlify

- `vite.config.ts`
- `netlify.toml`
- `package.json` / `package-lock.json` (agregado `@netlify/vite-plugin-tanstack-start`)
- `public/_redirects` → **este archivo hay que borrarlo** de tu repo, ya no hace falta.

## 4. UI/UX que pediste

- `src/components/BottomNav.tsx` — accesos por rol (cliente / profesional / admin) + fix de posición fija.
- `src/components/SiteHeader.tsx` — fix del salto al hacer scroll rápido.
- `src/styles.css` — `overscroll-behavior-y: none` (misma causa del salto).
- `src/routes/index.tsx` — el cartel de "registrate como profesional" ya no aparece para profesionales/admin.
- `src/components/SiteFooter.tsx` — links a Términos y Privacidad.
- `src/routes/_authenticated/cuenta.tsx` — esos mismos links, que antes apuntaban mal a `/como-funciona`.

## 5. Archivos nuevos — legales

- `src/routes/terminos.tsx`
- `src/routes/privacidad.tsx`

Buscá `[COMPLETAR: ...]` en ambos y completá razón social, CUIT, domicilio y
email de contacto antes de publicarlos.

## 6. `src/routeTree.gen.ts`

Ya lo regeneré yo corriendo el build una vez, así que ya incluye `/terminos` y
`/privacidad`. Si tu repo tiene un `routeTree.gen.ts` distinto (por commits
posteriores a cuando armé este export), dejá que se regenere solo la próxima
vez que corras `npm run dev` o `npm run build` — no hace falta que copies el mío.

## Pendiente de tu lado

1. **Regenerar los tipos de Supabase de verdad** una vez que la migración esté
   aplicada en tu proyecto real (los edité a mano para que compile, pero lo
   correcto es que salgan del CLI):
   ```bash
   npx supabase gen types typescript --project-id TU_PROJECT_REF > src/integrations/supabase/types.ts
   ```
2. Completar los placeholders de `terminos.tsx` y `privacidad.tsx`.
3. (Recomendado, no urgente) revisar si querés restringir también
   `profiles.phone` — quedó público a propósito porque lo usan cliente y
   profesional para contactarse una vez que hay un trabajo en curso; ver la
   nota al final de la migración SQL.
