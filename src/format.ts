import { format } from "date-fns";
import type { Breakdown } from "./calc";

export interface SummaryInputs {
  breakdown: Breakdown;
  /** Any date inside the billing period — used to derive the month label. */
  periodDate: Date;
  /** Names to list in the "Everyone" line (non-Hamish flatmates). */
  others: string[];
}

/**
 * Format the copy-to-iMessage summary, matching the shape in the brief:
 *
 *   Power bill — April
 *   Everyone (Cole, Will, Brontë, Kita): $X each
 *   Hamish: $Y
 */
export function formatSummary({ breakdown, periodDate, others }: SummaryInputs): string {
  const month = format(periodDate, "MMMM");
  const names = others.join(", ");
  const each = money(breakdown.equalShare);
  const hamish = money(breakdown.hamishShare);

  return [
    `Power bill — ${month}`,
    `Everyone (${names}): ${each} each`,
    `Hamish: ${hamish}`,
  ].join("\n");
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
