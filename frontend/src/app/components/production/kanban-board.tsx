import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GripVertical } from "lucide-react";
import { palette, prodText, stageOrder, stageLabels, stageColors } from "../../pages/production-data";
import type { Order, StageId } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { OrderCard } from "./order-card";

const DRAG_TYPE = "ORDER_CARD";
type DragItem = { id: string; fromStage: StageId };

function DraggableCard({
  order,
  selected,
  onSelect,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DRAG_TYPE,
      item: { id: order.id, fromStage: order.stage } as DragItem,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [order.id, order.stage],
  );

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className="group/card relative"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: "grab", touchAction: "none" }}
    >
      {/* Drag affordance, appears on hover */}
      <span
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/card:opacity-100"
        style={{ insetInlineEnd: 4, color: palette.borderStrong }}
      >
        <GripVertical size={15} />
      </span>
      <OrderCard order={order} selected={selected} onSelect={onSelect} />
    </div>
  );
}

function Column({
  stage,
  list,
  selectedId,
  onSelect,
  onMove,
}: {
  stage: StageId;
  list: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, stage: StageId) => void;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const accent = stageColors[stage];

  const [{ isOver, canDrop }, dropRef] = useDrop(
    () => ({
      accept: DRAG_TYPE,
      canDrop: (item: DragItem) => item.fromStage !== stage,
      drop: (item: DragItem) => onMove(item.id, stage),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [stage, onMove],
  );

  const active = isOver && canDrop;

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className="flex flex-col transition-colors"
      style={{
        flex: "1 1 0",
        minWidth: 172,
        backgroundColor: active ? `${accent}10` : palette.bg,
        borderRadius: 16,
        border: `1.5px solid ${active ? accent : palette.border}`,
        maxHeight: 640,
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-3"
        style={{ borderBottom: `1px solid ${palette.border}` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{stageLabels[stage][lang]}</span>
        </div>
        <span
          className="flex items-center justify-center"
          style={{
            minWidth: 22,
            height: 20,
            padding: "0 6px",
            borderRadius: 999,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            fontSize: 11.5,
            fontWeight: 700,
            color: palette.muted,
          }}
        >
          {list.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 overflow-y-auto p-2.5" style={{ flex: 1 }}>
        {list.length === 0 ? (
          <div
            className="flex items-center justify-center text-center transition-colors"
            style={{
              minHeight: 76,
              borderRadius: 12,
              border: `1px dashed ${active ? accent : palette.borderStrong}`,
              fontSize: 12,
              color: active ? accent : palette.muted,
              padding: 10,
            }}
          >
            {active ? (lang === "ar" ? "أفلت هنا" : "Déposer ici") : t.emptyColumn}
          </div>
        ) : (
          list.map((order) => (
            <DraggableCard
              key={order.id}
              order={order}
              selected={order.id === selectedId}
              onSelect={() => onSelect(order.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  orders,
  selectedId,
  onSelect,
  onMove,
}: {
  orders: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, stage: StageId) => void;
}) {
  const byStage = (stage: StageId) => orders.filter((o) => o.stage === stage);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3.5" style={{ minWidth: 1040 }}>
          {stageOrder.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              list={byStage(stage)}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}
