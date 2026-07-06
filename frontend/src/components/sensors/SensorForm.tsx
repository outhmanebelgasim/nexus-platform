import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Sensor, SensorPayload, SensorStatus } from "@/types/sensor";
import type { Station } from "@/types/station";

const sensorStatuses = ["ACTIVE", "INACTIVE", "FAULTY", "MAINTENANCE"] as const satisfies readonly SensorStatus[];

const sensorSchema = z.object({
  stationId: z.string().refine((value) => Number(value) > 0, "Select a station"),
  code: z.string().trim().min(1, "Sensor code is required").max(150, "Sensor code must be 150 characters or less"),
  name: z.string().trim().max(150, "Sensor name must be 150 characters or less").optional(),
  sensorType: z.string().trim().min(1, "Sensor type is required").max(80, "Sensor type must be 80 characters or less"),
  unit: z.string().trim().max(30, "Unit must be 30 characters or less").optional(),
  depthCm: z.string().refine((value) => {
    if (value.trim() === "") {
      return true;
    }

    return Number.isInteger(Number(value));
  }, "Depth must be a whole number"),
  status: z.enum(sensorStatuses),
  metadata: z.string().trim().optional(),
});

type SensorFormValues = z.infer<typeof sensorSchema>;

interface SensorFormProps {
  sensor?: Sensor | null;
  stations: Station[];
  isSaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (payload: SensorPayload) => Promise<void>;
}

function emptyToNull(value?: string) {
  return value && value.length > 0 ? value : null;
}

function numberOrNull(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function SensorForm({ sensor, stations, isSaving, error, onCancel, onSubmit }: SensorFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SensorFormValues>({
    resolver: zodResolver(sensorSchema),
    defaultValues: {
      stationId: String(sensor?.stationId ?? stations[0]?.id ?? 0),
      code: sensor?.code ?? "",
      name: sensor?.name ?? "",
      sensorType: sensor?.sensorType ?? "",
      unit: sensor?.unit ?? "",
      depthCm: sensor?.depthCm == null ? "" : String(sensor.depthCm),
      status: sensor?.status ?? "ACTIVE",
      metadata: sensor?.metadata ?? "",
    },
  });

  useEffect(() => {
    reset({
      stationId: String(sensor?.stationId ?? stations[0]?.id ?? 0),
      code: sensor?.code ?? "",
      name: sensor?.name ?? "",
      sensorType: sensor?.sensorType ?? "",
      unit: sensor?.unit ?? "",
      depthCm: sensor?.depthCm == null ? "" : String(sensor.depthCm),
      status: sensor?.status ?? "ACTIVE",
      metadata: sensor?.metadata ?? "",
    });
  }, [stations, sensor, reset]);

  const submitForm = handleSubmit(async (values) => {
    await onSubmit({
      stationId: Number(values.stationId),
      code: values.code,
      name: emptyToNull(values.name),
      sensorType: values.sensorType,
      unit: emptyToNull(values.unit),
      depthCm: numberOrNull(values.depthCm),
      status: values.status,
      metadata: emptyToNull(values.metadata),
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
          <Label htmlFor="stationId">Station</Label>
          <Select id="stationId" disabled={isSaving || stations.length === 0} {...register("stationId")}>
            <option value={0}>Select station</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} ({station.code})
              </option>
            ))}
          </Select>
          {errors.stationId ? <p className="text-sm text-destructive">{errors.stationId.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" disabled={isSaving} {...register("status")}>
            {sensorStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Sensor code</Label>
          <Input id="code" placeholder="SOIL-T-01" {...register("code")} />
          {errors.code ? <p className="text-sm text-destructive">{errors.code.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Sensor name</Label>
          <Input id="name" placeholder="Soil temperature probe" {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="sensorType">Sensor type</Label>
          <Input id="sensorType" placeholder="Temperature" {...register("sensorType")} />
          {errors.sensorType ? <p className="text-sm text-destructive">{errors.sensorType.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" placeholder="C, %, mm" {...register("unit")} />
          {errors.unit ? <p className="text-sm text-destructive">{errors.unit.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="depthCm">Depth cm</Label>
          <Input id="depthCm" type="number" placeholder="30" {...register("depthCm")} />
          {errors.depthCm ? <p className="text-sm text-destructive">{errors.depthCm.message}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metadata">Metadata</Label>
        <Textarea id="metadata" placeholder="Optional calibration notes or JSON metadata" {...register("metadata")} />
        {errors.metadata ? <p className="text-sm text-destructive">{errors.metadata.message}</p> : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || stations.length === 0}>
          {isSaving ? "Saving..." : sensor ? "Update sensor" : "Create sensor"}
        </Button>
      </div>
    </form>
  );
}
