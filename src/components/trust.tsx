import { BadgeCheck, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-verified/12 px-2 py-0.5 text-xs font-semibold text-verified",
        className,
      )}
    >
      <BadgeCheck className="size-3.5" /> Profesional verificado
    </span>
  );
}

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-featured/20 px-2 py-0.5 text-xs font-semibold text-featured-foreground",
        className,
      )}
    >
      <Crown className="size-3.5" /> Destacado
    </span>
  );
}

export function StarRating({
  value,
  count,
  size = 16,
  onClick,
}: {
  value: number;
  count?: number;
  size?: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={
              i <= Math.round(value) ? "fill-featured text-featured" : "text-muted-foreground/40"
            }
          />
        ))}
      </span>
      <span className="text-sm font-medium">{value ? value.toFixed(1) : "Nuevo"}</span>
      {count !== undefined && (
        <span className="text-sm text-muted-foreground underline-offset-2 group-hover:underline">
          ({count})
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center gap-1 rounded-md transition-opacity hover:opacity-80"
        aria-label="Ver reseñas"
      >
        {content}
      </button>
    );
  }

  return <span className="inline-flex items-center gap-1">{content}</span>;
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} estrellas`}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "size-7",
              i <= value ? "fill-featured text-featured" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
export type ReviewWithReviewer = {
  id: string;
  stars: number;
  comment: string;
  created_at: string;
  reviewer_name: string;
};

export function ReviewsModal({
  open,
  onOpenChange,
  proName,
  reviews,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proName: string;
  reviews: ReviewWithReviewer[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reseñas de {proName}</DialogTitle>
        </DialogHeader>
        {reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no tiene reseñas publicadas.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.reviewer_name}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </span>
                </div>
                <StarRating value={r.stars} size={14} />
                {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}