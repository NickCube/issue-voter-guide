import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/admin/crud-table";

export const Route = createFileRoute("/admin/sources")({
  component: () => (
    <CrudTable
      title="Sources"
      description="Evidence references. Each position claim links to one source."
      table="sources"
      fields={[
        {
          name: "candidate_id",
          label: "Candidate",
          type: "fk",
          fkTable: "candidates",
          required: true,
        },
        { name: "title", label: "Title", required: true },
        { name: "url", label: "URL", type: "url" },
        {
          name: "source_type",
          label: "Source type",
          type: "select",
          options: [
            "Candidate Website",
            "Debate",
            "Interview",
            "Questionnaire",
            "Voting Record",
            "News Article",
            "Social Media",
            "Other",
          ].map((v) => ({ value: v, label: v })),
        },
        { name: "publication_date", label: "Publication date", type: "date" },
        { name: "excerpt", label: "Excerpt", type: "textarea" },
        { name: "raw_text", label: "Raw text", type: "textarea" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      display={(r) => (
        <div>
          <div className="font-medium">{String(r.title)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {[r.source_type, r.publication_date].filter(Boolean).join(" · ")}
          </div>
        </div>
      )}
    />
  ),
});
