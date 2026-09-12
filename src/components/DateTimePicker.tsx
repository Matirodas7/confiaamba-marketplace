import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Selector de fecha+hora embebible (sin lógica propia de guardado). */
export function DateTimePicker({
  value,
  onChange,
  label = "Proponer fecha de visita",
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(value ? format12(value) : "09:00");

  function pickDay(day: Date | undefined) {
    if (!day) {
      onChange(undefined);
      return;
    }
    const [h, m] = time.split(":").map(Number);
    const next = new Date(day);
    next.setHours(h ?? 9, m ?? 0, 0, 0);
    onChange(next);
  }

  function pickTime(t: string) {
    setTime(t);
    if (!value) return;
    const [h, m] = t.split(":").map(Number);
    const next = new Date(value);
    next.setHours(h ?? 9, m ?? 0, 0, 0);
    onChange(next);
  }

  function format12(d: Date) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <CalendarClock className="size-3.5" />
          {value
            ? value.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
            : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-3 p-3">
        <Calendar
          mode="single"
          selected={value}
          onSelect={pickDay}
          disabled={{ before: new Date() }}
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="sched-time" className="text-xs">
            Hora
          </Label>
          <Input
            id="sched-time"
            type="time"
            value={time}
            onChange={(e) => pickTime(e.target.value)}
            className="h-8 w-28"
          />
        </div>
        {value && (
          <Button size="sm" variant="ghost" className="w-full" onClick={() => onChange(undefined)}>
            Quitar fecha
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}