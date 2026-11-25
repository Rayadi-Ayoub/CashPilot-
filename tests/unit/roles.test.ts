import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canManage, requireManager, requireOwner, roleLabels } from "@/lib/auth";

describe("role permissions", () => {
  it("owner and financial manager can manage finances, collaborator cannot", () => {
    expect(canManage(Role.OWNER)).toBe(true);
    expect(canManage(Role.MANAGER)).toBe(true);
    expect(canManage(Role.COLLABORATOR)).toBe(false);
  });

  it("requireManager rejects a collaborator", () => {
    expect(() => requireManager(Role.COLLABORATOR)).toThrow("Only the owner or financial manager");
    expect(() => requireManager(Role.MANAGER)).not.toThrow();
    expect(() => requireManager(Role.OWNER)).not.toThrow();
  });

  it("requireOwner accepts only the owner", () => {
    expect(() => requireOwner(Role.OWNER)).not.toThrow();
    expect(() => requireOwner(Role.MANAGER)).toThrow("Only the company owner");
    expect(() => requireOwner(Role.COLLABORATOR)).toThrow("Only the company owner");
  });

  it("has a readable label for each of the 3 roles", () => {
    expect(roleLabels).toEqual({ OWNER: "Owner", MANAGER: "Financial manager", COLLABORATOR: "Collaborator" });
  });
});
