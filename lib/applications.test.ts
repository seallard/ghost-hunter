import { describe, expect, it } from "vitest";
import { createApplication, listApplications } from "./applications";

describe("listApplications", () => {
  it("returns only rows for the given userId (auth invariant)", async () => {
    await createApplication("user_a", { companyName: "Acme", role: "SWE" });
    await createApplication("user_b", { companyName: "Globex", role: "PM" });

    const aRows = await listApplications("user_a");
    expect(aRows).toHaveLength(1);
    expect(aRows[0].companyName).toBe("Acme");
    expect(aRows[0].userId).toBe("user_a");

    const bRows = await listApplications("user_b");
    expect(bRows).toHaveLength(1);
    expect(bRows[0].companyName).toBe("Globex");
  });

  it("returns rows in created_at desc order", async () => {
    await createApplication("user_a", { companyName: "First", role: "X" });
    await new Promise((r) => setTimeout(r, 5));
    await createApplication("user_a", { companyName: "Second", role: "Y" });

    const rows = await listApplications("user_a");
    expect(rows.map((r) => r.companyName)).toEqual(["Second", "First"]);
  });

  it("returns empty array when user has no applications", async () => {
    expect(await listApplications("user_nobody")).toEqual([]);
  });
});

describe("createApplication", () => {
  it("writes with the given userId, never an ambient one", async () => {
    const row = await createApplication("user_x", {
      companyName: "Acme",
      role: "SWE",
    });
    expect(row.userId).toBe("user_x");
    expect(row.companyName).toBe("Acme");
    expect(row.role).toBe("SWE");
  });

  it("defaults status to applied", async () => {
    const row = await createApplication("user_x", {
      companyName: "A",
      role: "X",
    });
    expect(row.status).toBe("applied");
  });
});
