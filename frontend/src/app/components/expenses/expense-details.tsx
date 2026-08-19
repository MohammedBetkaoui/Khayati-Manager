import { Printer, Edit, RefreshCw, Link2, FileText, Settings, Coins } from "lucide-react";
import { palette, expensesText, categoryLabels, typeLabels, methodLabels, linkLabels, typeColors, methodColors } from "../../pages/expenses-data";
import type { ExpenseRecord } from "../../pages/expenses-data";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";

export function ExpenseDetailsPanel({
  record,
}: {
  record: ExpenseRecord | null;
}) {
  const { lang, dir } = useLanguage();
  const t = expensesText[lang].preview;
  const cur = expensesText[lang].currency;

  if (!record) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center text-center p-8"
        style={{ color: palette.muted }}
      >
        <FileText size={48} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 16 }} />
        <p>{t.empty}</p>
      </div>
    );
  }

  const mColor = methodColors[record.paymentMethod];
  const tColor = typeColors[record.type];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Detail Card */}
      <div
        style={{
          backgroundColor: palette.surface,
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          padding: 20,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(18,60,74,0.06)", color: palette.primary }}
          >
            <Coins size={22} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{record.name[lang]}</div>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ fontSize: 12, color: palette.muted }}>{categoryLabels[record.category][lang]}</span>
              <span style={{ fontSize: 10, color: palette.borderStrong }}>•</span>
              <span style={{ fontSize: 12, color: palette.muted, direction: "ltr" }}>{record.date}</span>
            </div>
          </div>
        </div>

        <div className="my-5 flex items-center justify-between p-3 rounded-lg border bg-black/5" style={{ borderColor: palette.border }}>
          <span style={{ fontSize: 13, color: palette.muted }}>{t.amount}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: palette.primary }}>
            {record.amount.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600, color: palette.muted }}>{cur}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ fontSize: 12.5 }}>
          <div>
            <div style={{ color: palette.muted, marginBottom: 4 }}>{t.type}</div>
            <Badge bg={`${tColor}12`} fg={tColor}>{typeLabels[record.type][lang]}</Badge>
          </div>
          <div>
            <div style={{ color: palette.muted, marginBottom: 4 }}>{t.method}</div>
            <Badge bg={`${mColor}1f`} fg={mColor} dot={mColor}>{methodLabels[record.paymentMethod][lang]}</Badge>
          </div>
          
          <div>
            <div style={{ color: palette.muted, marginBottom: 2 }}>{t.supplier}</div>
            <div style={{ fontWeight: 600 }}>{record.supplier}</div>
          </div>
          <div>
            <div style={{ color: palette.muted, marginBottom: 2 }}>{t.linkedTo}</div>
            <div style={{ fontWeight: 600 }}>{linkLabels[record.linkedTo][lang]}</div>
          </div>
          
          <div>
            <div style={{ color: palette.muted, marginBottom: 2 }}>{t.isRecurring}</div>
            <div style={{ fontWeight: 600 }}>{record.isRecurring ? t.yes : t.no}</div>
          </div>
          <div>
            <div style={{ color: palette.muted, marginBottom: 2 }}>{t.lastUpdated}</div>
            <div style={{ direction: "ltr", textAlign: dir === "rtl" ? "right" : "left", fontWeight: 600 }}>{record.lastUpdated}</div>
          </div>
        </div>

        {record.notes[lang] && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: palette.border }}>
            <div style={{ fontSize: 12, color: palette.muted, marginBottom: 4 }}>{t.notes}</div>
            <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.5 }}>{record.notes[lang]}</div>
          </div>
        )}
      </div>

      {/* 2. Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => {}}>
          <Edit size={15} />
          {t.actions.edit}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Printer size={15} />
          {t.actions.print}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <RefreshCw size={15} />
          {t.actions.repeat}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Link2 size={15} />
          {t.actions.linkProd}
        </Button>
      </div>
    </div>
  );
}

export function CategoryBreakdown() {
  const { lang } = useLanguage();
  const t = expensesText[lang].breakdown;
  const cur = expensesText[lang].currency;

  const data = [
    { cat: "أقمشة", fr: "Tissus", val: 125000, pct: 40 },
    { cat: "أجور العمال", fr: "Salaires", val: 90000, pct: 30 },
    { cat: "كراء", fr: "Loyer", val: 35000, pct: 15 },
    { cat: "صيانة", fr: "Maintenance", val: 15000, pct: 8 },
    { cat: "أخرى", fr: "Autres", val: 8000, pct: 7 },
  ];

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        borderRadius: 16,
        border: `1px solid ${palette.border}`,
        padding: "16px 20px",
      }}
    >
      <div className="mb-4 text-sm font-bold">{t.title}</div>
      <div className="flex flex-col gap-3">
        {data.map((item) => (
          <div key={item.cat}>
            <div className="flex justify-between mb-1" style={{ fontSize: 11.5 }}>
              <span style={{ fontWeight: 600 }}>{lang === "ar" ? item.cat : item.fr}</span>
              <span style={{ color: palette.muted }}>{item.val.toLocaleString()} {cur}</span>
            </div>
            <div style={{ height: 6, backgroundColor: palette.bg, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${item.pct}%`, backgroundColor: palette.primary, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NetProfitMiniCard() {
  const { lang } = useLanguage();
  const t = expensesText[lang].netProfitCard;
  const cur = expensesText[lang].currency;

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        borderRadius: 16,
        border: `1px solid ${palette.border}`,
        padding: "16px 20px",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Settings size={16} style={{ color: palette.primary }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</span>
      </div>
      <div className="flex flex-col gap-2" style={{ fontSize: 12.5 }}>
        <div className="flex justify-between">
          <span style={{ color: palette.muted }}>{t.sales}</span>
          <span style={{ fontWeight: 600, color: "#4d8a6a" }}>384,000 {cur}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: palette.muted }}>{t.expenses}</span>
          <span style={{ fontWeight: 600, color: "#b46a66" }}>126,500 {cur}</span>
        </div>
        <div className="flex justify-between border-t pt-2 mt-1" style={{ borderColor: palette.border }}>
          <span style={{ fontWeight: 800 }}>{t.net}</span>
          <span style={{ fontWeight: 800, color: palette.primary }}>257,500 {cur}</span>
        </div>
        <div className="mt-1 flex items-center justify-between" style={{ fontSize: 11 }}>
          <span style={{ color: palette.muted }}>{t.ratio}</span>
          <span style={{ fontWeight: 600, color: palette.muted }}>33%</span>
        </div>
      </div>
    </div>
  );
}
