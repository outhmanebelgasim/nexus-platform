import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MeasurementSelectorProps {
  measurementTypes: string[];
  selectedTypes: string[];
  onChange: (measurementTypes: string[]) => void;
}

export function MeasurementSelector({ measurementTypes, selectedTypes, onChange }: MeasurementSelectorProps) {
  const selected = new Set(selectedTypes);

  const toggleType = (measurementType: string) => {
    if (selected.has(measurementType)) {
      onChange(selectedTypes.filter((item) => item !== measurementType));
      return;
    }

    onChange([...selectedTypes, measurementType]);
  };

  if (measurementTypes.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No measurement types are available from the current variable inventory.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {measurementTypes.map((measurementType) => {
        const isSelected = selected.has(measurementType);
        return (
          <button
            key={measurementType}
            type="button"
            className={cn(
              "flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50",
              isSelected && "border-primary bg-primary/5 text-primary",
            )}
            onClick={() => toggleType(measurementType)}
            aria-pressed={isSelected}
          >
            <span>{measurementType}</span>
            {isSelected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
          </button>
        );
      })}
      {selectedTypes.length > 0 ? (
        <Button className="justify-self-start" type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          Clear selected measurements
        </Button>
      ) : null}
    </div>
  );
}
