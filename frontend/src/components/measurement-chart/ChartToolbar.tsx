import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { Button } from "@/components/ui/button";

interface ChartToolbarProps {
  canExport: boolean;
  isFullscreen: boolean;
  onExportCsv: () => void;
  onFullscreen: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ChartToolbar({
  canExport,
  isFullscreen,
  onExportCsv,
  onFullscreen,
  onResetZoom,
  onZoomIn,
  onZoomOut,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
        Zoom in
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
        Zoom out
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onResetZoom}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reset zoom
      </Button>
      <ActionIconButton action="csv" label="Download CSV" showLabel onClick={onExportCsv} disabled={!canExport} />
      <Button type="button" variant="outline" size="sm" onClick={onFullscreen}>
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </Button>
    </div>
  );
}
