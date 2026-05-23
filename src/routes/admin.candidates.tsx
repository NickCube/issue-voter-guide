import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/admin/crud-table";

export const Route = createFileRoute("/admin/candidates")({
  component: () => (
    <CrudTable
      title="Candidates"
      table="candidates"
      fields={[
        { name: "race_id", label: "Race", type: "fk", fkTable: "races", required: true },
        { name: "name", label: "Name", required: true },
        { name: "party_or_affiliation", label: "Party / affiliation" },
        { name: "website_url", label: "Website URL", type: "url" },
        { name: "bio", label: "Short bio", type: "textarea" },
        { name: "photo_url", label: "Photo URL", type: "url" },
      ]}
      display={(r) => (
        <div>
          <div className="font-medium">{String(r.name)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {String(r.party_or_affiliation ?? "—")}
          </div>
        </div>
      )}
    />
  ),
});
