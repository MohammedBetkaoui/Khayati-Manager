import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  History,
  Layers3,
  Link2,
  PackageOpen,
  Phone,
  Ruler,
  Shirt,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { AssignWorkersModal } from "../components/production/assign-workers-modal";
import { ChangeStageModal } from "../components/production/change-stage-modal";
import { LinkMaterialsModal } from "../components/production/link-materials-modal";
import { PageBackground } from "../components/page-background";
import { Avatar, Badge, Button } from "../components/kit";
import { useLanguage } from "../language-context";
import {
  asRecord,
  fetchJson,
  getArrayFromPayload,
  getNumber,
  getText,
} from "../lib/api";
import {
  mapOrderDetails,
  palette,
  priorityLabels,
  productionText,
  statusColors,
  statusLabels,
  type MaterialOption,
  type OrderDetails,
  type WorkerOption,
} from "./production-data";

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, dir } = useLanguage();
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const text = productionText[lang];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [detailsPayload, workersPayload, materialsPayload] =
          await Promise.all([
            fetchJson<unknown>(`/orders/${id}/details`),
            fetchJson<unknown>(
              "/workers?limit=100&sortBy=fullName&sortOrder=ASC",
            ),
            fetchJson<unknown>(
              "/inventory?limit=100&sortBy=name&sortOrder=ASC",
            ),
          ]);
        if (cancelled) return;
        setDetails(mapOrderDetails(detailsPayload));
        setWorkers(
          getArrayFromPayload(workersPayload).map((item) => {
            const row = asRecord(item);
            return {
              id: getNumber(row?.id),
              fullName: getText(row?.fullName),
              role: getText(row?.role),
            };
          }),
        );
        setMaterials(
          getArrayFromPayload(materialsPayload).map((item) => {
            const row = asRecord(item);
            return {
              id: getNumber(row?.id),
              name: getText(row?.name),
              unit: getText(row?.unit),
              unitPrice: getNumber(row?.unitPrice),
              quantity: getNumber(row?.quantity),
            };
          }),
        );
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load order details",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  const labels =
    lang === "ar"
      ? {
          title:
            "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628\u064a\u0629",
          client:
            "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0632\u0628\u0648\u0646",
          history: "\u0633\u062c\u0644 \u0627\u0644\u0632\u0628\u0648\u0646",
          product: "\u0627\u0644\u0645\u0646\u062a\u062c",
          type: "\u0627\u0644\u0646\u0648\u0639",
          quantity: "\u0627\u0644\u0643\u0645\u064a\u0629",
          color: "\u0627\u0644\u0644\u0648\u0646",
          size: "\u0627\u0644\u0645\u0642\u0627\u0633",
          notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
          workflow:
            "\u0645\u0631\u0627\u062d\u0644 \u0627\u0644\u0625\u0646\u062a\u0627\u062c",
          responsible: "\u0627\u0644\u0645\u0633\u0624\u0648\u0644",
          workers:
            "\u0627\u0644\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0643\u0644\u0641\u0648\u0646",
          assign: "\u0625\u0633\u0646\u0627\u062f \u0639\u0627\u0645\u0644",
          noWorkers:
            "\u0644\u0627 \u064a\u0648\u062c\u062f \u0639\u0645\u0627\u0644 \u0645\u0643\u0644\u0641\u0648\u0646",
          materials:
            "\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0645\u0633\u062a\u0639\u0645\u0644\u0629",
          addMaterial:
            "\u0625\u0636\u0627\u0641\u0629 \u0645\u0627\u062f\u0629",
          noMaterials:
            "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u062f \u0645\u0633\u062c\u0644\u0629",
          costs:
            "\u062d\u0633\u0627\u0628 \u0627\u0644\u062a\u0643\u0644\u0641\u0629",
          materialCost: "\u0627\u0644\u0645\u0648\u0627\u062f",
          laborCost: "\u0627\u0644\u0639\u0645\u0644",
          totalCost:
            "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0643\u0644\u0641\u0629",
          salePrice: "\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639",
          profit: "\u0627\u0644\u0631\u0628\u062d",
          changeStatus:
            "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u062d\u0627\u0644\u0629",
          received: "\u0627\u0633\u062a\u0644\u0627\u0645",
          delivery: "\u062a\u0633\u0644\u064a\u0645",
        }
      : {
          title: "D\u00e9tails commande",
          client: "Informations client",
          history: "Historique client",
          product: "Produit",
          type: "Type",
          quantity: "Quantit\u00e9",
          color: "Couleur",
          size: "Taille",
          notes: "Notes",
          workflow: "Workflow de production",
          responsible: "Responsable",
          workers: "Travailleurs assign\u00e9s",
          assign: "Assigner un travailleur",
          noWorkers: "Aucun travailleur assign\u00e9",
          materials: "Mati\u00e8res utilis\u00e9es",
          addMaterial: "Ajouter une mati\u00e8re",
          noMaterials: "Aucune mati\u00e8re enregistr\u00e9e",
          costs: "Calcul des co\u00fbts",
          materialCost: "Mat\u00e9riaux",
          laborCost: "Travail",
          totalCost: "Co\u00fbt total",
          salePrice: "Prix de vente",
          profit: "Profit",
          changeStatus: "Changer l'\u00e9tat",
          received: "R\u00e9ception",
          delivery: "Livraison",
        };

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbArrow = dir === "rtl" ? ChevronLeft : ChevronRight;

  if (loading && !details) {
    return (
      <PageBackground>
        <div
          className="flex min-h-[70vh] items-center justify-center"
          style={{ color: palette.muted }}
        >
          {lang === "ar"
            ? "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0637\u0644\u0628\u064a\u0629..."
            : "Chargement de la commande..."}
        </div>
      </PageBackground>
    );
  }

  if (!details) {
    return (
      <PageBackground>
        <div className="pt-10">
          <Button variant="secondary" onClick={() => navigate("/production")}>
            <BackArrow size={16} />
            {text.breadcrumb}
          </Button>
          <div className="mt-6" style={{ color: "#b46a66" }}>
            {error ?? "Order not found"}
          </div>
        </div>
      </PageBackground>
    );
  }

  const accent = statusColors[details.statusCode];
  return (
    <PageBackground>
      <header className="pt-2">
        <div
          className="flex items-center gap-2"
          style={{ color: palette.muted, fontSize: 12 }}
        >
          <button type="button" onClick={() => navigate("/production")}>
            {text.breadcrumb}
          </button>
          <CrumbArrow size={13} />
          <span style={{ color: palette.primary, fontWeight: 700 }}>
            {details.orderNumber}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              aria-label={text.breadcrumb}
              onClick={() => navigate("/production")}
              className="flex items-center justify-center"
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
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  style={{ color: palette.text, fontSize: 25, fontWeight: 850 }}
                >
                  {labels.title}
                </h1>
                <span
                  style={{
                    direction: "ltr",
                    color: palette.primary,
                    fontSize: 17,
                    fontWeight: 850,
                  }}
                >
                  {details.orderNumber}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge bg={`${accent}18`} fg={accent} dot={accent}>
                  {statusLabels[details.statusCode][lang]}
                </Badge>
                {details.priorityCode === "URGENT" ? (
                  <Badge bg="rgba(180,106,102,.14)" fg="#b46a66" dot="#b46a66">
                    {priorityLabels.URGENT[lang]}
                  </Badge>
                ) : null}
                <span
                  className="flex items-center gap-1"
                  style={{ color: palette.muted, fontSize: 11.5 }}
                >
                  <CalendarDays size={13} />
                  {labels.received}: {details.receivedDate}
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{
                    color: details.delayed ? "#b46a66" : palette.muted,
                    fontSize: 11.5,
                  }}
                >
                  <Clock3 size={13} />
                  {labels.delivery}: {details.deliveryDate}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setStatusOpen(true)}>
              <Clock3 size={16} />
              {labels.changeStatus}
            </Button>
            <Button variant="secondary" onClick={() => setAssignOpen(true)}>
              <UserPlus size={16} />
              {labels.assign}
            </Button>
            <Button variant="primary" onClick={() => setMaterialOpen(true)}>
              <Link2 size={16} />
              {labels.addMaterial}
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <div
          className="mt-4 rounded-xl border px-4 py-3"
          style={{
            color: "#b46a66",
            borderColor: "rgba(180,106,102,.25)",
            backgroundColor: "rgba(180,106,102,.07)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.72fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Section icon={<UserRound size={18} />} title={labels.client}>
              <div className="flex items-center gap-3">
                <Avatar name={details.client.fullName} size={46} />
                <div>
                  <div
                    style={{
                      color: palette.text,
                      fontSize: 16,
                      fontWeight: 800,
                    }}
                  >
                    {details.client.fullName}
                  </div>
                  <div
                    className="mt-1 flex items-center gap-1"
                    style={{
                      color: palette.muted,
                      fontSize: 12,
                      direction: "ltr",
                    }}
                  >
                    <Phone size={13} />
                    {details.client.phone || "-"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!details.client.id}
                onClick={() =>
                  navigate(`/customer-profile/${details.client.id}`)
                }
                className="mt-4 flex items-center gap-2 disabled:opacity-40"
                style={{
                  color: palette.primary,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <History size={15} />
                {labels.history}
              </button>
            </Section>
            <Section icon={<Shirt size={18} />} title={labels.product}>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <Info label={labels.type} value={details.productDetails.type} />
                <Info
                  label={labels.quantity}
                  value={String(details.productDetails.quantity)}
                />
                <Info
                  label={labels.color}
                  value={details.productDetails.colors ?? "-"}
                />
                <Info
                  label={labels.size}
                  value={details.productDetails.sizes ?? "-"}
                />
              </div>
              {details.productDetails.notes ? (
                <div
                  className="mt-4 rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: palette.bg,
                    color: palette.muted,
                    fontSize: 12,
                    lineHeight: 1.7,
                  }}
                >
                  <strong style={{ color: palette.text }}>
                    {labels.notes}:{" "}
                  </strong>
                  {details.productDetails.notes}
                </div>
              ) : null}
            </Section>
          </div>

          <Section icon={<Layers3 size={18} />} title={labels.workflow}>
            <div className="relative grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-2">
              <div
                aria-hidden
                className="absolute hidden md:block"
                style={{
                  top: 19,
                  insetInline: "8%",
                  height: 2,
                  backgroundColor: palette.border,
                }}
              />
              {details.workflow.map((step) => {
                const stepAccent = statusColors[step.statusCode];
                return (
                  <div
                    key={step.statusCode}
                    className="relative z-10 flex gap-3 rounded-xl p-2.5 md:flex-col md:items-center md:text-center"
                    style={{
                      backgroundColor: step.current
                        ? `${stepAccent}0d`
                        : "transparent",
                      border: step.current
                        ? `1px solid ${stepAccent}28`
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      className="flex shrink-0 items-center justify-center"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: step.reached
                          ? stepAccent
                          : palette.surface,
                        border: `2px solid ${step.reached ? stepAccent : palette.borderStrong}`,
                        color: "white",
                      }}
                    >
                      {step.reached ? (
                        <Check size={14} strokeWidth={3} />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div
                        style={{
                          color: step.reached ? palette.text : palette.muted,
                          fontSize: 12,
                          fontWeight: step.current ? 850 : 700,
                        }}
                      >
                        {statusLabels[step.statusCode][lang]}
                      </div>
                      <div
                        style={{
                          color: palette.muted,
                          fontSize: 10.5,
                          direction: "ltr",
                        }}
                      >
                        {step.date ?? "-"}
                      </div>
                      {step.responsible ? (
                        <div
                          className="mt-1 truncate"
                          title={step.responsible}
                          style={{
                            color: stepAccent,
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}
                        >
                          {step.responsible}
                        </div>
                      ) : null}
                      {step.comment ? (
                        <div
                          className="mt-1 line-clamp-2"
                          title={step.comment}
                          style={{
                            color: palette.muted,
                            fontSize: 9.5,
                            lineHeight: 1.45,
                          }}
                        >
                          {step.comment}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Section
              icon={<UsersRound size={18} />}
              title={labels.workers}
              action={
                <Button variant="ghost" onClick={() => setAssignOpen(true)}>
                  <UserPlus size={15} />
                  {labels.assign}
                </Button>
              }
            >
              {details.workers.length === 0 ? (
                <EmptyState
                  icon={<UsersRound size={20} />}
                  text={labels.noWorkers}
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {details.workers.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        backgroundColor: palette.bg,
                        border: `1px solid ${palette.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={worker.fullName} size={34} />
                        <div>
                          <div
                            style={{
                              color: palette.text,
                              fontSize: 12.5,
                              fontWeight: 750,
                            }}
                          >
                            {worker.fullName}
                          </div>
                          <div style={{ color: palette.muted, fontSize: 10.5 }}>
                            {worker.role}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div
                          style={{
                            color: statusColors[worker.stageCode],
                            fontSize: 10.5,
                            fontWeight: 750,
                          }}
                        >
                          {statusLabels[worker.stageCode][lang]}
                        </div>
                        <div style={{ color: palette.muted, fontSize: 10 }}>
                          {worker.completedPieces} pcs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section
              icon={<PackageOpen size={18} />}
              title={labels.materials}
              action={
                <Button variant="ghost" onClick={() => setMaterialOpen(true)}>
                  <Link2 size={15} />
                  {labels.addMaterial}
                </Button>
              }
            >
              {details.materials.length === 0 ? (
                <EmptyState
                  icon={<PackageOpen size={20} />}
                  text={labels.noMaterials}
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {details.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        backgroundColor: palette.bg,
                        border: `1px solid ${palette.border}`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: palette.text,
                            fontSize: 12.5,
                            fontWeight: 750,
                          }}
                        >
                          {material.name}
                        </div>
                        <div style={{ color: palette.muted, fontSize: 10.5 }}>
                          {material.quantityUsed} {material.unit}
                        </div>
                      </div>
                      <div
                        style={{
                          color: palette.primary,
                          fontSize: 12,
                          fontWeight: 800,
                          direction: "ltr",
                        }}
                      >
                        {material.totalCost.toLocaleString()} {text.currency}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div
            className="overflow-hidden"
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 22,
              boxShadow: "0 16px 42px -30px rgba(18,60,74,.55)",
            }}
          >
            <div
              className="px-5 py-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(18,60,74,.09), rgba(168,125,60,.09))",
                borderBottom: `1px solid ${palette.border}`,
              }}
            >
              <div className="flex items-center gap-2">
                <Coins size={18} style={{ color: palette.primary }} />
                <h2
                  style={{ color: palette.text, fontSize: 15, fontWeight: 850 }}
                >
                  {labels.costs}
                </h2>
              </div>
              <p
                className="mt-1"
                style={{ color: palette.muted, fontSize: 11 }}
              >
                {details.orderNumber}
              </p>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <CostLine
                label={labels.materialCost}
                value={details.costs.materialCost}
                currency={text.currency}
              />
              <CostLine
                label={labels.laborCost}
                value={details.costs.laborCost}
                currency={text.currency}
              />
              <div
                style={{ borderTop: `1px dashed ${palette.borderStrong}` }}
              />
              <CostLine
                label={labels.totalCost}
                value={details.costs.totalCost}
                currency={text.currency}
                strong
              />
              <CostLine
                label={labels.salePrice}
                value={details.costs.salePrice}
                currency={text.currency}
                strong
              />
              <div
                className="mt-1 flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  backgroundColor:
                    details.costs.profit >= 0
                      ? "rgba(77,138,106,.11)"
                      : "rgba(180,106,102,.11)",
                  color: details.costs.profit >= 0 ? "#4d8a6a" : "#b46a66",
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>
                  {labels.profit}
                </span>
                <span
                  style={{ direction: "ltr", fontSize: 19, fontWeight: 900 }}
                >
                  {details.costs.profit.toLocaleString()} {text.currency}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ChangeStageModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        order={details}
        workers={workers}
        onSaved={refresh}
      />
      <AssignWorkersModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        orderId={details.id}
        workers={workers}
        defaultStage={details.statusCode}
        onSaved={refresh}
      />
      <LinkMaterialsModal
        open={materialOpen}
        onClose={() => setMaterialOpen(false)}
        orderId={details.id}
        materials={materials}
        onSaved={refresh}
      />
    </PageBackground>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 20,
        boxShadow: "0 10px 28px -26px rgba(18,60,74,.45)",
        padding: 18,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2"
          style={{ color: palette.primary }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: "rgba(18,60,74,.08)",
            }}
          >
            {icon}
          </span>
          <h2 style={{ color: palette.text, fontSize: 14, fontWeight: 850 }}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: palette.muted, fontSize: 10.5 }}>{label}</div>
      <div
        className="mt-0.5"
        style={{ color: palette.text, fontSize: 13, fontWeight: 750 }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div
      className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl"
      style={{
        backgroundColor: palette.bg,
        color: palette.muted,
        fontSize: 12,
      }}
    >
      {icon}
      {text}
    </div>
  );
}

function CostLine({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        style={{
          color: strong ? palette.text : palette.muted,
          fontSize: 12.5,
          fontWeight: strong ? 800 : 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          direction: "ltr",
          color: strong ? palette.primary : palette.text,
          fontSize: strong ? 16 : 13,
          fontWeight: strong ? 900 : 750,
        }}
      >
        {value.toLocaleString()}{" "}
        <small style={{ color: palette.muted, fontSize: 10 }}>{currency}</small>
      </span>
    </div>
  );
}
