import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button } from "../kit";

export function DeleteMaterialModal({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}) {
  const { lang, dir } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  const title = lang === "ar" ? "تأكيد الحذف" : "Confirmer la suppression";
  const desc =
    lang === "ar"
      ? "هل أنت متأكد أنك تريد حذف هذه المادة من المخزون؟ لا يمكن التراجع عن هذا الإجراء."
      : "Êtes-vous sûr de vouloir supprimer cette matière du stock ? Cette action est irréversible.";
  const cancel = lang === "ar" ? "إلغاء" : "Annuler";
  const confirm = lang === "ar" ? "حذف" : "Supprimer";

  async function handleConfirm() {
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : lang === "ar" ? "تعذّر حذف المادة" : "Impossible de supprimer la matière");
    }
  }

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
          maxWidth: 400,
          overflow: "hidden",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>
            <Trash2 size={20} color={palette.rose} />
            {title}
          </h2>
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
        <div className="px-6 py-5">
          <p style={{ fontSize: 14, color: palette.muted, lineHeight: 1.6 }}>{desc}</p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              {cancel}
            </Button>
            <button
              onClick={() => void handleConfirm()}
              disabled={isDeleting}
              className="transition-colors hover:opacity-90"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: palette.rose,
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              {isDeleting ? (lang === "ar" ? "جاري الحذف..." : "Suppression...") : confirm}
            </button>
          </div>
          {error && <p className="mt-4 text-sm" style={{ color: palette.rose }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
