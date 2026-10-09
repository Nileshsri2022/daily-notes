const MS_PER_DAY = 86_400_000;

export function calculateCycleDays(
  cycleStartDate: number,
  durationDays: number,
  now: number = Date.now()
): { daysElapsed: number; daysLeft: number } {
  if (durationDays < 1) return { daysElapsed: 1, daysLeft: 0 };
  const daysElapsed = Math.min(
    durationDays,
    Math.max(1, Math.floor((now - cycleStartDate) / MS_PER_DAY) + 1)
  );
  const daysLeft = Math.max(0, durationDays - daysElapsed);
  return { daysElapsed, daysLeft };
}

export function calculateBurnRate(
  currentSpent: number,
  daysElapsed: number
): number {
  if (daysElapsed <= 0) return 0;
  return Math.round((currentSpent / daysElapsed) * 100) / 100;
}

export function calculateSafeDailySpend(
  budgetAmount: number,
  currentSpent: number,
  daysLeft: number
): number {
  if (daysLeft <= 0) return 0;
  const remaining = Math.max(0, budgetAmount - currentSpent);
  return Math.round((remaining / daysLeft) * 100) / 100;
}

export function calculateOverrun(
  actualSpent: number,
  budgetAmount: number
): number {
  return Math.round((actualSpent - budgetAmount) * 100) / 100;
}

export function calculateThresholdLevel(
  currentSpent: number,
  budgetAmount: number
): 100 | 80 | null {
  if (budgetAmount <= 0) return null;
  const percentage = (currentSpent / budgetAmount) * 100;
  if (percentage >= 100) return 100;
  if (percentage >= 80) return 80;
  return null;
}
