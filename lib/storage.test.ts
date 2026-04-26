import { describe, expect, it } from "vitest";
import { buildObjectKey } from "./storage";

describe("buildObjectKey", () => {
  it("namespaces by userId and applicationId", () => {
    const key = buildObjectKey("user_a", "app_1", "resume");
    expect(key.startsWith("users/user_a/applications/app_1/resume/")).toBe(
      true,
    );
    expect(key.endsWith(".pdf")).toBe(true);
  });

  it("uses different ids for sibling uploads", () => {
    const k1 = buildObjectKey("user_a", "app_1", "resume");
    const k2 = buildObjectKey("user_a", "app_1", "resume");
    expect(k1).not.toBe(k2);
  });

  it("includes kind in the path", () => {
    const k1 = buildObjectKey("u", "a", "resume");
    const k2 = buildObjectKey("u", "a", "cover-letter");
    expect(k1).toContain("/resume/");
    expect(k2).toContain("/cover-letter/");
  });
});
