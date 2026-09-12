import { Download, Eye, MapPin, CalendarClock, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatARS } from "@/lib/marketplace";
import { downloadJobReceipt, type JobReceiptData } from "@/lib/receipt";

export function JobDetailDialog({
  data,
  triggerLabel = "Ver detalle",
}: {
  data: JobReceiptData;
  triggerLabel?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="size-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data.category}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge>{data.statusLabel}</Badge>
          <Badge
            variant={data.isPaid ? "default" : "outline"}
            className={data.isPaid ? "bg-verified text-verified-foreground" : ""}
          >
            {data.isPaid ? "Pagado" : "Pago pendiente"}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{data.description}</p>

        <dl className="divide-y divide-border rounded-xl border border-border text-sm">
          <div className="flex items-start justify-between gap-3 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" /> Dirección
            </dt>
            <dd className="text-right font-medium">{data.address}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="size-4" /> Fecha del trabajo
            </dt>
            <dd className="text-right font-medium">
              {data.scheduledAt
                ? new Date(data.scheduledAt).toLocaleString("es-AR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })
                : "Sin definir"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="size-4" /> Cliente / Profesional
            </dt>
            <dd className="text-right font-medium">
              {data.clientName} · {data.proName}
            </dd>
          </div>
        </dl>

        <p className="text-right font-display text-2xl font-bold">{formatARS(data.price)}</p>

        <Button variant="outline" onClick={() => downloadJobReceipt(data)}>
          <Download className="size-4" /> Descargar comprobante
        </Button>
      </DialogContent>
    </Dialog>
  );
}