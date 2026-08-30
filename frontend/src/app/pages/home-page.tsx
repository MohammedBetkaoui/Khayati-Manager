import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
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

  useEffect(() => {
    const backupApi = window.khayatiBackup;
    if (!backupApi) return;
    let active = true;
    void backupApi
      .getStatus()
      .then((status) => {
        if (!active || !status.restoreNoticePending) return;
        setRestoreNotice(true);
        void backupApi.acknowledgeRestoreNotice();
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
