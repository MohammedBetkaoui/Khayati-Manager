import { useNavigate } from "react-router";
import { palette, sections } from "../content";
import { useLanguage } from "../language-context";
import { AppHeader } from "../components/app-header";
import { PageBackground, StitchDivider } from "../components/page-background";
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
};

export function HomePage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <PageBackground>
      <AppHeader />
      <StitchDivider className="mt-6" />

      <section className="mt-8">
        <h1 style={{ fontSize: 28, fontWeight: 800, color: palette.text }}>
          {t.pageTitle}
        </h1>
        <p className="mt-1.5" style={{ fontSize: 15, color: palette.muted }}>
          {t.welcome}
        </p>
      </section>

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
