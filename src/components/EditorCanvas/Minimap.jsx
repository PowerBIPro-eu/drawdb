import { useMemo, useRef } from "react";
import { useDiagram, useAreas, useNotes, useCanvas, useTransform, useSettings } from "../../hooks";
import { getTableHeight } from "../../utils/utils";
import {
  tableFieldHeight,
  tableHeaderHeight,
  tableFieldHeightDetailed,
  tableHeaderHeightDetailed,
  noteWidth,
} from "../../data/constants";

export default function Minimap() {
  const { tables, relationships } = useDiagram();
  const { areas } = useAreas();
  const { notes } = useNotes();
  const { canvas: { viewBox } } = useCanvas();
  const { setTransform } = useTransform();
  const { settings } = useSettings();
  const svgRef = useRef(null);

  const rowHeight = settings.showDetailedView
    ? tableFieldHeightDetailed
    : tableFieldHeight;
  const headerHeight = settings.showDetailedView
    ? tableHeaderHeightDetailed
    : tableHeaderHeight;

  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const updateBounds = (x, y, w, h) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    };

    tables.forEach((t) => {
      const w = t.width ?? settings.tableWidth;
      const h = getTableHeight(t, relationships, rowHeight, headerHeight);
      updateBounds(t.x, t.y, w, h);
    });

    areas.forEach((a) => {
      updateBounds(a.x, a.y, a.width, a.height);
    });

    notes.forEach((n) => {
      const w = n.width ?? noteWidth;
      const h = n.height;
      updateBounds(n.x, n.y, w, h);
    });

    if (minX === Infinity) return { x: 0, y: 0, width: 1000, height: 1000 };

    const padding = 100;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [tables, areas, notes, relationships, settings.tableWidth, rowHeight, headerHeight]);

  const handlePointerDown = (e) => {
    if (!svgRef.current) return;
    
    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
    
    setTransform((prev) => ({
      ...prev,
      pan: { x: svgPoint.x, y: svgPoint.y },
    }));
  };

  // If diagram is empty, don't show minimap
  if (tables.length === 0 && areas.length === 0 && notes.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[240px] h-[160px] bg-white/90 dark:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-600 rounded-lg shadow-lg overflow-hidden z-50">
      <svg
        ref={svgRef}
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
        className="w-full h-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background for the map area */}
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="transparent" />

        {areas.map((a) => (
          <rect
            key={a.id}
            x={a.x}
            y={a.y}
            width={a.width}
            height={a.height}
            fill={a.color}
            opacity={0.3}
          />
        ))}

        {tables.map((t) => (
          <rect
            key={t.id}
            x={t.x}
            y={t.y}
            width={t.width ?? settings.tableWidth}
            height={getTableHeight(t, relationships, rowHeight, headerHeight)}
            fill={t.color}
            opacity={0.8}
            rx={4}
          />
        ))}

        {notes.map((n) => (
          <rect
            key={n.id}
            x={n.x}
            y={n.y}
            width={n.width ?? noteWidth}
            height={n.height}
            fill={n.color}
            opacity={0.8}
          />
        ))}

        {/* Viewport Indicator */}
        <rect
          x={viewBox.left}
          y={viewBox.top}
          width={viewBox.width}
          height={viewBox.height}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgb(59, 130, 246)"
          strokeWidth={Math.max(bounds.width, bounds.height) / 100}
        />
      </svg>
    </div>
  );
}
