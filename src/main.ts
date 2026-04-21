import ClipboardJS from "clipboard";
import { calculateSplit } from "./calc";
import { formatSummary } from "./format";
import { fetchServerKwh } from "./ha";

// Roster for the flat. Hamish pays equal share + server cost.
// `others` is the list that appears in the "Everyone (...)" line.
const OTHERS = ["Cole", "Will", "Brontë", "Kita"];
const FLATMATE_COUNT = OTHERS.length + 1; // +1 for Hamish

const RATE_STORAGE_KEY = "power-calculator.rate";
const PERIOD_END_STORAGE_KEY = "power-calculator.period-end";
const DEFAULT_RATE_CENTS_PER_KWH = "34.61";
const PERIOD_DAYS = 28;

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
// Billing period: 28-day cycle. We remember where the last period ended
// and default the next one to start there — so month-to-month the dates
// just pre-fill correctly. On first run we fall back to the 28 days
// ending today; Cole tweaks to match his bill.
const priorEnd = readStoredDate(PERIOD_END_STORAGE_KEY);
const defaultStart = priorEnd ?? addDays(new Date(), -PERIOD_DAYS);
const defaultEnd = addDays(defaultStart, PERIOD_DAYS);
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

    // Persist the rate and period end so next month's defaults are right.
    localStorage.setItem(RATE_STORAGE_KEY, String(rate));
    localStorage.setItem(PERIOD_END_STORAGE_KEY, toDateInputValue(end));

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

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse a "YYYY-MM-DD" string (date-input format) as a local-time Date. */
function parseDateInput(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function readStoredDate(key: string): Date | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const d = parseDateInput(raw);
  return Number.isNaN(d.getTime()) ? null : d;
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
