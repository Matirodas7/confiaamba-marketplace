export const ZONES = ["CABA", "Norte", "Sur", "Oeste"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABELS: Record<Zone, string> = {
  CABA: "CABA (Ciudad de Buenos Aires)",
  Norte: "GBA Norte",
  Sur: "GBA Sur",
  Oeste: "GBA Oeste",
};

export const NEIGHBORHOODS: Record<Zone, string[]> = {
  CABA: ["Palermo", "Belgrano", "Caballito", "Recoleta", "Villa Urquiza", "Flores"],
  Norte: ["Vicente López", "San Isidro", "Tigre", "San Fernando", "Martínez", "Olivos"],
  Sur: ["Avellaneda", "Quilmes", "Lomas de Zamora", "Lanús", "Berazategui", "Adrogué"],
  Oeste: ["Morón", "Ramos Mejía", "Ituzaingó", "Castelar", "Haedo", "San Justo"],
};

/**
 * Deduce a qué zona del AMBA pertenece una coordenada, con un límite
 * aproximado por rangos de latitud/longitud (no es geocoding real, no
 * requiere ninguna API paga: solo una regla práctica para AMBA). CABA
 * está aprox. entre -34.53 y -34.70 de latitud y -58.53/-58.335 de
 * longitud; al norte de CABA es zona Norte, al sur zona Sur, y al oeste
 * (más lejos que el límite oeste de CABA) zona Oeste.
 */
export function zoneFromCoords(lat: number, lng: number): Zone {
  if (lat > -34.53) return "Norte";
  if (lat < -34.7) return "Sur";
  if (lng < -58.53) return "Oeste";
  return "CABA";
}

export const CATEGORIES = [
  "Electricidad",
  "Plomería",
  "Gas y calefacción",
  "Aire acondicionado",
  "Albañilería",
  "Pintura",
  "Carpintería",
  "Cerrajería",
  "Mudanzas y fletes",
  "Limpieza profunda",
  "Jardinería",
  "Técnico en PC y redes",
] as const;

// Nombres de íconos de lucide-react (como string) para no forzar JSX en este
// archivo .ts; los componentes que los consumen hacen el mapeo a componente.
export const CATEGORY_ICON_NAMES: Record<string, string> = {
  Electricidad: "Zap",
  Plomería: "Droplets",
  "Gas y calefacción": "Flame",
  "Aire acondicionado": "Wind",
  Albañilería: "Building2",
  Pintura: "PaintRoller",
  Carpintería: "Hammer",
  Cerrajería: "KeyRound",
  "Mudanzas y fletes": "Truck",
  "Limpieza profunda": "Sparkles",
  Jardinería: "Trees",
  "Técnico en PC y redes": "Monitor",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  quoted: "Presupuestado",
  accepted: "En proceso",
  pending_confirmation: "Esperando tu confirmación",
  done: "Finalizado",
  cancelled: "Cancelado",
};

export const STORAGE_BUCKETS = {
  avatars: "avatars",
  requestPhotos: "request-photos",
  chatAttachments: "chat-attachments",
  portfolio: "portfolio",
  proDocuments: "pro-documents",
} as const;

export const MAX_REQUEST_PHOTOS = 10;
export const DEFAULT_COMMISSION_PERCENT = 20;

/**
 * Precio que ve el cliente: el presupuesto del profesional + la comisión de
 * la plataforma. El profesional siempre carga y ve su propio monto (el que
 * realmente cobra); el cliente ve ese monto ya con el margen sumado.
 *
 * `commissionPercent` viene de `platform_settings.default_commission_percent`
 * (o de `category_commission_overrides` si la categoría tiene una comisión
 * particular). Si todavía no se cargó esa configuración, se usa
 * DEFAULT_COMMISSION_PERCENT (20%) como resguardo.
 */
export function priceForClient(
  offeredByPro: number,
  commissionPercent: number = DEFAULT_COMMISSION_PERCENT,
) {
  return Math.round(offeredByPro * (1 + commissionPercent / 100));
}

export function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

/**
 * Sube un archivo a un bucket de Supabase Storage bajo una carpeta dada
 * (por convención, el primer segmento del path es el id que usan las
 * políticas RLS: user_id, request_id, o pro_id según el bucket) y devuelve
 * la URL pública o la ruta privada, según corresponda.
 */
export async function uploadToBucket(params: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  bucket: string;
  folder: string;
  file: File;
  isPublic: boolean;
}): Promise<{ path: string; url: string }> {
  const { supabase, bucket, folder, file, isPublic } = params;
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${folder}/${filename}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  if (isPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 días
  if (signError) throw signError;
  return { path, url: data.signedUrl };
}

export async function getSignedUrl(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60 * 24 * 7,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export const QUOTE_REJECT_REASONS: { value: string; label: string }[] = [
  { value: "precio_alto", label: "El precio es muy alto" },
  { value: "demora", label: "Tardó mucho en responder" },
  { value: "no_cumple", label: "No cumple con lo que necesito" },
  { value: "otra_opcion", label: "Encontré otra opción" },
  { value: "cambie_opinion", label: "Cambié de opinión" },
  { value: "otro", label: "Otro motivo" },
];

export const REQUEST_CANCEL_REASONS: { value: string; label: string }[] = [
  { value: "ya_no_necesito", label: "Ya no necesito el servicio" },
  { value: "resuelto_por_otro", label: "Lo resolví por otro medio" },
  { value: "precio_alto", label: "Los presupuestos son muy caros" },
  { value: "sin_respuestas", label: "No recibí respuestas" },
  { value: "otro", label: "Otro motivo" },
];

export const PRO_DECLINE_REASONS: { value: string; label: string }[] = [
  { value: "fuera_de_zona", label: "No trabajo en esa zona" },
  { value: "agenda_completa", label: "Tengo la agenda completa" },
  { value: "no_es_mi_especialidad", label: "No es mi especialidad" },
  { value: "precio_no_conviene", label: "El presupuesto estimado no me conviene" },
  { value: "otro", label: "Otro motivo" },
];

export const REVIEW_TAGS: string[] = [
  "Excelente servicio",
  "Muy puntual",
  "Buena comunicación",
  "Precio justo",
  "Trabajo prolijo",
  "Lo recomiendo",
  "Tardó en responder",
  "No volvería a contratar",
];

export function reasonLabel(
  list: { value: string; label: string }[],
  value: string | null | undefined,
): string {
  return list.find((r) => r.value === value)?.label ?? value ?? "";
}