import { cn } from "@/lib/utils";

function partyMeta(party?: string | null) {
  if (!party) return { label: "Independent", className: "bg-muted text-muted-foreground border-border" };
  const p = party.toLowerCase();
  if (p.startsWith("d") && p.includes("democrat"))
    return {
      label: "Democrat",
      className:
        "border-[oklch(0.55_0.13_245)]/30 bg-[oklch(0.55_0.13_245)]/10 text-[oklch(0.35_0.12_245)] dark:text-[oklch(0.85_0.10_245)]",
    };
  if (p.startsWith("r") && p.includes("republican"))
    return {
      label: "Republican",
      className:
        "border-[oklch(0.55_0.18_25)]/30 bg-[oklch(0.55_0.18_25)]/10 text-[oklch(0.40_0.15_25)] dark:text-[oklch(0.85_0.12_25)]",
    };
  return { label: party, className: "bg-muted text-muted-foreground border-border" };
}

export function PartyBadge({
  party,
  className,
}: {
  party?: string | null;
  className?: string;
}) {
  const m = partyMeta(party);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        m.className,
        className,
      )}
    >
      {m.label}
    </span>
  );
}
