import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Farm } from "@/types/farm";
import type { Station, StationPayload, StationStatus } from "@/types/station";

const stationStatuses = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const satisfies readonly StationStatus[];

function optionalNumber(message: string, min?: number, max?: number) {
  return z.string().refine((value) => {
    if (value.trim() === "") {
      return true;
    }

    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return false;
    }

    if (min !== undefined && numberValue < min) {
      return false;
    }

    if (max !== undefined && numberValue > max) {
      return false;
    }

    return true;
  }, message);
}

const stationSchema = z.object({
  farmId: z.string().refine((value) => Number(value) > 0, "Select a farm"),
  name: z.string().trim().min(1, "Station name is required").max(150, "Station name must be 150 characters or less"),
  code: z.string().trim().min(1, "Station code is required").max(100, "Station code must be 100 characters or less"),
  latitude: optionalNumber("Latitude must be a number between -90 and 90", -90, 90),
  longitude: optionalNumber("Longitude must be a number between -180 and 180", -180, 180),
  altitude: optionalNumber("Altitude must be a number"),
  status: z.enum(stationStatuses),
});

type StationFormValues = z.infer<typeof stationSchema>;

interface StationFormProps {
  station?: Station | null;
  farms: Farm[];
  isSaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (payload: StationPayload) => Promise<void>;
}

function numberOrNull(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function StationForm({ station, farms, isSaving, error, onCancel, onSubmit }: StationFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      farmId: String(station?.farmId ?? farms[0]?.id ?? 0),
      name: station?.name ?? "",
      code: station?.code ?? "",
      latitude: station?.latitude == null ? "" : String(station.latitude),
      longitude: station?.longitude == null ? "" : String(station.longitude),
      altitude: station?.altitude == null ? "" : String(station.altitude),
      status: station?.status ?? "ACTIVE",
    },
  });

  useEffect(() => {
    reset({
      farmId: String(station?.farmId ?? farms[0]?.id ?? 0),
      name: station?.name ?? "",
      code: station?.code ?? "",
      latitude: station?.latitude == null ? "" : String(station.latitude),
      longitude: station?.longitude == null ? "" : String(station.longitude),
      altitude: station?.altitude == null ? "" : String(station.altitude),
      status: station?.status ?? "ACTIVE",
    });
  }, [farms, station, reset]);

  const submitForm = handleSubmit(async (values) => {
    await onSubmit({
      farmId: Number(values.farmId),
      name: values.name,
      code: values.code,
      latitude: numberOrNull(values.latitude),
      longitude: numberOrNull(values.longitude),
      altitude: numberOrNull(values.altitude),
      status: values.status,
    });
  });

  return (
    <form className="space-y-4" onSubmit={submitForm}>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="farmId">Farm</Label>
          <Select id="farmId" disabled={isSaving || farms.length === 0} {...register("farmId")}>
            <option value={0}>Select farm</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </Select>
          {errors.farmId ? <p className="text-sm text-destructive">{errors.farmId.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" disabled={isSaving} {...register("status")}>
            {stationStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Station name</Label>
          <Input id="name" placeholder="Main weather station" {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Station code</Label>
          <Input id="code" placeholder="ST-001" {...register("code")} />
          {errors.code ? <p className="text-sm text-destructive">{errors.code.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" type="number" step="any" placeholder="31.6295" {...register("latitude")} />
          {errors.latitude ? <p className="text-sm text-destructive">{errors.latitude.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" type="number" step="any" placeholder="-7.9811" {...register("longitude")} />
          {errors.longitude ? <p className="text-sm text-destructive">{errors.longitude.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="altitude">Altitude</Label>
          <Input id="altitude" type="number" step="any" placeholder="460" {...register("altitude")} />
          {errors.altitude ? <p className="text-sm text-destructive">{errors.altitude.message}</p> : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || farms.length === 0}>
          {isSaving ? "Saving..." : station ? "Update station" : "Save station"}
        </Button>
      </div>
    </form>
  );
}
