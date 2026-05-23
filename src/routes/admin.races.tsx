import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/admin/crud-table";

export const Route = createFileRoute("/admin/races")({
  component: () => (
    <CrudTable
      title="Races"
      description="Create elections that voters can compare candidates within."
      table="races"
      defaultOrder="election_date"
      ascending={true}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "location", label: "Location" },
        { name: "election_date", label: "Election date", type: "date" },
        { name: "office_description", label: "Office description", type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          default: "active",
          options: [
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ],
        },
      ]}
      display={(r) => (
        <div>
          <div className="font-medium">{String(r.name)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {[r.location, r.election_date, r.status].filter(Boolean).join(" · ")}
          </div>
        </div>
      )}
    />
  ),
});
