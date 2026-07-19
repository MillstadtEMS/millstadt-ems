import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { getFinance, money } from "@/lib/board/finance";
import { getReferendumWorkbookConnectionStatus } from "@/lib/board/financialData/referendum/excelAdapter";
import { getActualFinancialConnectionStatus } from "@/lib/board/financialData/actuals/actualsAdapter";
import { getSageConnectionStatus } from "@/lib/board/financialData/actuals/sageAdapter";

export const dynamic = "force-dynamic";

export default async function ModelReviewPage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");

  const [{ rows, updatedAt }] = await Promise.all([getFinance()]);
  const workbook = getReferendumWorkbookConnectionStatus();
  const actuals = getActualFinancialConnectionStatus();
  const sage = getSageConnectionStatus();
  const reviewRows = rows.filter((row) => row.needsReview || row.textValue === "Synchronization Pending");

  return (
    <>
      <p className="board-eyebrow">Administrator</p>
      <h1 className="board-h1">Model Review</h1>
      <p className="board-sub">Internal financial-model review and synchronization status.</p>

      <div className="board-grid k3" style={{ marginTop: 24 }}>
        <div className="board-card board-stat">
          <div className="lbl">Referendum Workbook</div>
          <div className="val">{workbook.status}</div>
          <div className="sub">
            {workbook.workbook.fileName}
            {workbook.missingConfiguration.length > 0 ? ` · missing ${workbook.missingConfiguration.join(", ")}` : ""}
          </div>
        </div>
        <div className="board-card board-stat"><div className="lbl">Actual Financials</div><div className="val">{actuals.status}</div><div className="sub">{actuals.source}</div></div>
        <div className="board-card board-stat"><div className="lbl">Sage</div><div className="val">{sage.status}</div><div className="sub">{sage.source}</div></div>
      </div>

      <h2 className="board-h2">Editable Workbook Field Map</h2>
      <div className="board-tw">
        <table>
          <thead><tr><th>Portal Field</th><th>Worksheet</th><th>Cell or Range</th><th>Access</th><th>Roles Allowed to Edit</th><th>Validation</th></tr></thead>
          <tbody>
            {workbook.editableFields.map((field) => (
              <tr key={`${field.worksheet}-${field.cellOrRange}`}>
                <td>{field.portalField}</td>
                <td>{field.worksheet}</td>
                <td>{field.cellOrRange}</td>
                <td>{field.access}</td>
                <td>{field.rolesAllowedToEdit.join(", ") || "-"}</td>
                <td>{field.validation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="board-h2">Review Items</h2>
      <div className="board-tw">
        <table>
          <thead><tr><th>Key</th><th>Label</th><th className="num">Value</th><th>Source</th><th>Status</th></tr></thead>
          <tbody>
            {reviewRows.length === 0 && <tr><td colSpan={5}>No model review items.</td></tr>}
            {reviewRows.map((row) => (
              <tr key={row.key}>
                <td>{row.key}</td>
                <td>{row.label}</td>
                <td className="num">{row.unit === "currency" ? money(row.value) : row.value ?? row.textValue ?? "-"}</td>
                <td>{row.sourceCell ?? "-"}</td>
                <td>{row.textValue ?? (row.needsReview ? "Needs Review by Kenneth James" : "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="board-updated" style={{ marginTop: 16 }}>Last model cache update: {updatedAt ? new Date(updatedAt).toLocaleString("en-US") : "not loaded"}</p>
    </>
  );
}
