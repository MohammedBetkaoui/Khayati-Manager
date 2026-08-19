import type { ReactNode } from "react";
import { X } from "lucide-react";
import { palette } from "../../pages/production-data";
import { useLanguage } from "../../language-context";

export function ModalShell({
  open,
  onClose,
  title,
  children,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  const { dir } = useLanguage();
  if (!open) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(18,60,74,0.28)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: palette.surface,
          borderRadius: 22,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 30px 70px -30px rgba(18,60,74,0.5)",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: `1px solid ${palette.border}` }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{title}</h2>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{ width: 34, height: 34, borderRadius: 10, color: palette.muted, border: `1px solid ${palette.border}` }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="outline-none"
      style={{
        width: "100%",
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
        color: palette.text,
        fontSize: 14,
        padding: "10px 14px",
        resize: "vertical",
        fontFamily: "inherit",
      }}
    />
  );
}
