import { Pencil, Save } from "lucide-react";
import { palette } from "../../content";
import { Button, Field, TextInput } from "../kit";
import type { Lang, SalaryRule, SettingField } from "../../pages/special-settings-data";
import { specialSettingsText } from "../../pages/special-settings-data";

export function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      className="relative inline-flex shrink-0 items-center"
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        backgroundColor: checked ? palette.primary : "#d9d5cb",
        border: `1px solid ${checked ? palette.primary : palette.borderStrong}`,
        boxShadow: checked ? "inset 0 0 0 1px rgba(255,255,255,0.08)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          insetInlineStart: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: 999,
          backgroundColor: "#fff",
          boxShadow: "0 2px 6px rgba(18,60,74,0.22)",
          transition: "inset-inline-start .18s ease, box-shadow .18s ease",
        }}
      />
    </span>
  );
}

function RuleField({ field, lang }: { field: SettingField; lang: Lang }) {
  if (field.type === "toggle") {
    return (
      <div
        className="flex items-center justify-between gap-3"
        style={{
          borderRadius: 14,
          border: `1px solid ${palette.border}`,
          backgroundColor: palette.bg,
          padding: "11px 12px",
        }}
      >
        <div className="min-w-0">
          <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.text }}>{field.label[lang]}</div>
          <div className="truncate" style={{ fontSize: 11.5, color: palette.muted, marginTop: 2 }}>
            {field.value[lang]}
          </div>
        </div>
        <ToggleSwitch checked={Boolean(field.enabled)} />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <Field label={field.label[lang]}>
        <select
          defaultValue={field.value[lang]}
          className="outline-none"
          style={{
            height: 38,
            width: "100%",
            borderRadius: 12,
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.surface,
            color: palette.text,
            fontSize: 12.5,
            padding: "0 12px",
          }}
        >
          <option>{field.value[lang]}</option>
          <option>{lang === "ar" ? "حسب ملف العامل" : "Selon travailleur"}</option>
          <option>{lang === "ar" ? "يدوياً عند الحساب" : "Manuel au calcul"}</option>
        </select>
        {field.helper ? <span style={{ fontSize: 11.5, color: palette.muted }}>{field.helper[lang]}</span> : null}
      </Field>
    );
  }

  return (
    <Field label={field.label[lang]}>
      <TextInput defaultValue={field.value[lang]} style={{ height: 38, fontSize: 12.5 }} />
      {field.helper ? <span style={{ fontSize: 11.5, color: palette.muted }}>{field.helper[lang]}</span> : null}
    </Field>
  );
}

export function SalaryRuleCard({ rule, lang }: { rule: SalaryRule; lang: Lang }) {
  const t = specialSettingsText[lang];

  return (
    <article
      style={{
        borderRadius: 18,
        border: `1px solid ${palette.border}`,
        backgroundColor: "#fffdf9",
        padding: 16,
        boxShadow: "0 2px 10px -8px rgba(18,60,74,0.18)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{rule.title[lang]}</h3>
            <span
              style={{
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 11,
                fontWeight: 700,
                color: rule.active ? "#4d8a6a" : palette.muted,
                backgroundColor: rule.active ? "rgba(77,138,106,0.12)" : palette.bg,
              }}
            >
              {rule.active ? t.active : t.inactive}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: palette.muted, marginTop: 3 }}>{rule.description[lang]}</p>
        </div>
        <ToggleSwitch checked={rule.active} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rule.fields.map((field) => (
          <RuleField key={field.id} field={field} lang={lang} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary">
          <Pencil size={15} />
          {t.edit}
        </Button>
        <Button variant="primary">
          <Save size={15} />
          {t.save}
        </Button>
      </div>
    </article>
  );
}
