import { test, expect } from "@playwright/test";
import {
  calculateCycleDays,
  calculateBurnRate,
  calculateSafeDailySpend,
  calculateOverrun,
  calculateThresholdLevel,
} from "../src/lib/budget-math";

test.describe("budget-math utilities", () => {
  test.describe("calculateCycleDays", () => {
    test("calculates day 1 correctly at cycle start", () => {
      const start = 1700000000000;
      const { daysElapsed, daysLeft } = calculateCycleDays(start, 14, start);
      expect(daysElapsed).toBe(1);
      expect(daysLeft).toBe(13);
    });

    test("calculates mid-cycle days accurately", () => {
      const start = 1700000000000;
      const day5 = start + 4.5 * 86_400_000; // 4.5 days later -> day 5
      const { daysElapsed, daysLeft } = calculateCycleDays(start, 14, day5);
      expect(daysElapsed).toBe(5);
      expect(daysLeft).toBe(9);
    });

    test("clamps days elapsed at cycle completion", () => {
      const start = 1700000000000;
      const afterCycle = start + 20 * 86_400_000; // 20 days later on a 14-day cycle
      const { daysElapsed, daysLeft } = calculateCycleDays(start, 14, afterCycle);
      expect(daysElapsed).toBe(14);
      expect(daysLeft).toBe(0);
    });
  });

  test.describe("calculateBurnRate", () => {
    test("computes correct daily spend rate", () => {
      expect(calculateBurnRate(4500, 5)).toBe(900);
      expect(calculateBurnRate(1000, 3)).toBe(333.33);
      expect(calculateBurnRate(0, 5)).toBe(0);
    });
  });

  test.describe("calculateSafeDailySpend", () => {
    test("computes remaining safe daily allowance", () => {
      // ₹10,000 budget, ₹4,000 spent so far, 6 days remaining -> ₹6,000 / 6 = ₹1,000/day
      expect(calculateSafeDailySpend(10000, 4000, 6)).toBe(1000);
      // Already exceeded budget -> safe daily spend is 0
      expect(calculateSafeDailySpend(10000, 11000, 5)).toBe(0);
      // 0 days left -> safe daily spend is 0
      expect(calculateSafeDailySpend(10000, 5000, 0)).toBe(0);
    });
  });

  test.describe("calculateOverrun", () => {
    test("calculates positive overrun when overspent", () => {
      expect(calculateOverrun(12450.5, 10000)).toBe(2450.5);
    });

    test("calculates negative value (surplus) when under budget", () => {
      expect(calculateOverrun(8200, 10000)).toBe(-1800);
    });

    test("returns 0 when exactly on budget", () => {
      expect(calculateOverrun(10000, 10000)).toBe(0);
    });
  });

  test.describe("calculateThresholdLevel", () => {
    test("detects 80% warning threshold", () => {
      expect(calculateThresholdLevel(7999, 10000)).toBeNull();
      expect(calculateThresholdLevel(8000, 10000)).toBe(80);
      expect(calculateThresholdLevel(9500, 10000)).toBe(80);
    });

    test("detects 100% breach threshold", () => {
      expect(calculateThresholdLevel(10000, 10000)).toBe(100);
      expect(calculateThresholdLevel(12500, 10000)).toBe(100);
    });
  });
});
