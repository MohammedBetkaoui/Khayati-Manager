import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { API_BASE_URL } from "../lib/api";
import { PageBackground } from "../components/page-background";
import { Avatar, Badge } from "../components/kit";
import { SummaryCards } from "../components/workers/summary-cards";
import { ActionBar, type Filters } from "../components/workers/action-bar";
import { WorkersTable } from "../components/workers/workers-table";
import { WorkerDetailsPanel } from "../components/workers/worker-details-panel";
import {
  AddWorkerModal,
  type AddWorkerForm,
} from "../components/workers/add-worker-modal";
import { DeleteWorkerModal } from "../components/workers/delete-worker-modal";
import {
  AddNoteModal,
  MarkAttendanceModal,
  type AttendanceForm,
  type NoteForm,
} from "../components/workers/worker-action-modals";
import {
  getRoleColors,
  getRoleLabel,
  roleLabels,
  workersText,
  type SalaryId,
  type StatusId,
  type Worker,
  type WorkerRoleChoice,
} from "./workers-data";

type TabId = "all" | "attendance" | "notes";

type ApiWorker = {
  id: number;
  fullName: string;
  phone?: string | null;
  role: string;
  salaryType: string;
  monthlySalary?: number | string | null;
  startDate?: string | null;
  status?: string | null;
  notes?: string | null;
  totalPiecesCompleted?: number | string | null;
  attendanceStatusToday?: string | null;
  productivityPercent?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiWorkersResponse = {
  data: ApiWorker[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ApiWorkersStats = {
  totalWorkers: number;
  activeWorkers: number;
  presentToday: number;
  absentToday: number;
  totalPiecesThisMonth: number;
};

type ApiWorkerRole = {
  id: number | null;
  name: string;
  isCustom: boolean;
};

type ApiWorkerRolesResponse = { data: ApiWorkerRole[] };

type ApiAttendanceStatus = "حاضر" | "غائب" | "متأخر";

type ApiAttendanceResponse = {
  data: { id: number }[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const emptyStats: ApiWorkersStats = {
  totalWorkers: 0,
  activeWorkers: 0,
  presentToday: 0,
  absentToday: 0,
  totalPiecesThisMonth: 0,
};

const roleToApi: Record<string, string> = {
  tailor: "خياط",
  assistant: "مساعد",
  cutter: "قاطع قماش",
  ironing: "مسؤول كي",
  packaging: "مسؤول تغليف",
  seller: "بائع",
  supervisor: "مشرف",
};

const roleFromApi = Object.fromEntries(
  Object.entries(roleToApi).map(([key, value]) => [value, key]),
) as Record<string, string>;

const salaryToApi: Record<SalaryId, string> = {
  monthly: "شهري",
  piece: "حسب القطعة",
};

const salaryFromApi = Object.fromEntries(
  Object.entries(salaryToApi).map(([key, value]) => [value, key]),
) as Record<string, SalaryId>;

const statusToApi: Record<StatusId, string> = {
  active: "نشط",
  leave: "في عطلة",
  inactive: "غير نشط",
  archived: "مؤرشف",
};

const statusFromApi = Object.fromEntries(
  Object.entries(statusToApi).map(([key, value]) => [value, key]),
) as Record<string, StatusId>;

const attendanceToApi: Record<AttendanceForm["status"], ApiAttendanceStatus> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

const salaryUnits: Record<SalaryId, { ar: string; fr: string }> = {
  monthly: { ar: "شهر", fr: "mois" },
  piece: { ar: "متغير حسب الأسبوع", fr: "variable par semaine" },
};

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSalaryValue(value: string) {
  const match = value.replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatSalaryRate(salaryType: SalaryId, value: unknown) {
  if (salaryType === "piece") {
    return {
      ar: "السعر يحدد عند كل راتب",
      fr: "Prix défini à chaque paie",
    };
  }
  const amount = numeric(value).toLocaleString("fr-DZ");
  const unit = salaryUnits[salaryType];
  return {
    ar: `${amount} دج / ${unit.ar}`,
    fr: `${amount} DA / ${unit.fr}`,
  };
}

function mapApiWorker(worker: ApiWorker): Worker {
  const role = roleFromApi[worker.role] ?? worker.role;
  const salaryType = salaryFromApi[worker.salaryType] ?? "monthly";
  const status = statusFromApi[worker.status ?? ""] ?? "active";
  const attendanceStatus = worker.attendanceStatusToday ?? "";
  const totalPieces = numeric(worker.totalPiecesCompleted);
  const monthlySalary = numeric(worker.monthlySalary);

  return {
    id: String(worker.id),
    name: { ar: worker.fullName, fr: worker.fullName },
    role,
    phone: worker.phone ?? "",
    startDate: worker.startDate ? worker.startDate.slice(0, 10) : "-",
    salaryType,
    monthlySalary,
    salaryRate: formatSalaryRate(salaryType, monthlySalary),
    attendance:
      attendanceStatus === "حاضر" || attendanceStatus === "متأخر"
        ? "present"
        : "absent",
    pieces: totalPieces,
    productivity: Math.max(
      0,
      Math.min(100, Math.round(numeric(worker.productivityPercent))),
    ),
    status,
    note: {
      ar: worker.notes || "لا توجد ملاحظات",
      fr: worker.notes || "Aucune note",
    },
  };
}

function workerToForm(worker: Worker): AddWorkerForm {
  return {
    name: worker.name.ar,
    phone: worker.phone,
    role: worker.role,
    startDate: worker.startDate === "-" ? "" : worker.startDate,
    salaryType: worker.salaryType,
    monthlySalary: String(
      worker.monthlySalary ?? parseSalaryValue(worker.salaryRate.ar),
    ),
    notes: worker.note.ar === "لا توجد ملاحظات" ? "" : worker.note.ar,
    status: worker.status,
  };
}

function workerPayloadFromForm(form: AddWorkerForm) {
  return {
    fullName: form.name.trim(),
    phone: form.phone.trim(),
    role: roleToApi[form.role] ?? form.role,
    salaryType: salaryToApi[form.salaryType],
    monthlySalary:
      form.salaryType === "monthly" ? parseSalaryValue(form.monthlySalary) : 0,
    startDate: form.startDate,
    status: statusToApi[form.status],
    notes: form.notes.trim(),
  };
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function WorkersPage() {
  const { lang, dir } = useLanguage();
  const t = workersText[lang];
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    query: "",
    role: "all",
    salary: "all",
    status: "all",
    period: "month",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<AddWorkerForm | null>(null);
  const [attendanceWorkerId, setAttendanceWorkerId] = useState<string | null>(
    null,
  );
  const [noteWorkerId, setNoteWorkerId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<Worker[]>([]);
  const [stats, setStats] = useState<ApiWorkersStats>(emptyStats);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [roleOptionNames, setRoleOptionNames] = useState<string[]>(() =>
    Object.values(roleToApi),
  );

  const roleChoices = useMemo<WorkerRoleChoice[]>(
    () =>
      roleOptionNames.map((name) => {
        const value = roleFromApi[name] ?? name;
        return {
          value,
          label: roleLabels[value]?.[lang] ?? name,
        };
      }),
    [lang, roleOptionNames],
  );

  const workersQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: "1",
      limit: "100",
      sortBy: "fullName",
      sortOrder: "ASC",
    });

    if (filters.query.trim()) params.set("search", filters.query.trim());
    if (filters.role !== "all") {
      params.set("role", roleToApi[filters.role] ?? filters.role);
    }
    if (filters.salary !== "all")
      params.set("salaryType", salaryToApi[filters.salary]);
    if (filters.status !== "all")
      params.set("status", statusToApi[filters.status]);

    return params.toString();
  }, [filters.query, filters.role, filters.salary, filters.status]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchJson<ApiWorkerRolesResponse>("/workers/roles", {
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setRoleOptionNames(
          Array.from(new Set(response.data.map((role) => role.name))),
        );
      })
      .catch(() => {
        // Keep the built-in roles available if this secondary request fails.
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkers() {
      setLoading(true);
      setError(null);

      try {
        const [workersResponse, statsResponse] = await Promise.all([
          fetchJson<ApiWorkersResponse>(`/workers?${workersQuery}`, {
            signal: controller.signal,
          }),
          fetchJson<ApiWorkersStats>("/workers/stats", {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) return;

        setRows(workersResponse.data.map(mapApiWorker));
        setTotalRows(workersResponse.meta.total);
        setStats(statsResponse);
      } catch (err) {
        if (controller.signal.aborted) return;

        setRows([]);
        setTotalRows(0);
        setStats(emptyStats);
        setError(err instanceof Error ? err.message : "Unable to load workers");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadWorkers();

    return () => controller.abort();
  }, [workersQuery, refreshKey]);

  useEffect(() => {
    if (selectedId && !rows.some((worker) => worker.id === selectedId)) {
      setSelectedId(null);
    }
    if (
      editingWorkerId &&
      !rows.some((worker) => worker.id === editingWorkerId) &&
      !editingForm
    ) {
      setEditingWorkerId(null);
    }
  }, [rows, selectedId, editingWorkerId, editingForm]);

  const selected = rows.find((w) => w.id === selectedId) ?? null;
  const attendanceWorker =
    rows.find((w) => w.id === attendanceWorkerId) ?? null;
  const noteWorker = rows.find((w) => w.id === noteWorkerId) ?? null;
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  async function handleCreateWorker(form: AddWorkerForm) {
    setSavingWorker(true);
    setError(null);

    try {
      await fetchJson<ApiWorker>("/workers", {
        method: "POST",
        body: JSON.stringify(workerPayloadFromForm(form)),
      });
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create worker");
      throw err;
    } finally {
      setSavingWorker(false);
    }
  }

  async function handleCreateRole(name: string): Promise<WorkerRoleChoice> {
    const created = await fetchJson<ApiWorkerRole>("/workers/roles", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    setRoleOptionNames((current) =>
      current.includes(created.name) ? current : [...current, created.name],
    );

    const value = roleFromApi[created.name] ?? created.name;
    return {
      value,
      label: roleLabels[value]?.[lang] ?? created.name,
    };
  }

  async function openEditWorker(id: string) {
    setSelectedId(id);
    setEditingWorkerId(id);
    setEditingForm(null);
    setError(null);

    const localWorker = rows.find((worker) => worker.id === id);
    if (localWorker) {
      setEditingForm(workerToForm(localWorker));
    }

    try {
      const freshWorker = await fetchJson<ApiWorker>(`/workers/${id}`);
      setEditingForm(workerToForm(mapApiWorker(freshWorker)));
    } catch (err) {
      if (!localWorker) {
        setEditingWorkerId(null);
        setEditingForm(null);
      }
      setError(
        err instanceof Error ? err.message : "Unable to load worker data",
      );
    }
  }

  async function handleUpdateWorker(form: AddWorkerForm) {
    if (!editingWorkerId) return;

    setSavingWorker(true);
    setError(null);

    try {
      await fetchJson<ApiWorker>(`/workers/${editingWorkerId}`, {
        method: "PATCH",
        body: JSON.stringify(workerPayloadFromForm(form)),
      });
      setRefreshKey((key) => key + 1);
      setEditingWorkerId(null);
      setEditingForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update worker");
      throw err;
    } finally {
      setSavingWorker(false);
    }
  }

  function openAttendance(workerId: string) {
    setSelectedId(workerId);
    setAttendanceWorkerId(workerId);
    setError(null);
  }

  async function handleMarkAttendance(form: AttendanceForm) {
    if (!attendanceWorkerId) return;

    setSavingAction(true);
    setError(null);

    try {
      const payload = {
        date: form.date,
        status: attendanceToApi[form.status],
        checkInTime: form.checkInTime || undefined,
        checkOutTime: form.checkOutTime || undefined,
        lateMinutes: Number(form.lateMinutes) || 0,
        notes: form.notes.trim() || undefined,
      };
      const params = new URLSearchParams({
        startDate: form.date,
        endDate: form.date,
        limit: "1",
      });
      const existing = await fetchJson<ApiAttendanceResponse>(
        `/workers/${attendanceWorkerId}/attendance?${params.toString()}`,
      );
      const attendanceId = existing.data[0]?.id;

      if (attendanceId) {
        await fetchJson(`/workers/attendance/${attendanceId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson(`/workers/${attendanceWorkerId}/attendance`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setAttendanceWorkerId(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to mark attendance",
      );
      throw err;
    } finally {
      setSavingAction(false);
    }
  }

  function openNote(workerId: string) {
    setSelectedId(workerId);
    setNoteWorkerId(workerId);
    setError(null);
  }

  function openWorkerProfile(workerId: string) {
    navigate(`/worker-profile?workerId=${workerId}`);
  }

  async function handleAddNote(form: NoteForm) {
    if (!noteWorkerId) return;

    const notes = form.notes.trim();
    if (!notes) return;

    setSavingAction(true);
    setError(null);

    try {
      await fetchJson<ApiWorker>(`/workers/${noteWorkerId}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      setNoteWorkerId(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note");
      throw err;
    } finally {
      setSavingAction(false);
    }
  }

  async function handleDeleteWorker() {
    if (!workerToDelete) return;

    try {
      await fetchJson(`/workers/${workerToDelete}`, { method: "DELETE" });
      if (selectedId === workerToDelete) setSelectedId(null);
      if (editingWorkerId === workerToDelete) {
        setEditingWorkerId(null);
        setEditingForm(null);
      }
      if (attendanceWorkerId === workerToDelete) setAttendanceWorkerId(null);
      if (noteWorkerId === workerToDelete) setNoteWorkerId(null);
      setWorkerToDelete(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete worker");
      throw err;
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: t.tabs.all },
    { id: "attendance", label: t.tabs.attendance },
    { id: "notes", label: t.tabs.notes },
  ];

  return (
    <PageBackground>
      {/* Header & Back Button */}
      <div className="flex items-center gap-4 pt-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.primary,
          }}
        >
          <BackArrow size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2 }}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6">
        <SummaryCards
          total={stats.totalWorkers}
          present={stats.presentToday}
          absent={stats.absentToday}
          pieces={stats.totalPiecesThisMonth}
        />
      </div>

      {/* Action bar */}
      <div className="mt-5">
        <ActionBar
          filters={filters}
          onChange={setFilters}
          onAdd={() => setModalOpen(true)}
          roleChoices={roleChoices}
        />
      </div>

      {/* Main two-column layout */}
      <div
        className={`mt-5 grid grid-cols-1 gap-5 pb-10 ${selectedId ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}
      >
        {/* LEFT — list */}
        <section
          style={{
            backgroundColor: palette.surface,
            borderRadius: 22,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
            overflow: "hidden",
          }}
        >
          {/* Tabs */}
          <div
            className="flex items-center gap-1 px-4 pt-4"
            style={{ borderBottom: `1px solid ${palette.border}` }}
          >
            {tabs.map((tb) => {
              const active = tb.id === tab;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setTab(tb.id)}
                  className="relative transition-colors"
                  style={{
                    padding: "10px 16px 14px",
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? palette.primary : palette.muted,
                  }}
                >
                  {tb.label}
                  {active ? (
                    <span
                      className="absolute inset-x-2"
                      style={{
                        bottom: -1,
                        height: 2.5,
                        borderRadius: 999,
                        backgroundColor: palette.primary,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {loading || error || rows.length === 0 ? (
              <WorkersStateBlock
                loading={loading}
                error={error}
                hasWorkers={stats.totalWorkers > 0}
              />
            ) : (
              <>
                {tab === "all" && (
                  <WorkersTable
                    rows={rows}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onEdit={openEditWorker}
                    onDelete={setWorkerToDelete}
                    onOpenProfile={openWorkerProfile}
                  />
                )}
                {tab === "attendance" && (
                  <AttendanceList
                    rows={rows}
                    onSelect={setSelectedId}
                    onChangeAttendance={openAttendance}
                  />
                )}
                {tab === "notes" && (
                  <NotesList rows={rows} onSelect={setSelectedId} />
                )}
              </>
            )}
          </div>

          {/* Footer count */}
          <div
            className="flex items-center px-5 py-3"
            style={{
              borderTop: `1px solid ${palette.border}`,
              fontSize: 12.5,
              color: palette.muted,
            }}
          >
            {t.showing} {rows.length} {t.of} {totalRows} {t.workers}
          </div>
        </section>

        {/* RIGHT — sidebar */}
        {selectedId && (
          <aside className="flex flex-col gap-5">
            <WorkerDetailsPanel
              worker={selected}
              onClose={() => setSelectedId(null)}
              onEdit={openEditWorker}
              onMarkAttendance={openAttendance}
              onAddNote={openNote}
              onOpenProfile={openWorkerProfile}
            />
          </aside>
        )}
      </div>

      <AddWorkerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateWorker}
        isSaving={savingWorker}
        roleChoices={roleChoices}
        onCreateRole={handleCreateRole}
      />
      <DeleteWorkerModal
        open={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={handleDeleteWorker}
      />
      <AddWorkerModal
        open={!!editingWorkerId && !!editingForm}
        onClose={() => {
          setEditingWorkerId(null);
          setEditingForm(null);
        }}
        onSubmit={handleUpdateWorker}
        initialValues={editingForm}
        isSaving={savingWorker}
        mode="edit"
        roleChoices={roleChoices}
        onCreateRole={handleCreateRole}
      />
      <MarkAttendanceModal
        open={!!attendanceWorkerId}
        worker={attendanceWorker}
        onClose={() => setAttendanceWorkerId(null)}
        onSubmit={handleMarkAttendance}
        isSaving={savingAction}
      />
      <AddNoteModal
        open={!!noteWorkerId}
        worker={noteWorker}
        onClose={() => setNoteWorkerId(null)}
        onSubmit={handleAddNote}
        isSaving={savingAction}
      />
    </PageBackground>
  );
}

/* ---- Tab content variants (kept lightweight, same row styling) ---- */

function WorkersStateBlock({
  loading,
  error,
  hasWorkers,
}: {
  loading: boolean;
  error: string | null;
  hasWorkers: boolean;
}) {
  const { lang } = useLanguage();

  const title = loading
    ? lang === "ar"
      ? "جاري تحميل بيانات العمال..."
      : "Chargement des travailleurs..."
    : error
      ? lang === "ar"
        ? "تعذر تحميل بيانات العمال"
        : "Impossible de charger les travailleurs"
      : hasWorkers
        ? lang === "ar"
          ? "لا توجد نتائج مطابقة"
          : "Aucun résultat avec ces filtres"
        : lang === "ar"
          ? "لا توجد بيانات عمال بعد"
          : "Aucun travailleur pour le moment";

  const description = loading
    ? lang === "ar"
      ? "يتم جلب البيانات مباشرة من قاعدة SQLite."
      : "Les données sont lues directement depuis SQLite."
    : error
      ? lang === "ar"
        ? "تأكد من تشغيل خادم NestJS وأن رابط API صحيح."
        : "Vérifiez que le serveur NestJS est lancé et que l'URL API est correcte."
      : hasWorkers
        ? lang === "ar"
          ? "جرّب تغيير البحث أو إزالة بعض الفلاتر لعرض العمال."
          : "Essayez de modifier la recherche ou de retirer certains filtres."
        : lang === "ar"
          ? "قاعدة البيانات فارغة. أضف أول عامل أو شغّل seed workers لملء الصفحة."
          : "La base de données est vide. Ajoutez un premier travailleur ou lancez le seed workers.";

  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center text-center"
      style={{
        borderRadius: 18,
        border: `1px dashed ${palette.borderStrong}`,
        backgroundColor: palette.bg,
        padding: 28,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>
        {title}
      </div>
      <p
        style={{
          marginTop: 8,
          maxWidth: 440,
          fontSize: 13.5,
          color: palette.muted,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
      {error ? (
        <p
          style={{
            marginTop: 10,
            maxWidth: 520,
            fontSize: 12,
            color: palette.rose,
            lineHeight: 1.6,
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RowShell({
  worker,
  onSelect,
  children,
}: {
  worker: Worker;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const { lang } = useLanguage();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(worker.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(worker.id);
      }}
      className="flex w-full items-center gap-3 text-start transition-colors"
      style={{
        padding: "12px 12px",
        borderRadius: 14,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
      }}
    >
      <Avatar name={worker.name[lang]} />
      <div className="min-w-0 flex-1">
        <div style={{ fontWeight: 600, fontSize: 14 }}>{worker.name[lang]}</div>
        <div style={{ fontSize: 12, color: palette.muted }}>
          {getRoleLabel(worker.role, lang)}
        </div>
      </div>
      {children}
    </div>
  );
}

function AttendanceList({
  rows,
  onSelect,
  onChangeAttendance,
}: {
  rows: Worker[];
  onSelect: (id: string) => void;
  onChangeAttendance: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = workersText[lang];
  const actionLabel = lang === "ar" ? "تغيير الحالة" : "Changer l'état";
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((w) => {
        const present = w.attendance === "present";
        return (
          <RowShell key={w.id} worker={w} onSelect={onSelect}>
            <div className="flex items-center gap-2.5">
              <Badge
                bg={
                  present ? "rgba(77,138,106,0.14)" : "rgba(201,138,134,0.14)"
                }
                fg={present ? "#4d8a6a" : "#b46a66"}
                dot={present ? "#4d8a6a" : "#b46a66"}
              >
                {present ? t.present : t.absent}
              </Badge>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeAttendance(w.id);
                }}
                className="inline-flex items-center gap-1.5 transition-colors hover:opacity-85"
                style={{
                  height: 32,
                  padding: "0 11px",
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  backgroundColor: palette.surface,
                  color: palette.primary,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <CalendarCheck size={15} />
                {actionLabel}
              </button>
            </div>
          </RowShell>
        );
      })}
    </div>
  );
}

function NotesList({
  rows,
  onSelect,
}: {
  rows: Worker[];
  onSelect: (id: string) => void;
}) {
  const { lang } = useLanguage();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onSelect(w.id)}
          className="flex flex-col gap-2 text-start transition-colors"
          style={{
            padding: 14,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.surface,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Avatar name={w.name[lang]} size={30} />
            <div className="min-w-0 flex-1">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                {w.name[lang]}
              </div>
            </div>
            <Badge bg={getRoleColors(w.role).bg} fg={getRoleColors(w.role).fg}>
              {getRoleLabel(w.role, lang)}
            </Badge>
          </div>
          <div
            className="flex items-start gap-2"
            style={{ fontSize: 13, color: palette.text, lineHeight: 1.6 }}
          >
            <StickyNote
              size={15}
              style={{ color: palette.accent, marginTop: 2, flexShrink: 0 }}
            />
            <span>{w.note[lang]}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
