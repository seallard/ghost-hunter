import { describe, expect, it } from "vitest";
import { buildObjectKey } from "./storage";

describe("buildObjectKey", () => {
  it("namespaces by userId and applicationId under a cover-letter segment", () => {
    const key = buildObjectKey("user_a", "app_1");
    expect(
      key.startsWith("users/user_a/applications/app_1/cover-letter/"),
    ).toBe(true);
    expect(key.endsWith(".pdf")).toBe(true);
  });

  it("uses different ids for sibling uploads", () => {
    const k1 = buildObjectKey("user_a", "app_1");
    const k2 = buildObjectKey("user_a", "app_1");
    expect(k1).not.toBe(k2);
  });
});
