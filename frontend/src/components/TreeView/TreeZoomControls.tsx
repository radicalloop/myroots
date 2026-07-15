import { Panel, useReactFlow } from "@xyflow/react";
import { Minus, Plus, Scan } from "lucide-react";

export function TreeZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="bottom-left" className="m-4!">
      <div
        className="tree-zoom-controls flex flex-col overflow-hidden rounded-full border border-border-soft bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
        role="group"
        aria-label="Zoom controls"
      >
        <button
          type="button"
          className="tree-zoom-controls__btn"
          aria-label="Zoom in"
          onClick={() => zoomIn({ duration: 200 })}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="tree-zoom-controls__btn"
          aria-label="Zoom out"
          onClick={() => zoomOut({ duration: 200 })}
        >
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="tree-zoom-controls__btn"
          aria-label="Fit to view"
          onClick={() => fitView({ padding: 0.18, duration: 300 })}
        >
          <Scan className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </Panel>
  );
}
