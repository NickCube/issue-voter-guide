import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

const map: Record<string, { label: string; className: string; icon: any }> = {
  High: { 
    label: "Verified", 
    className: "bg-success/15 text-success border-success/30", 
    icon: CheckCircle2 
  },
  Medium: { 
    label: "Documented", 
    className: "bg-info/15 text-info border-info/30", 
    icon: AlertCircle 
  },
  Low: { 
    label: "Mixed Evidence", 
    className: "bg-warning/20 text-warning-foreground border-warning/40", 
    icon: HelpCircle 
  },
  "No Clear Position": {
    label: "No Clear Position",
    className: "bg-muted text-muted-foreground border-border",
    icon: HelpCircle
  },
};

export function ConfidenceBadge({ value }: { value: string }) {
  const v = map[value] ?? map["No Clear Position"];
  const Icon = v.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
        v.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {v.label}
    </span>
  );
}
