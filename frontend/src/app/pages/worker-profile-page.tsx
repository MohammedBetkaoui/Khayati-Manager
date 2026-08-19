import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Coins, Scissors, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge, Select } from "../components/kit";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";

type WorkerOption = {
  id: number;
  fullName: string;
};

type WorkerProfile = {
  id: number;
  fullName: string;
  phone: string;
  role: string;
  salaryType: string;
  salaryValue: number;
  startDate: string;
  status: string;
  notes: string;
};

type AttendanceSummary = {
  presentDays: number;
  absentDays: number;
  lateDays: number;
};

type ProductionSummary = {
  totalPieces: number;
  totalAmount: number;
};

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  lateMinutes: number;
};

type ProductionRow = {
  id: string;
  date: string;
  taskType: string;
  piecesCompleted: number;
  totalAmount: number;
};

const emptyProfile: WorkerProfile = {
  id: 0,
  fullName: "",
  phone: "",
  role: "",
  salaryType: "",
  salaryValue: 0,
  startDate: "",
  status: "",
  notes: "",
};

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        backgroundColor: palette.surface,
        borderRadius: 18,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: palette.muted }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function mapWorkerOption(raw: unknown): WorkerOption {
  const record = asRecord(raw);
  return {
    id: getNumber(record?.id),
    fullName: getText(record?.fullName) || getText(record?.name) || "Sans nom",
  };
}

function mapAttendanceRow(raw: unknown): AttendanceRow {
  const record = asRecord(raw);
  return {
    id: getText(record?.id) || crypto.randomUUID(),
    date: getText(record?.date) || "-",
    status: getText(record?.status) || "-",
    checkIn: getText(record?.checkIn) || "-",
    checkOut: getText(record?.checkOut) || "-",
    lateMinutes: getNumber(record?.lateMinutes),
  };
}

function mapProductionRow(raw: unknown): ProductionRow {
  const record = asRecord(raw);
  return {
    id: getText(record?.id) || crypto.randomUUID(),
    date: getText(record?.date) || "-",
    taskType: getText(record?.taskType) || "-",
    piecesCompleted: getNumber(record?.piecesCompleted),
    totalAmount: getNumber(record?.totalAmount),
  };
}

