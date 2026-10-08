import { describe, expect, it } from "vitest";
import { rangeDates, shiftDate } from "@/lib/reports";

describe("shiftDate", () => {
  it("crosses month and leap-year boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("rangeDates", () => {
  it("compares today with yesterday", () => {
    expect(rangeDates("today", "2026-10-08")).toEqual({ from: "2026-10-08", to: "2026-10-08", prevFrom: "2026-10-07", prevTo: "2026-10-07" });
  });

  it("compares the last 7 days with the 7 before", () => {
    expect(rangeDates("week", "2026-10-08")).toEqual({ from: "2026-10-02", to: "2026-10-08", prevFrom: "2026-09-25", prevTo: "2026-10-01" });
  });

  it("compares month-to-date with the same days of last month", () => {
    expect(rangeDates("month", "2026-10-08")).toEqual({ from: "2026-10-01", to: "2026-10-08", prevFrom: "2026-09-01", prevTo: "2026-09-08" });
    // 31 March vs February: stops at February's last day.
    expect(rangeDates("month", "2026-03-31")).toMatchObject({ prevFrom: "2026-02-01", prevTo: "2026-02-28" });
  });
});
