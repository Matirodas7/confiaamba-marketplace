import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ReasonDialog({
  trigger,
  title,
  reasons,
  onConfirm,
  confirmLabel = "Confirmar",
  destructive = false,
}: {
  trigger: React.ReactNode;
  title: string;
  reasons: { value: string; label: string }[];
  onConfirm: (reason: string, note: string) => void | Promise<void>;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const needsNote = reason === "otro";

  async function confirm() {
    if (!reason) return;
    setSaving(true);
    await onConfirm(reason, note);
    setSaving(false);
    setOpen(false);
    setReason("");
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
          {reasons.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
              {r.label}
            </label>
          ))}
        </RadioGroup>
        {needsNote && (
          <div className="space-y-1.5">
            <Label htmlFor="reason-note">Contanos un poco más</Label>
            <Textarea
              id="reason-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describí el motivo"
            />
          </div>
        )}
        <Button
          onClick={confirm}
          disabled={!reason || (needsNote && !note.trim()) || saving}
          variant={destructive ? "destructive" : "default"}
        >
          {confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
