import { useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { palette } from "../content";

/** Small pill badge with a soft tinted background. */
export function Badge({
  children,
  bg,
  fg,
  dot,
}: {
  children: ReactNode;
  bg: string;
  fg: string;
  dot?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        backgroundColor: bg,
        color: fg,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {dot ? (
        <span style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: dot }} />
      ) : null}
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  children,
  variant = "secondary",
  onClick,
  type = "button",
  full,
  disabled = false,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  type?: "button" | "submit";
  full?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    padding: "0 16px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    width: full ? "100%" : undefined,
    transition: "all .18s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.58 : 1,
  } as const;

  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: hover ? palette.primaryHover : palette.primary,
      color: "#fff",
      border: "1px solid transparent",
    },
    secondary: {
      backgroundColor: palette.surface,
      color: palette.primary,
      border: `1px solid ${hover ? palette.borderStrong : palette.border}`,
    },
    ghost: {
      backgroundColor: hover ? palette.bg : "transparent",
      color: palette.muted,
      border: "1px solid transparent",
    },
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...styles[variant] }}
    >
      {children}
    </button>
  );
}

/** Styled native select that inherits the app theme (keeps RTL correct). */
export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="appearance-none outline-none"
        style={{
          height: 40,
          width: "100%",
          borderRadius: 12,
          border: `1px solid ${palette.border}`,
          backgroundColor: palette.surface,
          color: palette.text,
          fontSize: 14,
          padding: "0 34px 0 14px",
        }}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{ insetInlineEnd: 12, color: palette.muted }}
      />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="outline-none"
      style={{
        height: 40,
        width: "100%",
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
        color: palette.text,
        fontSize: 14,
        padding: "0 14px",
        ...style,
      }}
    />
  );
}

/** Slim productivity bar. */
export function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? "#4d8a6a" : value >= 65 ? palette.accent : palette.rose;
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          height: 6,
          flex: 1,
          minWidth: 60,
          borderRadius: 999,
          backgroundColor: palette.bg,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${value}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: palette.muted, width: 34 }}>
        {value}%
      </span>
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: palette.accentSoft,
        color: palette.accent,
        fontWeight: 700,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padding = 20,
}: {
  children: ReactNode;
  className?: string;
  padding?: number;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        padding,
      }}
    >
      {children}
    </div>
  );
}
