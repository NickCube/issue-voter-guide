import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "url" | "date" | "number" | "select" | "fk";
  options?: { value: string; label: string }[];
  fkTable?: string;
  fkLabel?: string;
  required?: boolean;
  default?: string | number;
};

type Row = Record<string, unknown> & { id: string };

export function CrudTable({
  title,
  description,
  table,
  fields,
  display,
  defaultOrder = "created_at",
  ascending = false,
}: {
  title: string;
  description?: string;
  table: string;
  fields: FieldDef[];
  display: (row: Row) => React.ReactNode;
  defaultOrder?: string;
  ascending?: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .order(defaultOrder, { ascending });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  // Foreign-key option queries
  const fkFields = fields.filter((f) => f.type === "fk");
  const fkQueries = useQuery({
    queryKey: ["fk-opts", table, fkFields.map((f) => f.fkTable).join(",")],
    queryFn: async () => {
      const result: Record<string, { value: string; label: string }[]> = {};
      for (const f of fkFields) {
        if (!f.fkTable) continue;
        const { data } = await supabase
          .from(f.fkTable as never)
          .select(`id, ${f.fkLabel ?? "name"}`)
          .order(f.fkLabel ?? "name");
        result[f.name] = ((data as Array<Record<string, unknown>>) ?? []).map((r) => ({
          value: r.id as string,
          label: String(r[f.fkLabel ?? "name"] ?? r.id),
        }));
      }
      return result;
    },
    enabled: fkFields.length > 0,
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const client = supabase.from(table as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const op = editing
        ? (client as any).update(payload).eq("id", editing.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (client as any).insert(payload);
      const { error } = await op;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Created");
      qc.invalidateQueries({ queryKey: [table] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: [table] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = form.get(f.name);
      if (raw === null || raw === "") {
        payload[f.name] = f.required ? raw : null;
      } else if (f.type === "number") {
        payload[f.name] = Number(raw);
      } else {
        payload[f.name] = raw;
      }
    }
    upsert.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${title}` : `New ${title}`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((f) => {
                const val =
                  (editing?.[f.name] as string | number | null | undefined) ?? f.default ?? "";
                const strVal = val == null ? "" : String(val);
                return (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={f.name}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={f.name}
                        name={f.name}
                        defaultValue={strVal}
                        required={f.required}
                        rows={3}
                      />
                    ) : f.type === "select" ? (
                      <Select name={f.name} defaultValue={strVal || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "fk" ? (
                      <Select name={f.name} defaultValue={strVal || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(fkQueries.data?.[f.name] ?? []).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={f.name}
                        name={f.name}
                        type={
                          f.type === "url"
                            ? "url"
                            : f.type === "date"
                              ? "date"
                              : f.type === "number"
                                ? "number"
                                : "text"
                        }
                        defaultValue={strVal}
                        required={f.required}
                      />
                    )}
                  </div>
                );
              })}
              <DialogFooter>
                <Button type="submit" disabled={upsert.isPending}>
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">{display(row)}</div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(row);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this entry? This cannot be undone.")) {
                        remove.mutate(row.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
