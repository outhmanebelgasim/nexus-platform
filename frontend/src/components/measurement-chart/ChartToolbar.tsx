import { ArrowLeft, ArrowRight, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { Button } from "@/components/ui/button";

interface ChartToolbarProps {
  canExport: boolean;
  isFullscreen: boolean;
  onExportCsv: () => void;
  onFullscreen: () => void;
  onResetZoom: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canPan: boolean;
}

export function ChartToolbar({
  canExport,
  isFullscreen,
  onExportCsv,
  onFullscreen,
  onPanLeft,
  onPanRight,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  canPan,
}: ChartToolbarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Chart controls">
      <Button type="button" variant="outline" size="sm" onClick={onZoomIn} className="min-h-10 justify-center" aria-label="Zoom in">
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
        <span>Zoom in</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onZoomOut} className="min-h-10 justify-center" aria-label="Zoom out">
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
        <span>Zoom out</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPanLeft} disabled={!canPan} className="min-h-10 justify-center" aria-label="Scroll left">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Left</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPanRight} disabled={!canPan} className="min-h-10 justify-center" aria-label="Scroll right">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <span>Right</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onResetZoom} className="min-h-10 justify-center" aria-label="Reset chart view">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        <span>Reset</span>
      </Button>
      <ActionIconButton action="csv" label="Download CSV" showLabel onClick={onExportCsv} disabled={!canExport} />
      <Button type="button" variant="outline" size="sm" onClick={onFullscreen} className="min-h-10 justify-center" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        <span>{isFullscreen ? "Exit" : "Full"}</span>
      </Button>
    </div>
  );
}
