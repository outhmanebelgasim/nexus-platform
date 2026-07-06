import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Farm, FarmPayload } from "@/types/farm";

const farmSchema = z.object({
  name: z.string().trim().min(1, "Farm name is required").max(150, "Farm name must be 150 characters or less"),
  location: z.string().trim().max(255, "Location must be 255 characters or less").optional(),
  description: z.string().trim().optional(),
  googleMapsUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), "Enter a valid URL"),
});

type FarmFormValues = z.infer<typeof farmSchema>;

interface FarmFormProps {
  farm?: Farm | null;
  isSaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (payload: FarmPayload) => Promise<void>;
}

function emptyToNull(value?: string) {
  return value && value.length > 0 ? value : null;
}

export function FarmForm({ farm, isSaving, error, onCancel, onSubmit }: FarmFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FarmFormValues>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: farm?.name ?? "",
      location: farm?.location ?? "",
      description: farm?.description ?? "",
      googleMapsUrl: farm?.googleMapsUrl ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: farm?.name ?? "",
      location: farm?.location ?? "",
      description: farm?.description ?? "",
      googleMapsUrl: farm?.googleMapsUrl ?? "",
    });
  }, [farm, reset]);

  const submitForm = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      location: emptyToNull(values.location),
      description: emptyToNull(values.description),
      googleMapsUrl: emptyToNull(values.googleMapsUrl),
    });
  });

  return (
    <form className="space-y-4" onSubmit={submitForm}>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Farm name</Label>
        <Input id="name" placeholder="North field farm" {...register("name")} />
        {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" placeholder="Province, region, or GPS reference" {...register("location")} />
        {errors.location ? <p className="text-sm text-destructive">{errors.location.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
        <Input id="googleMapsUrl" placeholder="https://maps.google.com/..." {...register("googleMapsUrl")} />
        {errors.googleMapsUrl ? (
          <p className="text-sm text-destructive">{errors.googleMapsUrl.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Optional notes about this farm" {...register("description")} />
        {errors.description ? <p className="text-sm text-destructive">{errors.description.message}</p> : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : farm ? "Update farm" : "Create farm"}
        </Button>
      </div>
    </form>
  );
}
