import { useEffect, useRef } from "react";
import { availableNodes, type MapNode, type RunState } from "../run";
import { useTranslation } from "../i18n";
import { nodeImage } from "./assetImages";

const NODE_ICON: Record<MapNode["type"], string> = {
  combat: "⚔",
  elite: "💀",
  rest: "🔥",
  treasure: "💎",
  shop: "🛒",
  event: "❓",
  boss: "👑",
};

/** The map screen: rows of nodes, with the next row selectable. */
export function MapView({
  run,
  onSelect,
}: {
  run: RunState;
  onSelect: (nodeId: string) => void;
}) {
  const { t } = useTranslation();
  const selectable = new Set(
    availableNodes(run.map, run.currentRow).map((n) => n.id),
  );

  // Scroll the currently selectable row into view (the map starts scrolled to
  // the boss at the top, so on entry / after each pick we jump to the choices).
  const activeRow = run.currentRow + 1;
  const activeRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeRow]);

  return (
    <div className="map">
      <h2>{t("run.mapTitle")}</h2>
      {run.notice && (
        <div className="notice">{t(run.notice.key, run.notice.params)}</div>
      )}

      <div className="map-rows">
        {run.map.rows.map((row, r) => (
          <div key={r} className="map-row" ref={r === activeRow ? activeRowRef : undefined}>
            {row.map((node) => {
              const isSelectable = selectable.has(node.id);
              const isVisited = run.visited.includes(node.id);
              return (
                <button
                  key={node.id}
                  className={`map-node node-${node.type} ${isSelectable ? "selectable" : ""} ${isVisited ? "visited" : ""}`}
                  disabled={!isSelectable}
                  onClick={() => onSelect(node.id)}
                  title={t(`node.${node.type}`)}
                >
                  {nodeImage(node.type) ? (
                    <img className="node-img" src={nodeImage(node.type)} alt="" />
                  ) : (
                    <span className="node-icon">{NODE_ICON[node.type]}</span>
                  )}
                  <span className="node-label">{t(`node.${node.type}`)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
