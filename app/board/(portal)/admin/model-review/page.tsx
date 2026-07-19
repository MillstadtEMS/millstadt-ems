import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { getFinance, money } from "@/lib/board/finance";
import { getReferendumWorkbookConnectionStatus } from "@/lib/board/financialData/referendum/excelAdapter";
import { getActualFinancialConnectionStatus } from "@/lib/board/financialData/actuals/actualsAdapter";
import { getSageConnectionStatus } from "@/lib/board/financialData/actuals/sageAdapter";
import { actualFinancialsEnabled } from "@/lib/board/financialData/featureFlags";
import { BoardCard, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

type ChipTone = "neutral" | "good" | "warn" | "crit" | "info" | "accent";

function statusTone(status: string): ChipTone {
  if (status === "Connected" || status === "Last Successful Sync") return "good";
  if (status === "Configuration Required" || status === "Synchronization Pending") return "warn";
  if (status === "Synchronization Error" || status === "Not Connected") return "crit";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "Configuration Required") return "Needs setup";
  if (status === "Synchronization Pending") return "Sync pending";
  if (status === "Synchronization Error") return "Sync issue";
  if (status === "Last Successful Sync") return "Last sync ok";
  return status;
}

function workbookSummary(status: string, issueCount: number): string {
  if (status === "Connected") return "The production site is connected to the expected OneDrive workbook.";
  if (issueCount > 0) return "Live OneDrive sync is not active yet. The budget pages can still use the last imported workbook data.";
  return "Workbook sync has not completed yet.";
}

export default async function ModelReviewPage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");

  const [{ rows, updatedAt }] = await Promise.all([getFinance()]);
  const workbook = getReferendumWorkbookConnectionStatus();
  const showActuals = actualFinancialsEnabled();
  const actuals = showActuals ? getActualFinancialConnectionStatus() : null;
  const sage = showActuals ? getSageConnectionStatus() : null;
  const reviewRows = rows.filter((row) => row.needsReview || row.textValue === "Synchronization Pending");
  const connectionIssueCount = workbook.missingConfiguration.length + workbook.configurationIssues.length;
  const editableCount = workbook.editableFields.filter((field) => field.access === "editable").length;
  const expected = workbook.expectedWorkbook;

  return (
    <>
      <BoardPageHeader
        eyebrow="Administration"
        title="Budget workbook"
        description="OneDrive connection status and workbook fields used by the budget pages."
      />

      <div className="board-workbook-status">
        <BoardCard className="board-workbook-primary">
          <div className="board-status-title">
            <div>
              <span>Workbook sync</span>
              <h2>{statusLabel(workbook.status)}</h2>
            </div>
            <BoardStatusChip tone={statusTone(workbook.status)}>{statusLabel(workbook.status)}</BoardStatusChip>
          </div>
          <p>{workbookSummary(workbook.status, connectionIssueCount)}</p>
          {connectionIssueCount > 0 && (
            <div className="board-notice" style={{ margin: "14px 0 0" }}>
              The Microsoft connection needs to be completed before live OneDrive changes can update the website.
            </div>
          )}
        </BoardCard>

        <BoardCard className="board-workbook-details">
          <div className="board-detail-row"><span>Workbook</span><strong>{expected.fileName}</strong></div>
          <div className="board-detail-row"><span>OneDrive account</span><strong>{expected.owner}</strong></div>
          <div className="board-detail-row"><span>Folder</span><strong>{expected.folder}</strong></div>
          <div className="board-detail-row"><span>Editable cells</span><strong>{editableCount}</strong></div>
          <div className="board-detail-row"><span>Last import</span><strong>{updatedAt ? new Date(updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Not loaded"}</strong></div>
        </BoardCard>
      </div>

      {actuals && sage && (
        <div className="board-grid k2" style={{ marginTop: 18 }}>
          <BoardCard className="board-compact-status">
            <span>Actual financials</span>
            <BoardStatusChip tone={statusTone(actuals.status)}>{statusLabel(actuals.status)}</BoardStatusChip>
          </BoardCard>
          <BoardCard className="board-compact-status">
            <span>Sage import</span>
            <BoardStatusChip tone={statusTone(sage.status)}>{statusLabel(sage.status)}</BoardStatusChip>
          </BoardCard>
        </div>
      )}

      <BoardSectionHeader title="Workbook fields" />
      <div className="board-tw board-workbook-table">
        <table>
          <thead><tr><th>Budget page field</th><th>Workbook location</th><th>Use</th><th>Editable by</th><th>Rule</th></tr></thead>
          <tbody>
            {workbook.editableFields.map((field) => (
              <tr key={`${field.worksheet}-${field.cellOrRange}`}>
                <td><strong>{field.portalField}</strong></td>
                <td>
                  <span>{field.worksheet}</span>
                  <small>{field.cellOrRange}</small>
                </td>
                <td><BoardStatusChip tone={field.access === "editable" ? "accent" : "neutral"}>{field.access === "editable" ? "Editable" : "Read only"}</BoardStatusChip></td>
                <td>{field.rolesAllowedToEdit.length ? field.rolesAllowedToEdit.join(", ") : "Website formula"}</td>
                <td>{field.validation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BoardSectionHeader title="Review queue" />
      <div className="board-tw board-workbook-table">
        <table>
          <thead><tr><th>Item</th><th className="num">Current value</th><th>Status</th></tr></thead>
          <tbody>
            {reviewRows.length === 0 && <tr><td colSpan={3}>No budget fields currently need review.</td></tr>}
            {reviewRows.map((row) => (
              <tr key={row.key}>
                <td><strong>{row.label}</strong></td>
                <td className="num">{row.unit === "currency" ? money(row.value) : row.value ?? row.textValue ?? "-"}</td>
                <td>{row.textValue ?? (row.needsReview ? "Needs review" : "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
