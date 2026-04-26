import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  changeApplicationStatus,
  createApplication,
  listApplications,
} from "./applications";
import { db } from "./db";
import { applicationEvents } from "./db/schema";

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

describe("changeApplicationStatus", () => {
  it("updates status and inserts an event atomically", async () => {
    const app = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });

    const updated = await changeApplicationStatus(
      "user_a",
      app.id,
      "screening",
    );
    expect(updated?.status).toBe("screening");

    const events = await db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, app.id));
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("screening");
    expect(events[0].userId).toBe("user_a");
  });

  it("refuses to update an application owned by another user (auth invariant)", async () => {
    const app = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });

    const result = await changeApplicationStatus("user_b", app.id, "screening");
    expect(result).toBeNull();

    const [unchanged] = await listApplications("user_a");
    expect(unchanged.status).toBe("applied");

    const events = await db.select().from(applicationEvents);
    expect(events).toHaveLength(0);
  });

  it("listApplications.lastActivityAt reflects the latest event", async () => {
    const app = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });

    const [before] = await listApplications("user_a");
    expect(before.lastActivityAt.getTime()).toBe(before.createdAt.getTime());

    await new Promise((r) => setTimeout(r, 50));
    await changeApplicationStatus("user_a", app.id, "screening");

    const [after] = await listApplications("user_a");
    expect(after.lastActivityAt.getTime()).toBeGreaterThan(
      after.createdAt.getTime(),
    );
  });
});