export function WorkerProfilePage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [profile, setProfile] = useState<WorkerProfile>(emptyProfile);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({ presentDays: 0, absentDays: 0, lateDays: 0 });
  const [productionSummary, setProductionSummary] = useState<ProductionSummary>({ totalPieces: 0, totalAmount: 0 });
  const [lastSalary, setLastSalary] = useState<{ amount: number; status: string } | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [productionRows, setProductionRows] = useState<ProductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkers() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/workers?limit=100&sortBy=fullName&sortOrder=ASC");
        if (cancelled) return;
        const nextWorkers = getArrayFromPayload(payload).map(mapWorkerOption).filter((worker) => worker.id > 0);
        setWorkers(nextWorkers);
        setSelectedWorkerId((current) => current ?? nextWorkers[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setWorkers([]);
        setSelectedWorkerId(null);
        setError(err instanceof Error ? err.message : "Unable to load workers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWorkers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedWorkerId) {
      setProfile(emptyProfile);
      setAttendanceRows([]);
      setProductionRows([]);
      setAttendanceSummary({ presentDays: 0, absentDays: 0, lateDays: 0 });
      setProductionSummary({ totalPieces: 0, totalAmount: 0 });
      setLastSalary(null);
      return;
    }

    let cancelled = false;

    async function safeLoad(path: string) {
      try {
        return await fetchJson<unknown>(path);
      } catch {
        return null;
      }
    }

    async function loadProfile() {
      setDetailLoading(true);

      const [profilePayload, attendancePayload, productionPayload] = await Promise.all([
        safeLoad(`/workers/${selectedWorkerId}/profile`),
        safeLoad(`/workers/${selectedWorkerId}/attendance?limit=20`),
        safeLoad(`/workers/${selectedWorkerId}/production?limit=20`),
      ]);

      if (cancelled) return;

      const profileRecord = asRecord(profilePayload);
      const workerRecord = asRecord(profileRecord?.worker);
      const attendanceRecord = asRecord(profileRecord?.attendanceSummary);
      const productionRecord = asRecord(profileRecord?.productionSummary);
      const salaryRecord = asRecord(profileRecord?.lastSalary);

      setProfile({
        id: getNumber(workerRecord?.id),
        fullName: getText(workerRecord?.fullName),
        phone: getText(workerRecord?.phone),
        role: getText(workerRecord?.role),
        salaryType: getText(workerRecord?.salaryType),
        salaryValue: getNumber(workerRecord?.salaryValue),
        startDate: getText(workerRecord?.startDate),
        status: getText(workerRecord?.status),
        notes: getText(workerRecord?.notes),
      });
      setAttendanceSummary({
        presentDays: getNumber(attendanceRecord?.presentDays),
        absentDays: getNumber(attendanceRecord?.absentDays),
        lateDays: getNumber(attendanceRecord?.lateDays),
      });
      setProductionSummary({
        totalPieces: getNumber(productionRecord?.totalPieces),
        totalAmount: getNumber(productionRecord?.totalAmount),
      });
      setLastSalary(
        salaryRecord
          ? {
              amount: getNumber(salaryRecord.amount),
              status: getText(salaryRecord.status),
            }
          : null,
      );
      setAttendanceRows(getArrayFromPayload(attendancePayload).map(mapAttendanceRow));
      setProductionRows(getArrayFromPayload(productionPayload).map(mapProductionRow));
      setDetailLoading(false);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkerId]);

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === selectedWorkerId) ?? null,
    [selectedWorkerId, workers],
  );

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <PageBackground>
      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/workers")}
            className="flex items-center justify-center transition-colors hover:opacity-80"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}
          >
            <BackArrow size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
              <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
                {lang === "ar" ? "الرئيسية" : "Accueil"}
              </button>
              <CrumbChevron size={14} />
              <button type="button" onClick={() => navigate("/workers")} className="transition-colors hover:opacity-80">
                {lang === "ar" ? "تسيير العمال" : "Gestion des travailleurs"}
              </button>
              <CrumbChevron size={14} />
              <span style={{ color: palette.text, fontWeight: 600 }}>{lang === "ar" ? "ملف العامل" : "Fiche travailleur"}</span>
            </div>
            <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
              {lang === "ar" ? "ملف العامل" : "Fiche travailleur"}
            </h1>
            <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 700 }}>
              {lang === "ar"
                ? "البيانات هنا تأتي مباشرة من API العمال، الحضور، والإنتاج."
                : "Les donnees affichees ici proviennent directement des APIs workers, attendance et production."}
            </p>
          </div>
        </div>

        <div style={{ minWidth: 260 }}>
          <Select
            value={selectedWorkerId ? String(selectedWorkerId) : ""}
            onChange={(event) => setSelectedWorkerId(event.target.value ? Number(event.target.value) : null)}
          >
            {workers.length === 0 ? (
              <option value="">{lang === "ar" ? "لا يوجد عمال" : "Aucun travailleur"}</option>
            ) : (
              workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.fullName}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-sm" style={{ color: palette.muted }}>
          {lang === "ar" ? "جاري تحميل قائمة العمال..." : "Chargement de la liste des travailleurs..."}
        </div>
      ) : null}
      {!loading && error ? (
        <div className="mt-6 text-sm" style={{ color: "#b46a66" }}>
          {lang === "ar" ? "تعذر تحميل بيانات العمال." : "Impossible de charger les donnees des travailleurs."}
        </div>
      ) : null}

      {!loading && !selectedWorker ? (
        <div
          className="mt-6 rounded-2xl border p-6 text-sm"
          style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.muted }}
        >
          {lang === "ar"
            ? "لا يوجد عامل لعرض ملفه حالياً. أضف عاملاً من صفحة العمال أو أعد تشغيل seed workers."
            : "Aucun travailleur disponible pour afficher une fiche. Ajoutez un travailleur depuis la page workers ou relancez le seed workers."}
        </div>
      ) : null}

      {selectedWorker ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard label={lang === "ar" ? "الاسم" : "Nom"} value={profile.fullName || selectedWorker.fullName} accent={palette.primary} />
            <SummaryCard label={lang === "ar" ? "الدور" : "Role"} value={profile.role || "-"} accent="#6b8aa0" />
            <SummaryCard label={lang === "ar" ? "أيام الحضور" : "Jours presents"} value={String(attendanceSummary.presentDays)} accent="#4d8a6a" />
            <SummaryCard label={lang === "ar" ? "أيام الغياب" : "Jours absents"} value={String(attendanceSummary.absentDays)} accent="#b46a66" />
            <SummaryCard label={lang === "ar" ? "القطع المنجزة" : "Pieces realisees"} value={String(productionSummary.totalPieces)} accent="#a87d3c" />
            <SummaryCard label={lang === "ar" ? "آخر راتب" : "Dernier salaire"} value={`${lastSalary?.amount?.toLocaleString?.() ?? 0} ${lang === "ar" ? "د.ج" : "DA"}`} accent={palette.accent} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section
              style={{
                backgroundColor: palette.surface,
                borderRadius: 22,
                border: `1px solid ${palette.border}`,
                boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
                padding: 20,
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <UserRound size={18} style={{ color: palette.primary }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "معلومات العامل" : "Informations du travailleur"}</span>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "الهاتف" : "Telephone"}</span><span>{profile.phone || "-"}</span></div>
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "نوع الأجر" : "Type de salaire"}</span><span>{profile.salaryType || "-"}</span></div>
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "قيمة الأجر" : "Valeur"}</span><span>{profile.salaryValue.toLocaleString()} {lang === "ar" ? "د.ج" : "DA"}</span></div>
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "تاريخ البداية" : "Date de debut"}</span><span>{profile.startDate || "-"}</span></div>
                <div className="flex items-center justify-between">
                  <span style={{ color: palette.muted }}>{lang === "ar" ? "الحالة" : "Statut"}</span>
                  <Badge bg={`${palette.primary}12`} fg={palette.primary}>{profile.status || "-"}</Badge>
                </div>
              </div>

              <div className="mt-5 rounded-xl border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bg }}>
                <div className="mb-2 flex items-center gap-2">
                  <Coins size={16} style={{ color: "#4d8a6a" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{lang === "ar" ? "ملخص الراتب والإنتاج" : "Resume salaire et production"}</span>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "إجمالي المبلغ المنتج" : "Montant production"}</span><span>{productionSummary.totalAmount.toLocaleString()} {lang === "ar" ? "د.ج" : "DA"}</span></div>
                  <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "حالة آخر راتب" : "Statut dernier salaire"}</span><span>{lastSalary?.status || "-"}</span></div>
                </div>
              </div>

              {profile.notes ? (
                <div className="mt-5 rounded-xl border p-4 text-sm" style={{ borderColor: palette.border, backgroundColor: palette.bg }}>
                  <div className="mb-2 font-semibold" style={{ color: palette.text }}>{lang === "ar" ? "ملاحظات" : "Notes"}</div>
                  <div style={{ color: palette.muted, lineHeight: 1.7 }}>{profile.notes}</div>
                </div>
              ) : null}
            </section>

            <section className="flex flex-col gap-5">
              <div
                style={{
                  backgroundColor: palette.surface,
                  borderRadius: 22,
                  border: `1px solid ${palette.border}`,
                  boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
                  padding: 20,
                }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays size={18} style={{ color: palette.primary }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "آخر الحضور" : "Dernieres presences"}</span>
                </div>
                {detailLoading ? (
                  <div style={{ color: palette.muted, fontSize: 13 }}>{lang === "ar" ? "جاري تحميل التفاصيل..." : "Chargement des details..."}</div>
                ) : attendanceRows.length === 0 ? (
                  <div style={{ color: palette.muted, fontSize: 13 }}>{lang === "ar" ? "لا توجد سجلات حضور." : "Aucune presence enregistree."}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${palette.border}`, color: palette.muted }}>
                          <th className="pb-2 text-start">{lang === "ar" ? "التاريخ" : "Date"}</th>
                          <th className="pb-2 text-start">{lang === "ar" ? "الحالة" : "Statut"}</th>
                          <th className="pb-2 text-start">{lang === "ar" ? "دخول" : "Entree"}</th>
                          <th className="pb-2 text-start">{lang === "ar" ? "خروج" : "Sortie"}</th>
                          <th className="pb-2 text-end">{lang === "ar" ? "تأخر" : "Retard"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRows.map((row) => (
                          <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                            <td className="py-2">{row.date}</td>
                            <td className="py-2">{row.status}</td>
                            <td className="py-2">{row.checkIn}</td>
                            <td className="py-2">{row.checkOut}</td>
                            <td className="py-2 text-end">{row.lateMinutes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div
                style={{
                  backgroundColor: palette.surface,
                  borderRadius: 22,
                  border: `1px solid ${palette.border}`,
                  boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
                  padding: 20,
                }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Scissors size={18} style={{ color: "#a87d3c" }} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "آخر الإنتاج" : "Derniere production"}</span>
                </div>
                {detailLoading ? (
                  <div style={{ color: palette.muted, fontSize: 13 }}>{lang === "ar" ? "جاري تحميل التفاصيل..." : "Chargement des details..."}</div>
                ) : productionRows.length === 0 ? (
                  <div style={{ color: palette.muted, fontSize: 13 }}>{lang === "ar" ? "لا توجد سجلات إنتاج." : "Aucune production enregistree."}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${palette.border}`, color: palette.muted }}>
                          <th className="pb-2 text-start">{lang === "ar" ? "التاريخ" : "Date"}</th>
                          <th className="pb-2 text-start">{lang === "ar" ? "المهمة" : "Tache"}</th>
                          <th className="pb-2 text-end">{lang === "ar" ? "القطع" : "Pieces"}</th>
                          <th className="pb-2 text-end">{lang === "ar" ? "المبلغ" : "Montant"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionRows.map((row) => (
                          <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                            <td className="py-2">{row.date}</td>
                            <td className="py-2">{row.taskType}</td>
                            <td className="py-2 text-end">{row.piecesCompleted}</td>
                            <td className="py-2 text-end">{row.totalAmount.toLocaleString()} {lang === "ar" ? "د.ج" : "DA"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </PageBackground>
  );
}
