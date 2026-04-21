import { addDays, differenceInCalendarDays } from "date-fns";
import ClipboardJS from "clipboard";
import { calculateSplit } from "./calc";
import { formatSummary } from "./format";
import { fetchServerKwh } from "./ha";

// Roster for the flat. Hamish pays equal share + server cost.
// `others` is the list that appears in the "Everyone (...)" line.
const OTHERS = ["Cole", "Will", "Brontë", "Kita"];
const FLATMATE_COUNT = OTHERS.length + 1; // +1 for Hamish

const RATE_STORAGE_KEY = "power-calculator.rate";
const DEFAULT_RATE_CENTS_PER_KWH = "34.61";

// Billing cycles are 28 days and anchored to a known period end.
// From this anchor, every other cycle boundary is N×28 days away. Update
// if the retailer ever shifts the cycle.
//
// Reference: bill received 20–21 April 2026 covered 20 Mar → 17 Apr.
const CYCLE_ANCHOR = new Date(2026, 3, 17); // 17 April 2026 (local time)
const CYCLE_DAYS = 28;

const form = byId<HTMLFormElement>("bill-form");
const startInput = form.elements.namedItem("start") as HTMLInputElement;
const endInput = form.elements.namedItem("end") as HTMLInputElement;
const rateInput = form.elements.namedItem("rate") as HTMLInputElement;

const breakdownSection = byId<HTMLElement>("breakdown");
const breakdownList = byId<HTMLDListElement>("breakdown-list");
const summarySection = byId<HTMLElement>("summary");
const summaryText = byId<HTMLPreElement>("summary-text");
const errorSection = byId<HTMLElement>("error");
const errorText = byId<HTMLParagraphElement>("error-text");
const copyStatus = byId<HTMLSpanElement>("copy-status");

// --- defaults ---
// Show the most recently completed 28-day cycle. Stable within a cycle:
// on 21 Apr, 25 Apr, and 15 May-1 it all shows 20 Mar → 17 Apr.
const { start: defaultStart, end: defaultEnd } = currentPeriod(new Date());
startInput.value = toDateInputValue(defaultStart);
endInput.value = toDateInputValue(defaultEnd);

// Rate: default to the current flat rate; if Cole has changed it before,
// use the remembered value instead. Not "history" — just a preference.
rateInput.value = localStorage.getItem(RATE_STORAGE_KEY) ?? DEFAULT_RATE_CENTS_PER_KWH;

// --- clipboard ---
new ClipboardJS("#copy-btn", { text: () => summaryText.textContent ?? "" }).on(
  "success",
  () => {
    copyStatus.textContent = "copied";
    setTimeout(() => (copyStatus.textContent = ""), 2000);
  },
);

// --- submit ---
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hide(errorSection);

  const data = new FormData(form);
  const total = Number(data.get("total"));
  const rate = Number(data.get("rate"));
  const start = new Date(String(data.get("start")));
  const end = new Date(String(data.get("end")));

  try {
    const serverKwh = await fetchServerKwh({ start, end });
    const breakdown = calculateSplit({
      totalBill: total,
      rateCentsPerKwh: rate,
      serverKwh,
      flatmateCount: FLATMATE_COUNT,
    });

    // Persist the rate so Cole doesn't retype it next time.
    localStorage.setItem(RATE_STORAGE_KEY, String(rate));

    renderBreakdown(breakdown);
    summaryText.textContent = formatSummary({
      breakdown,
      periodDate: end,
      others: OTHERS,
    });
    show(breakdownSection);
    show(summarySection);
  } catch (err) {
    errorText.textContent = err instanceof Error ? err.message : String(err);
    show(errorSection);
    hide(breakdownSection);
    hide(summarySection);
  }
});

// --- helpers ---

function renderBreakdown(b: ReturnType<typeof calculateSplit>): void {
  breakdownList.innerHTML = "";
  appendRow("Server usage", `${b.serverKwh.toFixed(2)} kWh`);
  appendRow("Server cost", money(b.serverCost));
  appendRow("Remaining bill", money(b.remainingBill));
  appendRow("Equal share", money(b.equalShare));
  appendRow("Hamish's share", money(b.hamishShare));
}

function appendRow(label: string, value: string): void {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  breakdownList.append(dt, dd);
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * The most recently completed 28-day cycle relative to `today`.
 *
 * Computed deterministically from CYCLE_ANCHOR — visiting on any day
 * inside the same cycle returns the same start/end.
 */
function currentPeriod(today: Date): { start: Date; end: Date } {
  const daysSinceAnchor = differenceInCalendarDays(today, CYCLE_ANCHOR);
  const cycles = Math.floor(daysSinceAnchor / CYCLE_DAYS);
  const end = addDays(CYCLE_ANCHOR, cycles * CYCLE_DAYS);
  const start = addDays(end, -CYCLE_DAYS);
  return { start, end };
}

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function show(el: HTMLElement): void {
  el.hidden = false;
}

function hide(el: HTMLElement): void {
  el.hidden = true;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}
