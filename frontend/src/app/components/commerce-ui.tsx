import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { palette } from "../content";
import { useLanguage } from "../language-context";

export function PageHeading({
  title,
  subtitle,
  backTo = "/",
  actions,
}: {
  title: string;
  subtitle: string;
  backTo?: string;
  actions?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { dir } = useLanguage();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-wrap items-start justify-between gap-5 pt-7">
      <div className="flex min-w-0 items-start gap-4">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(backTo)}
          className="flex shrink-0 items-center justify-center transition-all hover:-translate-y-0.5"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.primary,
          }}
        >
          <Back size={20} />
        </button>
        <div className="min-w-0">
          <h1 style={{ fontSize: 26, fontWeight: 800, color: palette.text }}>
            {title}
          </h1>
          <p
            className="mt-1 max-w-[780px]"
            style={{ fontSize: 14, color: palette.muted, lineHeight: 1.7 }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  color = palette.primary,
  tint = "rgba(18,60,74,0.08)",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper?: string;
  color?: string;
  tint?: string;
}) {
  return (
    <div
      className="flex min-h-[118px] items-center gap-4"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 19,
        border: `1px solid ${palette.border}`,
        padding: 17,
        boxShadow: "0 10px 28px -24px rgba(18,60,74,0.5)",
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          color,
          backgroundColor: tint,
        }}
      >
        <Icon size={21} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: 12.5,
            color: palette.muted,
            lineHeight: 1.45,
          }}
        >
          {label}
        </div>
        <div
          className="mt-0.5 break-words"
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: palette.text,
            lineHeight: 1.2,
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </div>
        {helper ? (
          <div
            className="mt-0.5 break-words"
            style={{
              fontSize: 11.5,
              color: palette.muted,
              lineHeight: 1.35,
              overflowWrap: "anywhere",
            }}
          >
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatePanel({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry?: () => void;
}) {
  const { lang } = useLanguage();
  if (!loading && !error && !empty) return null;

  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center"
      style={{
        borderRadius: 18,
        border: `1px dashed ${palette.borderStrong}`,
        backgroundColor: palette.bg,
      }}
    >
      {loading ? (
        <LoaderCircle
          className="animate-spin"
          size={27}
          style={{ color: palette.primary }}
        />
      ) : null}
      {error ? <AlertCircle size={28} style={{ color: "#b46a66" }} /> : null}
      <div
        className="mt-3"
        style={{ fontSize: 16, fontWeight: 800, color: palette.text }}
      >
        {loading
          ? lang === "ar"
            ? "جاري تحميل البيانات..."
            : "Chargement des données..."
          : error
            ? lang === "ar"
              ? "تعذر تحميل البيانات"
              : "Chargement impossible"
            : emptyTitle}
      </div>
      <p
        className="mt-1 max-w-[480px]"
        style={{
          fontSize: 13,
          color: error ? "#b46a66" : palette.muted,
          lineHeight: 1.7,
        }}
      >
        {error || emptyDescription}
      </p>
      {error && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: palette.primary }}
        >
          {lang === "ar" ? "إعادة المحاولة" : "Réessayer"}
        </button>
      ) : null}
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const { dir } = useLanguage();
  const Previous = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border disabled:opacity-35"
        style={{
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
      >
        <Previous size={17} />
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border disabled:opacity-35"
        style={{
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
      >
        <Next size={17} />
      </button>
    </div>
  );
}

export function formatMoney(value: number, lang: "ar" | "fr") {
  return `${Number(value || 0).toLocaleString("fr-DZ")} ${lang === "ar" ? "دج" : "DA"}`;
}

export function formatPaymentMethod(
  methodCode: string | null | undefined,
  method: string | null | undefined,
  lang: "ar" | "fr",
) {
  const codeByValue: Record<string, string> = {
    "نقداً": "CASH",
    تحويل: "TRANSFER",
    "دفع جزئي": "PARTIAL",
    صك: "CHECK",
    "دفع لاحق": "LATER",
    أخرى: "OTHER",
    "رصيد الزبون": "CUSTOMER_CREDIT",
  };
  const code = methodCode || (method ? codeByValue[method] : null);
  const labels: Record<string, { ar: string; fr: string }> = {
    CASH: { ar: "نقداً", fr: "Espèces" },
    TRANSFER: { ar: "تحويل", fr: "Virement" },
    PARTIAL: { ar: "دفع جزئي", fr: "Paiement partiel" },
    CHECK: { ar: "صك", fr: "Chèque" },
    LATER: { ar: "دفع لاحق", fr: "Paiement différé" },
    OTHER: { ar: "أخرى", fr: "Autre" },
    CUSTOMER_CREDIT: { ar: "رصيد الزبون", fr: "Crédit client" },
  };
  return code && labels[code] ? labels[code][lang] : method || "—";
}

export function formatDate(
  value: string | null | undefined,
  lang: "ar" | "fr",
) {
  if (!value) return "-";
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
    dateStyle: "medium",
  }).format(parsed);
}
