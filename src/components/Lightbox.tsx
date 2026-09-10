import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Visor de foto a pantalla completa. Se cierra al hacer click fuera de la
 * imagen, con la tecla Escape, o con el botón de cerrar.
 *
 * Nota: deliberadamente NO tocamos el historial del navegador acá (nada de
 * pushState/popstate). TanStack Router también escucha popstate para la
 * navegación de la SPA, y combinarlo con manipulación manual del historial
 * generaba una carrera de eventos que cerraba el visor apenas se abría.
 */
export function Lightbox({
  src,
  alt = "Imagen ampliada",
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Cerrar"
      >
        <X className="size-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
