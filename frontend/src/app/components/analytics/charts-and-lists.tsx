import { useLanguage } from "../../language-context";
import { palette, analyticsText } from "../../pages/analytics-data";
import { Badge } from "../kit";

export function SalesProfitChart() {
  const { lang } = useLanguage();
  const t = analyticsText[lang].charts;
  
  // Custom simple CSS-based mock chart to perfectly fit the theme without recharts overhead
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const sales = [40, 55, 45, 70, 60, 85]; // percentages
  const profits = [25, 30, 20, 45, 35, 55]; // percentages

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="font-bold mb-4">{t.salesProfits}</h3>
      
      <div className="flex h-48 items-end gap-2 sm:gap-6 pt-4 pb-2 border-b" style={{ borderColor: palette.border }}>
        {months.map((m, i) => (
          <div key={m} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
            {/* Sales Bar */}
            <div 
              className="w-full rounded-t-sm transition-all" 
              style={{ backgroundColor: palette.primary, height: `${sales[i]}%`, opacity: 0.8 }}
            />
            {/* Profit Bar (overlayed or beside, we'll do beside for clarity using flex-row inside a container) */}
            <div className="absolute bottom-0 flex w-full justify-center gap-1 h-full items-end">
              <div className="w-1/3 rounded-t-sm" style={{ backgroundColor: palette.primary, height: `${sales[i]}%` }} />
              <div className="w-1/3 rounded-t-sm" style={{ backgroundColor: "#4d8a6a", height: `${profits[i]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 sm:gap-6 pt-2">
        {months.map(m => (
          <div key={m} className="flex-1 text-center text-xs text-muted-foreground">{m}</div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: palette.primary }} />
          <span>{t.sales}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#4d8a6a" }} />
          <span>{t.profits}</span>
        </div>
      </div>
    </div>
  );
}

export function ExpensesRevChart() {
  const { lang } = useLanguage();
  const t = analyticsText[lang].charts;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="font-bold mb-4">{t.expensesRev}</h3>
      <div className="flex flex-col gap-4 mt-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">{t.sales}</span>
            <span className="font-bold text-primary">100%</span>
          </div>
          <div className="h-2.5 rounded-full w-full bg-black/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "100%", backgroundColor: palette.primary }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">{analyticsText[lang].summary.expenses}</span>
            <span className="font-bold" style={{ color: "#b46a66" }}>65%</span>
          </div>
          <div className="h-2.5 rounded-full w-full bg-black/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "65%", backgroundColor: "#b46a66" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">{t.netProfit}</span>
            <span className="font-bold" style={{ color: "#4d8a6a" }}>35%</span>
          </div>
          <div className="h-2.5 rounded-full w-full bg-black/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "35%", backgroundColor: "#4d8a6a" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TopList({ title, items, columns }: { title: string, items: any[], columns: string[] }) {
  const { dir } = useLanguage();
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="font-bold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: palette.border }}>
              {columns.map((col, i) => (
                <th key={i} className={`pb-2 font-semibold text-muted-foreground ${i === 0 ? "text-start" : "text-end"}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0" style={{ borderColor: palette.border }}>
                <td className="py-2.5 font-medium">{item.name}</td>
                <td className="py-2.5 text-end text-muted-foreground">{item.val1}</td>
                <td className="py-2.5 text-end font-semibold">{item.val2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DelayedOrdersTable() {
  const { lang, dir } = useLanguage();
  const t = analyticsText[lang].charts;

  const orders = [
    { id: "1025", customer: lang === "ar" ? "مدرسة الأمل" : "École El Amel", prod: lang === "ar" ? "زي مدرسي" : "Uniforme", delay: 3 },
    { id: "1018", customer: lang === "ar" ? "محمد صالح" : "Mohamed Salah", prod: lang === "ar" ? "سروال" : "Pantalon", delay: 5 },
  ];

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="font-bold mb-4">{t.delayedOrders}</h3>
      <div className="flex flex-col gap-3">
        {orders.map(o => (
          <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: "#b46a66", direction: "ltr" }}>#{o.id}</span>
                <span className="font-semibold">{o.customer}</span>
              </div>
              <div className="text-xs text-red-700/70 mt-1">{o.prod}</div>
            </div>
            <div className="text-end">
              <Badge bg="#b46a661f" fg="#b46a66">
                {lang === "ar" ? `تأخير ${o.delay} أيام` : `Retard ${o.delay} jrs`}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
