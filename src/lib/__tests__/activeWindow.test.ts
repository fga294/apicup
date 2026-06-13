import { describe, expect, it } from "vitest";

import { isWithinActiveWindow, msUntilWindowOpens } from "@/lib/activeWindow";

// The active window is 05:00–18:00 Australia/Sydney. During WC 2026 (June–July)
// Sydney is on AEST (UTC+10, no DST), so AEST = UTC + 10h for every instant below.

describe("isWithinActiveWindow", () => {
  it("is open during the AEST workday", () => {
    // 2026-06-15T00:00:00Z = 10:00 AEST
    expect(isWithinActiveWindow(new Date("2026-06-15T00:00:00Z"))).toBe(true);
  });

  it("is closed in the AEST evening", () => {
    // 2026-06-15T10:00:00Z = 20:00 AEST
    expect(isWithinActiveWindow(new Date("2026-06-15T10:00:00Z"))).toBe(false);
  });

  it("is closed overnight", () => {
    // 2026-06-14T16:00:00Z = 02:00 AEST
    expect(isWithinActiveWindow(new Date("2026-06-14T16:00:00Z"))).toBe(false);
  });

  it("opens exactly at 05:00 AEST", () => {
    // 2026-06-14T19:00:00Z = 05:00 AEST
    expect(isWithinActiveWindow(new Date("2026-06-14T19:00:00Z"))).toBe(true);
  });

  it("closes exactly at 18:00 AEST", () => {
    // 2026-06-15T08:00:00Z = 18:00 AEST
    expect(isWithinActiveWindow(new Date("2026-06-15T08:00:00Z"))).toBe(false);
  });
});

describe("msUntilWindowOpens", () => {
  it("counts down to the same-day open when before 05:00 AEST", () => {
    // 2026-06-14T17:00:00Z = 03:00 AEST → 2h until 05:00 AEST
    expect(msUntilWindowOpens(new Date("2026-06-14T17:00:00Z"))).toBe(2 * 3600_000);
  });

  it("rolls over to the next day's open when past the window", () => {
    // 2026-06-15T10:00:00Z = 20:00 AEST → 9h until next 05:00 AEST
    expect(msUntilWindowOpens(new Date("2026-06-15T10:00:00Z"))).toBe(9 * 3600_000);
  });

  it("always returns a positive duration", () => {
    expect(msUntilWindowOpens(new Date("2026-06-15T00:00:00Z"))).toBeGreaterThan(0);
  });
});
