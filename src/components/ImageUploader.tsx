import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/marketplace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = { path: string; url: string; name: string };

/**
 * Componente reutilizable para subir una o varias imágenes (o PDFs, si
 * `accept` lo permite) a un bucket de Supabase Storage, con previsualización
 * y borrado individual. Controlado: el padre mantiene la lista de archivos
 * ya subidos (`value`) y recibe los cambios por `onChange`.
 */
export function ImageUploader({
  bucket,
  folder,
  isPublic,
  value,
  onChange,
  maxFiles = 10,
  accept = "image/png,image/jpeg,image/webp",
  label = "Subir fotos",
  helpText,
  multiple = true,
  square = false,
}: {
  bucket: string;
  folder: string;
  isPublic: boolean;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
  helpText?: string;
  multiple?: boolean;
  square?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const remaining = maxFiles - value.length;
    if (remaining <= 0) {
      toast.error(`Ya alcanzaste el máximo de ${maxFiles} archivo${maxFiles === 1 ? "" : "s"}.`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > toUpload.length) {
      toast.info(`Solo se subirán ${toUpload.length} de ${files.length} (máximo ${maxFiles}).`);
    }

    setUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" pesa más de 10MB y no se subió.`);
        continue;
      }
      try {
        const { path, url } = await uploadToBucket({
          supabase,
          bucket,
          folder,
          file,
          isPublic,
        });
        uploaded.push({ path, url, name: file.name });
      } catch {
        toast.error(`No pudimos subir "${file.name}".`);
      }
    }
    setUploading(false);
    if (uploaded.length > 0) {
      onChange([...value, ...uploaded]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(item: UploadedFile) {
    onChange(value.filter((f) => f.path !== item.path));
    // Best-effort: intentamos borrar del bucket, sin bloquear la UI si falla.
    supabase.storage
      .from(bucket)
      .remove([item.path])
      .catch(() => {});
  }

  const isImage = accept.includes("image");

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "grid gap-3",
          square ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {value.map((item) => (
          <div
            key={item.path}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface"
          >
            {isImage ? (
              <img src={item.url} alt={item.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <span className="line-clamp-2 text-xs text-muted-foreground">{item.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => remove(item)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Quitar ${item.name}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span className="text-xs font-medium">{uploading ? "Subiendo..." : label}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-xs text-muted-foreground">
        {helpText ?? `Hasta ${maxFiles} archivos. Máx. 10MB cada uno.`} {value.length}/{maxFiles}
      </p>
    </div>
  );
}
