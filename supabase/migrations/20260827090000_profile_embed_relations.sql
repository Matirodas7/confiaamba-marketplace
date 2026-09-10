-- =========================================================================
-- Relaciones adicionales hacia `profiles` para que PostgREST pueda
-- "embeber" el perfil directamente en la misma consulta (join implícito)
-- en vez de tener que hacer una segunda ida y vuelta a la base para
-- resolver nombre/teléfono/avatar. Las columnas ya referencian
-- auth.users(id) — esto agrega una SEGUNDA FK a profiles(id) sobre las
-- mismas columnas (Postgres permite múltiples FKs por columna), sin tocar
-- la original. Es seguro: todo client_id/pro_id válido en auth.users ya
-- tiene su fila en profiles gracias al trigger de alta + el backfill de la
-- migración de datos personales.
-- =========================================================================
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_client_profile_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_target_pro_profile_fkey
  FOREIGN KEY (target_pro_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_pro_profile_fkey
  FOREIGN KEY (pro_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_client_profile_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pro_details
  ADD CONSTRAINT pro_details_pro_profile_fkey
  FOREIGN KEY (pro_id) REFERENCES public.profiles(id) ON DELETE CASCADE;