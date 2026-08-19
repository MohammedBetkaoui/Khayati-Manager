import { useLanguage } from "../../language-context";
import { palette, analyticsText } from "../../pages/analytics-data";
import { Badge } from "../kit";

export type AnalyticsTopItem = {
  name: string;
  val1: string;
  val2: string;
};

export type DelayedOrderItem = {
  id: string;
  customer: string;
  product: string;
  delay: number;
};

export function SalesProfitChart({
  months,
  sales,
  profits,
}: {
  months: string[];
  sales: number[];
  profits: number[];
}) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].charts;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="mb-4 font-bold">{t.salesProfits}</h3>

      <div className="flex h-48 items-end gap-2 border-b pb-2 pt-4 sm:gap-6" style={{ borderColor: palette.border }}>
        {months.map((month, index) => (
          <div key={month} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="absolute bottom-0 flex h-full w-full items-end justify-center gap-1">
              <div className="w-1/3 rounded-t-sm" style={{ backgroundColor: palette.primary, height: `${sales[index] ?? 0}%` }} />
              <div className="w-1/3 rounded-t-sm" style={{ backgroundColor: "#4d8a6a", height: `${profits[index] ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 sm:gap-6">
        {months.map((month) => (
          <div key={month} className="flex-1 text-center text-xs text-muted-foreground">{month}</div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs font-medium">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette.primary }} />
          <span>{t.sales}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#4d8a6a" }} />
          <span>{t.profits}</span>
        </div>
      </div>
    </div>
  );
}

export function ExpensesRevChart({
  salesTotal,
  expensesTotal,
  profitTotal,
}: {
  salesTotal: number;
  expensesTotal: number;
  profitTotal: number;
}) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].charts;
  const salesWidth = salesTotal > 0 ? 100 : 0;
  const expensesWidth = salesTotal > 0 ? Math.min(100, Math.round((expensesTotal / salesTotal) * 100)) : 0;
  const profitWidth = salesTotal > 0 ? Math.min(100, Math.round((Math.max(0, profitTotal) / salesTotal) * 100)) : 0;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="mb-4 font-bold">{t.expensesRev}</h3>
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{t.sales}</span>
            <span className="font-bold text-primary">{salesWidth}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full" style={{ width: `${salesWidth}%`, backgroundColor: palette.primary }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{analyticsText[lang].summary.expenses}</span>
            <span className="font-bold" style={{ color: "#b46a66" }}>{expensesWidth}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full" style={{ width: `${expensesWidth}%`, backgroundColor: "#b46a66" }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{t.netProfit}</span>
            <span className="font-bold" style={{ color: "#4d8a6a" }}>{profitWidth}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full" style={{ width: `${profitWidth}%`, backgroundColor: "#4d8a6a" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TopList({
  title,
  items,
  columns,
}: {
  title: string;
  items: AnalyticsTopItem[];
  columns: string[];
}) {
  const { lang } = useLanguage();
  const emptyText = lang === "ar" ? "لا توجد بيانات" : "Aucune donnee";

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="mb-4 font-bold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: palette.border }}>
              {columns.map((column, index) => (
                <th key={column} className={`pb-2 font-semibold text-muted-foreground ${index === 0 ? "text-start" : "text-end"}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={columns.length}>{emptyText}</td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="border-b last:border-0" style={{ borderColor: palette.border }}>
                  <td className="py-2.5 font-medium">{item.name}</td>
                  <td className="py-2.5 text-end text-muted-foreground">{item.val1}</td>
                  <td className="py-2.5 text-end font-semibold">{item.val2}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DelayedOrdersTable({ orders }: { orders: DelayedOrderItem[] }) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].charts;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h3 className="mb-4 font-bold">{t.delayedOrders}</h3>
      <div className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <div className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد طلبيات متأخرة" : "Aucune commande en retard"}</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: "#b46a66", direction: "ltr" }}>#{order.id}</span>
                  <span className="font-semibold">{order.customer}</span>
                </div>
                <div className="mt-1 text-xs text-red-700/70">{order.product}</div>
              </div>
              <div className="text-end">
                <Badge bg="#b46a661f" fg="#b46a66">
                  {lang === "ar" ? `تأخير ${order.delay} أيام` : `Retard ${order.delay} jrs`}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
