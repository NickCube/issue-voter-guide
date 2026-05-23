import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/admin/crud-table";
import { ConfidenceBadge } from "@/components/confidence-badge";

export const Route = createFileRoute("/admin/position-claims")({
  component: () => (
    <CrudTable
      title="Position Claims"
      description="Only Approved claims appear on public pages."
      table="position_claims"
      fields={[
        {
          name: "candidate_id",
          label: "Candidate",
          type: "fk",
          fkTable: "candidates",
          required: true,
        },
        { name: "issue_id", label: "Issue", type: "fk", fkTable: "issues", required: true },
        { name: "source_id", label: "Source", type: "fk", fkTable: "sources" },
        { name: "summary", label: "Summary (plain English)", type: "textarea", required: true },
        { name: "evidence_quote", label: "Evidence quote", type: "textarea" },
        {
          name: "confidence",
          label: "Confidence",
          type: "select",
          default: "Medium",
          options: ["High", "Medium", "Low", "No Clear Position"].map((v) => ({
            value: v,
            label: v,
          })),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          default: "Draft",
          options: ["Draft", "Approved", "Rejected"].map((v) => ({ value: v, label: v })),
        },
        { name: "last_reviewed_at", label: "Last reviewed (YYYY-MM-DD)", type: "date" },
      ]}
      display={(r) => (
        <div>
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
                (r.status === "Approved"
                  ? "border-success/30 bg-success/10 text-success"
                  : r.status === "Rejected"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-muted text-muted-foreground")
              }
            >
              {String(r.status)}
            </span>
            <ConfidenceBadge value={String(r.confidence)} />
          </div>
          <div className="mt-1.5 line-clamp-2 text-sm">{String(r.summary)}</div>
        </div>
      )}
    />
  ),
});
