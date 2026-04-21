// Pure calculation logic. No DOM, no fetch — easy to unit-test.

export interface BillInputs {
  /** Total bill in dollars. */
  totalBill: number;
  /** Power rate in cents per kWh. */
  rateCentsPerKwh: number;
  /** kWh the server used over the billing period. */
  serverKwh: number;
  /** Number of flatmates sharing the non-server portion, including Hamish. */
  flatmateCount: number;
}

export interface Breakdown {
  serverKwh: number;
  serverCost: number;
  remainingBill: number;
  equalShare: number;
  hamishShare: number;
}

export function calculateSplit(inputs: BillInputs): Breakdown {
  const { totalBill, rateCentsPerKwh, serverKwh, flatmateCount } = inputs;

  if (flatmateCount <= 0) {
    throw new Error("flatmateCount must be > 0");
  }

  const serverCost = round2((rateCentsPerKwh / 100) * serverKwh);
  const remainingBill = round2(totalBill - serverCost);
  const equalShare = round2(remainingBill / flatmateCount);
  const hamishShare = round2(equalShare + serverCost);

  return { serverKwh, serverCost, remainingBill, equalShare, hamishShare };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
