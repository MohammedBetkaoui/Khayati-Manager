import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { palette } from "../content";
import { useLanguage } from "../language-context";

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
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(18,60,74,0.3)",
        backdropFilter: "blur(3px)",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          backgroundColor: palette.surface,
          borderRadius: 22,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 30px 70px -30px rgba(18,60,74,0.5)",
          width: "100%",
          maxWidth,
          maxHeight: "92vh",
          overflow: "auto",
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{
            borderBottom: `1px solid ${palette.border}`,
            backgroundColor: palette.surface,
          }}
        >
          <h2
            id={titleId}
            style={{ fontSize: 18, fontWeight: 800, color: palette.text }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center transition-colors hover:opacity-70"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              color: palette.muted,
              border: `1px solid ${palette.border}`,
            }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
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
        ...props.style,
      }}
    />
  );
}
