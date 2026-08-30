import { useEffect, useState } from "react";
import {
  ArchiveRestore,
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  FileCheck2,
  FolderOpen,
  HardDriveDownload,
  Info,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Usb,
} from "lucide-react";
import { PageHeading } from "../components/commerce-ui";
import { Button, Card } from "../components/kit";
import { ModalShell } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import {
  backupCopy,
  backupErrorMessage,
  backupResultState,
  formatBackupSize,
  isBackupActionDisabled,
} from "./backup-page.logic";

function formatBackupDate(value: string | undefined, lang: "ar" | "fr") {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SettingsPage() {
  const { lang } = useLanguage();
  const copy = backupCopy[lang];
  const backupApi = window.khayatiBackup;
  const [status, setStatus] = useState<BackupStatus>({ hasBackup: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<BackupCreateResult | null>(null);
  const [inspection, setInspection] = useState<BackupInspectionResult | null>(
    null,
  );
  const [restoring, setRestoring] = useState(false);
  const [restoreCompleted, setRestoreCompleted] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<BackupRestoreProgress>({
    active: false,
    step: "IDLE",
  });

  useEffect(() => {
    let active = true;
    if (!backupApi) {
      setLoadingStatus(false);
      return;
    }
    void backupApi
      .getStatus()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setStatus({ hasBackup: false });
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, [backupApi]);

  useEffect(() => {
    if (!backupApi) return;
    return backupApi.onRestoreProgress((progress) => {
      setRestoreProgress(progress);
    });
  }, [backupApi]);

  async function createBackup(external = false) {
    if (!backupApi || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = external
        ? await backupApi.createExternalBackup({ language: lang })
        : await backupApi.createBackup({ language: lang });
      const resultState = backupResultState(result);
      if (resultState === "cancelled") return;
      if (resultState === "error") {
        setError(backupErrorMessage(result.errorCode, lang));
        return;
      }
      setSuccess(result);
      setStatus({
        hasBackup: true,
        lastBackupAt: result.createdAt,
        lastBackupFileName: result.fileName,
        lastBackupSize: result.size,
        lastBackupLocationType: result.locationType,
      });
    } catch {
      setError(backupErrorMessage("BACKUP_UNKNOWN", lang));
    } finally {
      setBusy(false);
    }
  }

  async function inspectBackup() {
    if (!backupApi || inspecting || busy) return;
    setInspecting(true);
    setError(null);
    try {
      const result = await backupApi.selectRestoreFile({ language: lang });
      const resultState = backupResultState(result);
      if (resultState === "cancelled") return;
      if (resultState === "error") {
        setError(backupErrorMessage(result.errorCode, lang));
        return;
      }
      setRestoreCompleted(false);
      setRestoreProgress({ active: false, step: "IDLE" });
      setInspection(result);
    } catch {
      setError(backupErrorMessage("BACKUP_UNKNOWN", lang));
    } finally {
      setInspecting(false);
    }
  }

  async function restoreSelectedBackup() {
    if (
      !backupApi ||
      restoring ||
      !inspection?.restoreCandidateId
    ) {
      return;
    }
    setRestoring(true);
    setRestoreCompleted(false);
    setError(null);
    setRestoreProgress({ active: true, step: "VALIDATING" });
    try {
      const result = await backupApi.restoreBackup({
        restoreCandidateId: inspection.restoreCandidateId,
        language: lang,
      });
      if (!result.success) {
        setError(backupErrorMessage(result.errorCode, lang));
        setRestoring(false);
        setInspection(null);
        return;
      }
      setRestoreCompleted(true);
      setRestoreProgress({ active: false, step: "RESTARTING" });
    } catch {
      setError(backupErrorMessage("RESTORE_FAILED", lang));
      setRestoring(false);
      setInspection(null);
    }
  }

  async function openLocation() {
    if (!backupApi || !success?.locationId) return;
    const result = await backupApi.openBackupLocation(success.locationId);
    if (!result.success) setError(backupErrorMessage(result.errorCode, lang));
  }

  const lastType =
    status.lastBackupLocationType === "EXTERNAL" ? copy.external : copy.manual;
  const actionsDisabled = isBackupActionDisabled(
    Boolean(backupApi),
    busy,
    inspecting,
    restoring,
  );

  const restoreStepOrder = [
    "VALIDATING",
    "SAFETY_BACKUP",
    "PREPARING",
    "MIGRATING",
    "SWAPPING",
    "FINAL_VALIDATION",
    "RESTARTING",
  ] as const;
  const activeRestoreStep = restoreStepOrder.indexOf(
    restoreProgress.step as (typeof restoreStepOrder)[number],
  );

  return (
    <PageBackground>
      <PageHeading title={copy.title} subtitle={copy.subtitle} />

      {!backupApi ? (
        <div
          className="mt-6 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.muted,
          }}
        >
          <Info size={19} style={{ color: palette.info }} />
          {copy.unavailable}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border px-5 py-4 text-sm font-semibold"
          style={{
            backgroundColor: "var(--app-danger-surface)",
            borderColor: "rgba(201,138,134,0.35)",
            color: "var(--app-negative)",
          }}
        >
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.45fr]">
        <Card className="min-h-[235px]" padding={24}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="text-sm font-bold"
                style={{ color: palette.muted }}
              >
                {copy.lastBackup}
              </div>
              {loadingStatus ? (
                <div
                  className="mt-5 flex items-center gap-2"
                  style={{ color: palette.muted }}
                >
                  <LoaderCircle className="animate-spin" size={18} />
                  <span>...</span>
                </div>
              ) : status.hasBackup ? (
                <>
                  <div
                    className="mt-3 text-xl font-extrabold"
                    style={{ color: palette.text }}
                  >
                    {formatBackupDate(status.lastBackupAt, lang)}
                  </div>
                  <div
                    dir="ltr"
                    className="mt-2 break-all text-start text-sm"
                    style={{ color: palette.primary }}
                  >
                    {status.lastBackupFileName}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <InfoValue
                      label={copy.size}
                      value={formatBackupSize(status.lastBackupSize, lang)}
                    />
                    <InfoValue label={copy.type} value={lastType} />
                  </div>
                </>
              ) : (
                <div
                  className="mt-6 text-base font-semibold"
                  style={{ color: palette.muted }}
                >
                  {copy.noBackup}
                </div>
              )}
            </div>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: palette.accentSoft,
                color: palette.accent,
              }}
            >
              <DatabaseBackup size={23} />
            </div>
          </div>
        </Card>

        <Card className="min-h-[235px]" padding={26}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[620px]">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "rgba(77,138,106,0.12)",
                    color: "var(--app-positive)",
                  }}
                >
                  <ShieldCheck size={22} />
                </span>
                <h2
                  className="text-xl font-extrabold"
                  style={{ color: palette.text }}
                >
                  {copy.actions}
                </h2>
              </div>
              <p
                className="mt-4 text-sm leading-7"
                style={{ color: palette.muted }}
              >
                {copy.actionsDescription}
              </p>
              <p className="mt-2 text-xs" style={{ color: palette.muted }}>
                {copy.usbHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void createBackup(false)}
              disabled={actionsDisabled}
              className="flex min-h-14 min-w-[245px] items-center justify-center gap-3 rounded-2xl px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
              style={{ backgroundColor: palette.primary }}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={21} />
              ) : (
                <HardDriveDownload size={21} />
              )}
              {busy ? copy.creating : copy.create}
            </button>
          </div>
          {busy ? (
            <div
              className="mt-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: palette.bg, color: palette.muted }}
            >
              <LoaderCircle
                className="animate-spin"
                size={17}
                style={{ color: palette.primary }}
              />
              {copy.preparing}
            </div>
          ) : null}
        </Card>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card padding={24}>
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: palette.accentSoft,
                color: palette.accent,
              }}
            >
              <Usb size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                className="text-lg font-extrabold"
                style={{ color: palette.text }}
              >
                {copy.externalTitle}
              </h2>
              <p
                className="mt-2 text-sm leading-7"
                style={{ color: palette.muted }}
              >
                {copy.externalDescription}
              </p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  disabled={actionsDisabled}
                  onClick={() => void createBackup(true)}
                >
                  <Usb size={18} />
                  {copy.externalButton}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card padding={24}>
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: "rgba(88,124,146,0.13)",
                color: "var(--app-info)",
              }}
            >
              <ArchiveRestore size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                className="text-lg font-extrabold"
                style={{ color: palette.text }}
              >
                {copy.inspect}
              </h2>
              <p
                className="mt-2 text-sm leading-7"
                style={{ color: palette.muted }}
              >
                {copy.inspectHelp}
              </p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  disabled={actionsDisabled}
                  onClick={() => void inspectBackup()}
                >
                  {inspecting ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <FileCheck2 size={18} />
                  )}
                  {copy.inspect}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section
        className="mt-5 flex items-start gap-4 rounded-2xl border px-5 py-4"
        style={{
          backgroundColor: "var(--app-warning-panel)",
          borderColor: "var(--app-warning-border)",
        }}
      >
        <ShieldCheck
          className="mt-0.5 shrink-0"
          size={19}
          style={{ color: palette.accent }}
        />
        <div>
          <h3
            className="text-sm font-extrabold"
            style={{ color: palette.text }}
          >
            {copy.adviceTitle}
          </h3>
          <p
            className="mt-1 text-sm leading-7"
            style={{ color: palette.muted }}
          >
            {copy.advice}
          </p>
        </div>
      </section>

      <ModalShell
        open={Boolean(success)}
        onClose={() => setSuccess(null)}
        title={copy.successTitle}
      >
        {success ? (
          <div className="p-6">
            <div className="flex justify-center">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "rgba(77,138,106,0.13)",
                  color: "var(--app-positive)",
                }}
              >
                <CheckCircle2 size={31} />
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              <InfoValue
                label={copy.fileName}
                value={success.fileName ?? "—"}
                ltr
              />
              <InfoValue
                label={copy.size}
                value={formatBackupSize(success.size, lang)}
              />
            </div>
            {success.warnings?.length ? (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "var(--app-warning-panel)",
                  color: "var(--app-warning)",
                }}
              >
                {copy.warningAssets}
              </div>
            ) : null}
            <p
              className="mt-5 text-center text-sm leading-7"
              style={{ color: palette.muted }}
            >
              {copy.successAdvice}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setSuccess(null)}>
                {copy.close}
              </Button>
              {success.locationId ? (
                <Button variant="primary" onClick={() => void openLocation()}>
                  <FolderOpen size={18} />
                  {copy.openLocation}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={Boolean(inspection)}
        onClose={() => {
          if (!restoring) setInspection(null);
        }}
        title={copy.inspectionTitle}
        maxWidth={640}
      >
        {inspection ? (
          <div className="p-6">
            <div
              className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
              style={{ backgroundColor: "rgba(77,138,106,0.1)" }}
            >
              <div className="flex items-center gap-3">
                <FileCheck2
                  size={23}
                  style={{ color: "var(--app-positive)" }}
                />
                <span
                  className="font-extrabold"
                  style={{ color: palette.text }}
                >
                  {copy.valid}
                </span>
              </div>
              <span
                dir="ltr"
                className="break-all text-sm"
                style={{ color: palette.primary }}
              >
                {inspection.fileName}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoValue
                label={copy.backupDate}
                value={formatBackupDate(inspection.createdAt, lang)}
              />
              <InfoValue
                label={copy.size}
                value={formatBackupSize(inspection.size, lang)}
              />
              <InfoValue
                label={copy.appVersion}
                value={inspection.appVersion ?? "—"}
                ltr
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Count
                label={copy.customers}
                value={inspection.statistics?.customers}
              />
              <Count
                label={copy.suppliers}
                value={inspection.statistics?.suppliers}
              />
              <Count
                label={copy.workers}
                value={inspection.statistics?.workers}
              />
              <Count
                label={copy.invoices}
                value={inspection.statistics?.invoices}
              />
              <Count
                label={copy.products}
                value={inspection.statistics?.finishedProducts}
              />
            </div>
            {!restoring ? (
              <div
                className="mt-5 flex items-start gap-3 rounded-xl border px-4 py-4 text-sm leading-7"
                style={{
                  backgroundColor: "var(--app-warning-panel)",
                  borderColor: "var(--app-warning-border)",
                  color: palette.text,
                }}
              >
                <AlertTriangle
                  className="mt-1 shrink-0"
                  size={19}
                  style={{ color: "var(--app-warning)" }}
                />
                {copy.restoreWarning}
              </div>
            ) : (
              <div className="mt-5">
                <div
                  className="flex items-center gap-3 text-sm font-extrabold"
                  style={{ color: palette.text }}
                >
                  <LoaderCircle
                    className={restoreCompleted ? "" : "animate-spin"}
                    size={19}
                    style={{ color: palette.primary }}
                  />
                  {restoreCompleted
                    ? copy.restoreSuccess
                    : copy.restoreProgressTitle}
                </div>
                <div className="mt-4 grid gap-2">
                  {restoreStepOrder.map((step, index) => {
                    const reached = activeRestoreStep >= index;
                    const current = activeRestoreStep === index;
                    return (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                        style={{
                          backgroundColor: current
                            ? "rgba(88,124,146,0.13)"
                            : palette.bg,
                          color: reached ? palette.text : palette.muted,
                        }}
                      >
                        {current && !restoreCompleted ? (
                          <LoaderCircle className="animate-spin" size={16} />
                        ) : reached ? (
                          <CheckCircle2
                            size={16}
                            style={{ color: "var(--app-positive)" }}
                          />
                        ) : (
                          <span
                            className="h-4 w-4 rounded-full border"
                            style={{ borderColor: palette.border }}
                          />
                        )}
                        {copy.restoreSteps[step]}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!restoring ? (
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => setInspection(null)}>
                  {copy.cancel}
                </Button>
                <button
                  type="button"
                  onClick={() => void restoreSelectedBackup()}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white"
                  style={{ backgroundColor: "var(--app-warning)" }}
                >
                  <RotateCcw size={17} />
                  {copy.restoreButton}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalShell>
    </PageBackground>
  );
}

function InfoValue({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div
      className="min-w-0 rounded-xl px-4 py-3"
      style={{ backgroundColor: palette.bg }}
    >
      <div className="text-xs" style={{ color: palette.muted }}>
        {label}
      </div>
      <div
        dir={ltr ? "ltr" : undefined}
        className="mt-1 break-all text-sm font-bold"
        style={{ color: palette.text }}
      >
        {value}
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div
      className="rounded-xl border p-3 text-center"
      style={{ borderColor: palette.border }}
    >
      <div className="text-lg font-extrabold" style={{ color: palette.text }}>
        {value ?? 0}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: palette.muted }}>
        {label}
      </div>
    </div>
  );
}
