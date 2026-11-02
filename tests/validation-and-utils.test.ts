import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validation";
import { parseCsv, toCsv } from "@/lib/csv";
import { ageOn, fromPKTInput, initialsName, toPKTInput } from "@/lib/format";
import { safeEqual, hmacSha256 } from "@/lib/tokens";
import { hasPermission } from "@/lib/auth/permissions";

const base = {
  fullName: "Ayesha Khan",
  email: "AYESHA@Example.com ",
  phone: "0300 1234567",
  password: "secret123",
  confirmPassword: "secret123",
  city: "Hyderabad",
  district: "Hyderabad",
  institution: "Govt. Girls High School",
  classLevel: "CLASS_10",
  dateOfBirth: "2000-01-01",
  acceptTerms: "on",
};

describe("registerSchema", () => {
  it("accepts a valid adult registration and normalises fields", () => {
    const r = registerSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("ayesha@example.com");
      expect(r.data.phone).toBe("03001234567");
    }
  });

  it("requires guardian details and consent for students under 18", () => {
    const dob = new Date();
    dob.setUTCFullYear(dob.getUTCFullYear() - 15);
    const r = registerSchema.safeParse({ ...base, dateOfBirth: dob.toISOString().slice(0, 10) });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["guardianName", "guardianPhone", "guardianRelation", "guardianConsent"]));
    }
  });

  it("rejects weak passwords, mismatches, bad phones and missing terms", () => {
    const r = registerSchema.safeParse({ ...base, password: "short", confirmPassword: "other", phone: "12345", acceptTerms: undefined });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["password", "confirmPassword", "phone", "acceptTerms"]));
  });
});

describe("CSV", () => {
  it("parses quoted fields, escaped quotes, commas, newlines and a BOM", () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","He said ""hi""\nthere"\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'He said "hi"\nthere'],
    ]);
  });
  it("neutralises spreadsheet formula injection on export", () => {
    expect(toCsv(["v"], [["=HYPERLINK(1)"], ["+92 300"]])).toContain("'=HYPERLINK(1)");
  });
});

describe("Pakistan time helpers", () => {
  it("round-trips datetime-local values in PKT (UTC+5)", () => {
    const d = fromPKTInput("2027-01-24T10:00");
    expect(d.toISOString()).toBe("2027-01-24T05:00:00.000Z");
    expect(toPKTInput(d)).toBe("2027-01-24T10:00");
  });
  it("computes age and privacy-safe names", () => {
    expect(ageOn(new Date("2010-06-15T00:00:00Z"), new Date("2026-06-14T00:00:00Z"))).toBe(15);
    expect(ageOn(new Date("2010-06-15T00:00:00Z"), new Date("2026-06-15T00:00:00Z"))).toBe(16);
    expect(initialsName("Muhammad Ali Shah")).toBe("Muhammad S.");
  });
});

describe("security helpers", () => {
  it("compares signatures in constant time", () => {
    const sig = hmacSha256("k", "payload");
    expect(safeEqual(sig, hmacSha256("k", "payload"))).toBe(true);
    expect(safeEqual(sig, hmacSha256("k", "payload2"))).toBe(false);
    expect(safeEqual(sig, "short")).toBe(false);
  });
  it("enforces role-based permissions", () => {
    expect(hasPermission(["FINANCE"], "payments.manage")).toBe(true);
    expect(hasPermission(["FINANCE"], "results.approve")).toBe(false);
    expect(hasPermission(["EXAMINER"], "users.manage")).toBe(false);
    expect(hasPermission(["SUPER_ADMIN"], "users.manage")).toBe(true);
    expect(hasPermission(["STUDENT"], "dashboard.view")).toBe(false);
  });
});
