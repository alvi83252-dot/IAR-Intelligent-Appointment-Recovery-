import type { PriorityBand } from "@/types";
import { getPriorityColor } from "@/lib/priority";
import { cn } from "@/lib/utils";

export function PriorityBadge({ band, score }: { band: PriorityBand; score?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        getPriorityColor(band)
      )}
    >
      {band}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
