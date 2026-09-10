import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type PersonalData = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  location: string | null;
  dni: string | null;
  street: string | null;
  street_number: string | null;
  floor: string | null;
  apartment: string | null;
};

/** Formulario de datos personales, idéntico para cliente y profesional. */
export function PersonalDataForm({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: PersonalData | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="trust-card p-6">
      <h2 className="font-display text-xl font-bold">Datos personales</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Se usan para identificarte ante la otra parte y coordinar el trabajo.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setSaving(true);
          const { error } = await supabase
            .from("profiles")
            .update({
              first_name: String(fd.get("first_name")),
              last_name: String(fd.get("last_name")),
              phone: String(fd.get("phone")) || null,
              location: String(fd.get("location")) || null,
              dni: String(fd.get("dni")) || null,
              street: String(fd.get("street")) || null,
              street_number: String(fd.get("street_number")) || null,
              floor: String(fd.get("floor")) || null,
              apartment: String(fd.get("apartment")) || null,
            })
            .eq("id", userId);
          setSaving(false);
          if (error) {
            toast.error("No se pudo guardar");
            return;
          }
          toast.success("Datos guardados");
          onSaved();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">Nombre</Label>
            <Input id="first_name" name="first_name" defaultValue={profile?.first_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Apellido</Label>
            <Input id="last_name" name="last_name" defaultValue={profile?.last_name ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+54 11 ..."
              defaultValue={profile?.phone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" name="dni" placeholder="Sin puntos" defaultValue={profile?.dni ?? ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Barrio / Localidad</Label>
          <Input id="location" name="location" defaultValue={profile?.location ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="street">Calle</Label>
            <Input id="street" name="street" defaultValue={profile?.street ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street_number">Número</Label>
            <Input
              id="street_number"
              name="street_number"
              defaultValue={profile?.street_number ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="floor">Piso (opcional)</Label>
            <Input id="floor" name="floor" defaultValue={profile?.floor ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apartment">Depto (opcional)</Label>
            <Input id="apartment" name="apartment" defaultValue={profile?.apartment ?? ""} />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />} Guardar datos
        </Button>
      </form>
    </div>
  );
}
