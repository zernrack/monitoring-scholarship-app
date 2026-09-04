import { hasAnyRole } from "@monitoring-scholarship-app/auth/rbac";
import { describe, expect, it } from "vitest";

describe("RBAC role matching", () => {
  it("accepts an assigned role", () => {
    expect(hasAnyRole("provider", ["provider"])).toBe(true);
  });

  it("rejects a role without access", () => {
    expect(hasAnyRole("student", ["provider", "admin"])).toBe(false);
  });

  it("supports Better Auth's comma-separated multiple roles", () => {
    expect(hasAnyRole("student, admin", ["admin"])).toBe(true);
  });
});
