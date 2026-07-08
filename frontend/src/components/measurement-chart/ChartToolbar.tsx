import { Download, FileDown, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartToolbarProps {
  canExport: boolean;
  isFullscreen: boolean;
  onExportCsv: () => void;
  onExportPng: () => void;
  onFullscreen: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ChartToolbar({
  canExport,
  isFullscreen,
  onExportCsv,
  onExportPng,
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
      <Button type="button" variant="outline" size="sm" onClick={onExportPng} disabled={!canExport}>
        <Download className="h-4 w-4" aria-hidden="true" />
        PNG
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onExportCsv} disabled={!canExport}>
        <FileDown className="h-4 w-4" aria-hidden="true" />
        CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onFullscreen}>
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </Button>
    </div>
  );
}
