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
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button type="button" variant="outline" size="sm" onClick={onZoomIn} className="justify-center">
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Zoom in</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onZoomOut} className="justify-center">
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Zoom out</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPanLeft} disabled={!canPan} className="justify-center">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Scroll left</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPanRight} disabled={!canPan} className="justify-center">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Scroll right</span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onResetZoom} className="justify-center">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Reset</span>
      </Button>
      <ActionIconButton action="csv" label="Download CSV" showLabel onClick={onExportCsv} disabled={!canExport} />
      <Button type="button" variant="outline" size="sm" onClick={onFullscreen} className="justify-center">
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
      </Button>
    </div>
  );
}
