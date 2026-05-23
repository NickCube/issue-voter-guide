import { cn } from "@/lib/utils";

const map: Record<string, { label: string; className: string }> = {
  High: { label: "High confidence", className: "bg-success/15 text-success border-success/30" },
  Medium: { label: "Medium confidence", className: "bg-info/15 text-info border-info/30" },
  Low: { label: "Low confidence", className: "bg-warning/20 text-warning-foreground border-warning/40" },
  "No Clear Position": {
    label: "No clear position",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function ConfidenceBadge({ value }: { value: string }) {
  const v = map[value] ?? map["No Clear Position"];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        v.className,
      )}
    >
      {v.label}
    </span>
  );
}
