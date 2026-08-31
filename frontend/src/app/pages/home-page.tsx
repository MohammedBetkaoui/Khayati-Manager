import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, CheckCircle2, Usb } from "lucide-react";
import { palette, sections } from "../content";
import { useLanguage } from "../language-context";
import { PageBackground } from "../components/page-background";
import { DashboardCard } from "../components/dashboard-card";

const routeFor: Record<string, string> = {
  workers: "/workers",
  clients: "/clients",
  stock: "/stock",
  suppliers: "/suppliers",
  sales: "/sales",
  salary: "/salary",
  expenses: "/expenses",
  analytics: "/analytics",
  settings: "/settings",
};

export function HomePage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [restoreNotice, setRestoreNotice] = useState(false);
  const [externalBackupReminder, setExternalBackupReminder] = useState(false);

  useEffect(() => {
    const backupApi = window.khayatiBackup;
    if (!backupApi) return;
    let active = true;
    void backupApi
      .getStatus()
      .then((status) => {
        if (!active) return;
        if (status.restoreNoticePending) {
          setRestoreNotice(true);
          void backupApi.acknowledgeRestoreNotice();
        }
        if (status.externalReminderDue) {
          setExternalBackupReminder(true);
          void backupApi.acknowledgeExternalBackupReminder();
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageBackground>
      <section className="mt-4 sm:mt-6">
        <h1 style={{ fontSize: 28, fontWeight: 800, color: palette.text }}>
          {t.pageTitle}
        </h1>
        <p className="mt-1.5" style={{ fontSize: 15, color: palette.muted }}>
          {t.welcome}
        </p>
      </section>

      {restoreNotice ? (
        <div
          role="status"
          className="mt-5 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold"
          style={{
            backgroundColor: "rgba(77,138,106,0.12)",
            borderColor: "rgba(77,138,106,0.3)",
            color: palette.text,
          }}
        >
          <CheckCircle2 size={20} style={{ color: "var(--app-positive)" }} />
          {lang === "ar"
            ? "تمت استعادة النسخة الاحتياطية بنجاح."
            : "La sauvegarde a été restaurée avec succès."}
        </div>
      ) : null}

      {externalBackupReminder ? (
        <div
          role="status"
          className="mt-5 flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: "var(--app-warning-panel)",
            borderColor: "var(--app-warning-border)",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-1 shrink-0"
              size={20}
              style={{ color: "var(--app-warning)" }}
            />
            <div>
              <div className="font-extrabold" style={{ color: palette.text }}>
                {lang === "ar"
                  ? "حان وقت إنشاء نسخة خارجية"
                  : "Une copie externe est recommandée"}
              </div>
              <p className="mt-1 text-sm leading-6" style={{ color: palette.muted }}>
                {lang === "ar"
                  ? "يُنصح بحفظ نسخة على مفتاح USB أو قرص خارجي."
                  : "Conservez une copie sur une clé USB ou un disque externe."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white"
            style={{ backgroundColor: palette.primary }}
          >
            <Usb size={17} />
            {lang === "ar" ? "إنشاء نسخة الآن" : "Créer une sauvegarde maintenant"}
          </button>
        </div>
      ) : null}

      <main className="mt-8 grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <DashboardCard
            key={section.id}
            section={section}
            lang={lang}
            onClick={() => {
              const route = routeFor[section.id];
              if (route) navigate(route);
            }}
          />
        ))}
      </main>

      <footer
        className="mt-10 pt-5 text-center"
        style={{
          borderTop: `1px solid ${palette.border}`,
          color: palette.muted,
          fontSize: 12,
        }}
      >
        {t.footer}
      </footer>
    </PageBackground>
  );
}
