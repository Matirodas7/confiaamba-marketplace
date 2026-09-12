-- El admin ya tenía infraestructura para configurar la comisión
-- (platform_settings.default_commission_percent, con overrides por
-- categoría), pero el valor por defecto quedó en 10% cuando se creó esa
-- tabla y todavía no se usaba en ningún lado del lado del cliente. Arranca
-- en 20%, como se pidió; se puede seguir ajustando desde el panel de admin
-- sin tocar código.
UPDATE public.platform_settings SET default_commission_percent = 20.00 WHERE id = true;
