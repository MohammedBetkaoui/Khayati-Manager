import {
  BadgePercent,
  Boxes,
  CalendarCheck,
  Coins,
  GripVertical,
  Pencil,
  Plus,
  ReceiptText,
  Route,
  Save,
  Settings2,
  Tags,
  UserRound,
} from "lucide-react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { palette } from "../../content";
import { Badge, Button, TextInput } from "../kit";
import { SalaryRuleCard, ToggleSwitch } from "./salary-rule-card";
import {
  attendanceSettings,
  bonusRules,
  invoiceSettings,
  measurementUnits,
  piecePrices,
  productCategories,
  productionStages,
  salaryRules,
  specialSettingsText,
  stockAlertSettings,
  supportingSections,
  workflowSettings,
  workerRoles,
  type Bilingual,
  type Lang,
  type SettingSectionId,
} from "../../pages/special-settings-data";

type Props = {
  active: SettingSectionId;
  lang: Lang;
  onAddRule: () => void;
  onAddPiece: () => void;
  onAddStage: () => void;
};

function SectionShell({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ElementType;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: palette.surface,
        borderRadius: 22,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between gap-4 px-5 py-4"
        style={{ borderBottom: `1px solid ${palette.border}` }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: "rgba(18,60,74,0.08)",
              color: palette.primary,
            }}
          >
            <Icon size={20} strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <h2 style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>
              {title}
            </h2>
            <p
              className="truncate"
              style={{ fontSize: 12.5, color: palette.muted, marginTop: 3 }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function PrimarySmallButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center justify-center gap-2 transition-colors"
      style={{
        height: 38,
        borderRadius: 12,
        padding: "0 14px",
        backgroundColor: palette.primary,
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ active, lang }: { active: boolean; lang: Lang }) {
  const t = specialSettingsText[lang];
  return (
    <Badge
      bg={active ? "rgba(77,138,106,0.12)" : palette.bg}
      fg={active ? "#4d8a6a" : palette.muted}
    >
      {active ? t.active : t.inactive}
    </Badge>
  );
}

function WagesContent({
  lang,
  onAddRule,
}: {
  lang: Lang;
  onAddRule: () => void;
}) {
  const t = specialSettingsText[lang];
  return (
    <div className="flex flex-col gap-5">
      <SectionShell
        title={t.wagesTitle}
        subtitle={t.wagesSubtitle}
        icon={Coins}
        action={
          <PrimarySmallButton onClick={onAddRule}>
            <Plus size={15} />
            {t.addRule}
          </PrimarySmallButton>
        }
      >
        <div className="flex flex-col gap-4">
          {salaryRules.map((rule) => (
            <SalaryRuleCard key={rule.id} rule={rule} lang={lang} />
          ))}
        </div>
      </SectionShell>

      <SupportingSections lang={lang} />
    </div>
  );
}

function SupportingSections({ lang }: { lang: Lang }) {
  const t = specialSettingsText[lang];
  return (
    <section
      style={{
        backgroundColor: palette.surface,
        borderRadius: 22,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding: 20,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>
            {t.supportingTitle}
          </h2>
          <p style={{ fontSize: 12.5, color: palette.muted, marginTop: 3 }}>
            {t.supportingSubtitle}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {supportingSections.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title.ar}
              style={{
                borderRadius: 16,
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.bg,
                padding: 14,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    backgroundColor: palette.surface,
                    color: palette.primary,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                <div
                  style={{ fontSize: 13, fontWeight: 800, color: palette.text }}
                >
                  {item.title[lang]}
                </div>
              </div>
              <p
                style={{
                  fontSize: 11.5,
                  color: palette.muted,
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                {item.text[lang]}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SettingsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  const headStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: palette.muted,
    textAlign: "start",
    padding: "0 12px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: CSSProperties = {
    padding: "13px 12px",
    fontSize: 13,
    color: palette.text,
    borderBottom: `1px solid ${palette.border}`,
    verticalAlign: "middle",
  };

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ borderCollapse: "collapse", minWidth: 620 }}
      >
        <thead>
          <tr>
            {headers.map((head) => (
              <th key={head} style={headStyle}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={cellStyle}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PiecePricesContent({
  lang,
  onAddPiece,
}: {
  lang: Lang;
  onAddPiece: () => void;
}) {
  const t = specialSettingsText[lang];
  return (
    <SectionShell
      title={t.sections.piecePrices}
      subtitle={
        lang === "ar"
          ? "تحديد سعر كل مهمة حسب المنتج والدور المسؤول."
          : "Définir chaque prix par produit, tâche et rôle."
      }
      icon={Coins}
      action={
        <PrimarySmallButton onClick={onAddPiece}>
          <Plus size={15} />
          {t.addPiecePrice}
        </PrimarySmallButton>
      }
    >
      <SettingsTable
        headers={[t.product, t.task, t.price, t.role, t.status, t.actions]}
        rows={piecePrices.map((row) => [
          <strong>{row.product[lang]}</strong>,
          row.task[lang],
          <span style={{ fontWeight: 800, color: palette.primary }}>
            {row.price[lang]}
          </span>,
          row.role[lang],
          <Badge bg="rgba(77,138,106,0.12)" fg="#4d8a6a">
            {row.status[lang]}
          </Badge>,
          <Button variant="ghost">{t.edit}</Button>,
        ])}
      />
    </SectionShell>
  );
}

function WorkerRolesContent({ lang }: { lang: Lang }) {
  const t = specialSettingsText[lang];
  return (
    <SectionShell
      title={t.sections.workerRoles}
      subtitle={
        lang === "ar"
          ? "الأدوار الافتراضية والصلاحيات المتاحة داخل الورشة."
          : "Rôles par défaut et permissions atelier."
      }
      icon={UserRound}
      action={
        <PrimarySmallButton>
          <Plus size={15} />
          {t.addRole}
        </PrimarySmallButton>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {workerRoles.map((role) => (
          <div
            key={role.name.ar}
            style={{
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.bg,
              padding: 15,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  style={{
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: palette.text,
                  }}
                >
                  {role.name[lang]}
                </h3>
                <p style={{ fontSize: 12, color: palette.muted, marginTop: 3 }}>
                  {role.description[lang]}
                </p>
              </div>
              <StatusBadge active={role.active} lang={lang} />
            </div>
            <div
              style={{
                fontSize: 12,
                color: palette.primary,
                fontWeight: 700,
                marginTop: 10,
              }}
            >
              {role.permissions[lang]}
            </div>
            <button
              type="button"
              className="mt-3 flex items-center gap-1.5"
              style={{
                fontSize: 12.5,
                color: palette.primary,
                fontWeight: 700,
              }}
            >
              <Pencil size={14} />
              {t.edit}
            </button>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ProductionStagesContent({
  lang,
  onAddStage,
}: {
  lang: Lang;
  onAddStage: () => void;
}) {
  const t = specialSettingsText[lang];
  return (
    <SectionShell
      title={t.sections.productionStages}
      subtitle={
        lang === "ar"
          ? "مراحل قابلة للسحب وإعادة الترتيب حسب سير العمل."
          : "Étapes réordonnables selon le flux de l'atelier."
      }
      icon={Route}
      action={
        <PrimarySmallButton onClick={onAddStage}>
          <Plus size={15} />
          {t.addStage}
        </PrimarySmallButton>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {productionStages.map((stage) => (
          <div
            key={stage.order}
            className="flex items-center gap-3"
            style={{
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.bg,
              padding: 14,
            }}
          >
            <GripVertical size={18} style={{ color: palette.borderStrong }} />
            <span
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: `${stage.color}1f`,
                color: stage.color,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {stage.order}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  style={{ fontSize: 14, fontWeight: 800, color: palette.text }}
                >
                  {stage.name[lang]}
                </h3>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
              <p
                className="truncate"
                style={{ fontSize: 11.5, color: palette.muted, marginTop: 2 }}
              >
                {stage.description[lang]}
              </p>
            </div>
            <ToggleSwitch checked={stage.active} />
            <button type="button" style={{ color: palette.primary }}>
              <Pencil size={15} />
            </button>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function BonusRulesContent({ lang }: { lang: Lang }) {
  const t = specialSettingsText[lang];
  return (
    <SectionShell
      title={t.sections.bonusRules}
      subtitle={
        lang === "ar"
          ? "تحديد الخصومات والمكافآت وشروط تطبيقها."
          : "Définir les retenues, primes et conditions."
      }
      icon={BadgePercent}
      action={
        <PrimarySmallButton>
          <Plus size={15} />
          {t.addRule}
        </PrimarySmallButton>
      }
    >
      <SettingsTable
        headers={[t.ruleType, t.amount, t.condition, t.status, t.actions]}
        rows={bonusRules.map((rule) => [
          <strong>{rule.type[lang]}</strong>,
          rule.amount[lang],
          rule.condition[lang],
          <ToggleSwitch checked={rule.active} />,
          <Button variant="ghost">{t.edit}</Button>,
        ])}
      />
    </SectionShell>
  );
}

function SimpleSettingsContent({
  lang,
  title,
  subtitle,
  icon,
  items,
  action,
}: {
  lang: Lang;
  title: string;
  subtitle: string;
  icon: ElementType;
  items: { label: Bilingual; value: Bilingual; helper?: Bilingual }[];
  action?: ReactNode;
}) {
  return (
    <SectionShell title={title} subtitle={subtitle} icon={icon} action={action}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.label.ar}
            className="flex flex-col gap-1.5"
            style={{
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.bg,
              padding: 14,
            }}
          >
            <span
              style={{ fontSize: 12.5, fontWeight: 800, color: palette.text }}
            >
              {item.label[lang]}
            </span>
            <TextInput
              defaultValue={item.value[lang]}
              style={{
                height: 38,
                backgroundColor: palette.surface,
                fontSize: 12.5,
              }}
            />
            {item.helper ? (
              <span style={{ fontSize: 11.5, color: palette.muted }}>
                {item.helper[lang]}
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </SectionShell>
  );
}

function ChipsContent({
  lang,
  title,
  subtitle,
  icon,
  items,
}: {
  lang: Lang;
  title: string;
  subtitle: string;
  icon: ElementType;
  items: Bilingual[];
}) {
  return (
    <SectionShell title={title} subtitle={subtitle} icon={icon}>
      <div className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <span
            key={item.ar}
            className="inline-flex items-center gap-2"
            style={{
              borderRadius: 999,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.bg,
              padding: "10px 14px",
              color: palette.text,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: palette.accent,
              }}
            />
            {item[lang]}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}

function WorkflowCard({ lang }: { lang: Lang }) {
  const t = specialSettingsText[lang];
  return (
    <SectionShell
      title={t.sections.workflow}
      subtitle={
        lang === "ar"
          ? "قواعد خاصة بدفعات الإنتاج وربطها بالمخزون والرواتب."
          : "Règles des lots de production, du stock et des salaires."
      }
      icon={Settings2}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {workflowSettings.map((item) => (
          <div
            key={item.label.ar}
            style={{
              borderRadius: 16,
              backgroundColor: palette.bg,
              border: `1px solid ${palette.border}`,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, color: palette.muted }}>
              {item.label[lang]}
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: palette.text,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              {item.value[lang]}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function SpecialSettingsSectionContent({
  active,
  lang,
  onAddRule,
  onAddPiece,
  onAddStage,
}: Props) {
  const t = specialSettingsText[lang];

  if (active === "wages") {
    return <WagesContent lang={lang} onAddRule={onAddRule} />;
  }

  if (active === "piecePrices") {
    return <PiecePricesContent lang={lang} onAddPiece={onAddPiece} />;
  }

  if (active === "workerRoles") {
    return <WorkerRolesContent lang={lang} />;
  }

  if (active === "productionStages") {
    return <ProductionStagesContent lang={lang} onAddStage={onAddStage} />;
  }

  if (active === "bonusRules") {
    return <BonusRulesContent lang={lang} />;
  }

  if (active === "attendance") {
    return (
      <SimpleSettingsContent
        lang={lang}
        title={t.sections.attendance}
        subtitle={
          lang === "ar"
            ? "أوقات العمل وطريقة تأثير الغياب والتأخر على الراتب."
            : "Horaires et impact absence/retard sur salaire."
        }
        icon={CalendarCheck}
        items={attendanceSettings}
      />
    );
  }

  if (active === "stockAlerts") {
    return (
      <SimpleSettingsContent
        lang={lang}
        title={t.sections.stockAlerts}
        subtitle={
          lang === "ar"
            ? "حدود الحد الأدنى للمواد وتنبيهات قبل النفاد."
            : "Seuils minimum et alertes avant rupture."
        }
        icon={Boxes}
        items={stockAlertSettings}
        action={
          <PrimarySmallButton>
            <Plus size={15} />
            {t.addAlert}
          </PrimarySmallButton>
        }
      />
    );
  }

  if (active === "productTypes") {
    return (
      <ChipsContent
        lang={lang}
        title={t.sections.productTypes}
        subtitle={
          lang === "ar"
            ? "تصنيفات المنتجات الجاهزة وأسعار القطع."
            : "Catégories des produits finis et prix à la pièce."
        }
        icon={Tags}
        items={productCategories}
      />
    );
  }

  if (active === "measurementUnits") {
    return (
      <ChipsContent
        lang={lang}
        title={t.sections.measurementUnits}
        subtitle={
          lang === "ar"
            ? "وحدات القياس المستخدمة في المخزون والإنتاج."
            : "Unités utilisées dans stock et production."
        }
        icon={Settings2}
        items={measurementUnits}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SimpleSettingsContent
        lang={lang}
        title={t.sections.invoiceSettings}
        subtitle={
          lang === "ar"
            ? "إعدادات فواتير الورشة دون تغيير النظام العام."
            : "Paramètres propres aux factures de l'atelier."
        }
        icon={ReceiptText}
        items={invoiceSettings}
      />
      <WorkflowCard lang={lang} />
      <div className="flex justify-end">
        <Button variant="primary">
          <Save size={15} />
          {t.save}
        </Button>
      </div>
    </div>
  );
}
