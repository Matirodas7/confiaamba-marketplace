import { formatARS } from "@/lib/marketplace";

export type JobReceiptData = {
  requestId: string;
  category: string;
  description: string;
  address: string;
  zone: string;
  createdAt: string;
  scheduledAt: string | null;
  price: number;
  status: string;
  statusLabel: string;
  isPaid: boolean;
  paidAt: string | null;
  clientName: string;
  proName: string;
};

function fmtDate(iso: string | null, withTime = false) {
  if (!iso) return "Sin definir";
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" } : {}),
  });
}

/** Genera un comprobante en HTML (imprimible / exportable a PDF desde el navegador) y dispara su descarga. */
export function downloadJobReceipt(data: JobReceiptData) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Comprobante ${data.requestId.slice(0, 8)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 40px auto; color: #1a1a1a; padding: 0 20px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .muted { color: #6b7280; font-size: 13px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-top: 20px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: #6b7280; }
  .value { font-weight: 600; text-align: right; max-width: 60%; }
  .total { font-size: 22px; font-weight: 700; margin-top: 16px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #ecfdf5; color: #047857; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>ConfiaAMBA</h1>
  <p class="muted">Comprobante de trabajo · Nº ${data.requestId.slice(0, 8).toUpperCase()}</p>

  <div class="card">
    <div class="row"><span class="label">Categoría</span><span class="value">${data.category}</span></div>
    <div class="row"><span class="label">Descripción</span><span class="value">${data.description}</span></div>
    <div class="row"><span class="label">Dirección</span><span class="value">${data.address}</span></div>
    <div class="row"><span class="label">Zona</span><span class="value">${data.zone}</span></div>
    <div class="row"><span class="label">Cliente</span><span class="value">${data.clientName}</span></div>
    <div class="row"><span class="label">Profesional</span><span class="value">${data.proName}</span></div>
    <div class="row"><span class="label">Fecha del pedido</span><span class="value">${fmtDate(data.createdAt)}</span></div>
    <div class="row"><span class="label">Fecha del trabajo</span><span class="value">${fmtDate(data.scheduledAt, true)}</span></div>
    <div class="row"><span class="label">Estado</span><span class="value"><span class="badge">${data.statusLabel}</span></span></div>
    <div class="row"><span class="label">Pago</span><span class="value">${data.isPaid ? `Pagado el ${fmtDate(data.paidAt)}` : "Pendiente"}</span></div>
  </div>

  <p class="total">Total: ${formatARS(data.price)}</p>
  <p class="muted" style="margin-top: 32px;">Generado desde ConfiaAMBA el ${new Date().toLocaleString("es-AR")}.</p>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante-${data.requestId.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
