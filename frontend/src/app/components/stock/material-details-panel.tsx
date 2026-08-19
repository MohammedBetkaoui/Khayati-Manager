import {
  Tag,
  Boxes,
  Ruler,
  Palette,
  Layers,
  Coins,
  Wallet,
  Truck,
  Bell,
  History,
  Pencil,
  PackagePlus,
  PackageMinus,
  Link2,
  ClipboardList,
  Circle,
  ArrowUpDown,
  Scissors,
  Package,
  Wrench,
  Disc3,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";
import {
  categoryColors,
  categoryLabels,
  statusColors,
  statusLabels,
  stockText,
  stockStatusOf,
  unitLabels,
  type CategoryId,
  type Material,
} from "../../pages/stock-data";

const categoryIcons: Record<CategoryId, LucideIcon> = {
  fabrics: Layers,
  threads: Disc3,
  buttons: Circle,
  zippers: ArrowUpDown,
  accessories: Scissors,
  packaging: Package,
  tools: Wrench,
};

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${palette.border}` }}>
      <span className="flex items-center gap-2" style={{ color: palette.muted, fontSize: 13 }}>
        <Icon size={16} strokeWidth={1.9} />
        {label}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: palette.text, textAlign: "end" }}>{value}</span>
    </div>
  );
}

export function MaterialDetailsPanel({
  material,
  onClose,
  onEdit,
}: {
  material: Material | null;
  onClose?: () => void;
  onEdit?: (material: Material) => void;
}) {
  const { lang } = useLanguage();
  const t = stockText[lang];

  if (!material) return null;

  const status = stockStatusOf(material);
  const Icon = categoryIcons[material.category];
  const cc = categoryColors[material.category];
  const totalValue = (material.quantity * material.unitPrice).toLocaleString();

  return (
    <div
      className="relative"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        overflow: "hidden",
      }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 transition-colors"
          style={{
            insetInlineEnd: 16,
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: palette.bg,
            border: `1px solid ${palette.border}`,
            color: palette.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
      )}

      {/* Header band */}
      <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center" style={{ backgroundColor: "rgba(18,60,74,0.04)" }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: cc.bg, color: cc.fg }}
        >
          <Icon size={28} strokeWidth={1.9} />
        </div>
        <div className="mt-3" style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>
          {material.name[lang]}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge bg={cc.bg} fg={cc.fg}>
            {categoryLabels[material.category][lang]}
          </Badge>
          <Badge bg={`${statusColors[status]}1f`} fg={statusColors[status]} dot={statusColors[status]}>
            {statusLabels[status][lang]}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-4">
        <Row icon={Tag} label={t.panel.category} value={categoryLabels[material.category][lang]} />
        <Row
          icon={Boxes}
          label={t.panel.quantity}
          value={`${material.quantity} ${unitLabels[material.unit][lang]}`}
        />
        <Row icon={Ruler} label={t.panel.unit} value={unitLabels[material.unit][lang]} />
        {material.color ? (
          <Row
            icon={Palette}
            label={t.panel.color}
            value={
              <span className="inline-flex items-center gap-2">
                {material.colorHex ? (
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 999,
                      backgroundColor: material.colorHex,
                      border: `1px solid ${palette.borderStrong}`,
                    }}
                  />
                ) : null}
                {material.color[lang]}
              </span>
            }
          />
        ) : null}
        <Row icon={Layers} label={t.panel.type} value={material.type[lang]} />
        <Row icon={Coins} label={t.panel.unitPrice} value={`${material.unitPrice} ${t.currency}`} />
        <Row
          icon={Wallet}
          label={t.panel.totalValue}
          value={<span style={{ color: palette.primary }}>{`${totalValue} ${t.currency}`}</span>}
        />
        <Row icon={Truck} label={t.panel.supplier} value={material.supplier} />
        <Row
          icon={Bell}
          label={t.panel.minAlert}
          value={`${material.minAlert} ${unitLabels[material.unit][lang]}`}
        />
        <Row icon={History} label={t.panel.lastMovement} value={material.lastMovement[lang]} />

        {/* Notes */}
        <div className="mt-4">
          <div style={{ color: palette.muted, fontSize: 13, marginBottom: 6 }}>{t.panel.notes}</div>
          <div
            style={{
              backgroundColor: palette.bg,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              padding: "10px 12px",
              fontSize: 13,
              color: palette.text,
              lineHeight: 1.6,
            }}
          >
            {material.notes[lang]}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="primary" full onClick={() => onEdit?.(material)}>
            <Pencil size={16} />
            {t.panel.editMaterial}
          </Button>
          <Button variant="secondary" full>
            <PackagePlus size={16} />
            {t.panel.addQty}
          </Button>
          <Button variant="secondary" full>
            <PackageMinus size={16} />
            {t.panel.removeQty}
          </Button>
          <Button variant="secondary" full>
            <Link2 size={16} />
            {t.panel.linkOrder}
          </Button>
          <div className="col-span-2">
            <Button variant="secondary" full>
              <ClipboardList size={16} />
              {t.panel.viewLog}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
