import { createFileRoute } from "@tanstack/react-router";
import { CrudTable } from "@/components/admin/crud-table";

export const Route = createFileRoute("/admin/issues")({
  component: () => (
    <CrudTable
      title="Issues"
      description="Per-race issue topics displayed as chips on the race page."
      table="issues"
      defaultOrder="display_order"
      ascending={true}
      fields={[
        { name: "race_id", label: "Race", type: "fk", fkTable: "races", required: true },
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "display_order", label: "Display order", type: "number", default: 0 },
      ]}
      display={(r) => (
        <div>
          <div className="font-medium">{String(r.name)}</div>
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {String(r.description ?? "")}
          </div>
        </div>
      )}
    />
  ),
});
