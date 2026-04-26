import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  changeApplicationStatus,
  createApplication,
  deleteApplication,
  getApplicationEvents,
  getEventsForApplications,
  listApplications,
  updateApplicationFields,
  updateEventNote,
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

describe("getApplicationEvents", () => {
  it("returns only events owned by userId (auth invariant)", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await changeApplicationStatus("user_a", a.id, "screening");

    expect(await getApplicationEvents("user_a", a.id)).toHaveLength(1);
    expect(await getApplicationEvents("user_b", a.id)).toEqual([]);
  });

  it("orders events by occurredAt desc", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await changeApplicationStatus("user_a", a.id, "screening");
    await new Promise((r) => setTimeout(r, 50));
    await changeApplicationStatus("user_a", a.id, "interviewing");

    const events = await getApplicationEvents("user_a", a.id);
    expect(events.map((e) => e.status)).toEqual(["interviewing", "screening"]);
  });
});

describe("getEventsForApplications", () => {
  it("returns empty map for empty input", async () => {
    const result = await getEventsForApplications("user_a", []);
    expect(result.size).toBe(0);
  });

  it("groups events by applicationId, filtered by userId", async () => {
    const a1 = await createApplication("user_a", {
      companyName: "A1",
      role: "X",
    });
    const a2 = await createApplication("user_a", {
      companyName: "A2",
      role: "Y",
    });
    const b1 = await createApplication("user_b", {
      companyName: "B1",
      role: "Z",
    });
    await changeApplicationStatus("user_a", a1.id, "screening");
    await changeApplicationStatus("user_a", a2.id, "rejected");
    await changeApplicationStatus("user_b", b1.id, "interviewing");

    const result = await getEventsForApplications("user_a", [
      a1.id,
      a2.id,
      b1.id,
    ]);
    expect(result.get(a1.id)?.map((e) => e.status)).toEqual(["screening"]);
    expect(result.get(a2.id)?.map((e) => e.status)).toEqual(["rejected"]);
    expect(result.has(b1.id)).toBe(false);
  });
});

describe("updateApplicationFields", () => {
  it("updates fields without touching status", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    const updated = await updateApplicationFields("user_a", a.id, {
      jobDescription: "JD content",
    });
    expect(updated?.jobDescription).toBe("JD content");
    expect(updated?.status).toBe("applied");
  });

  it("updates resumeText and coverLetterText independently", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await updateApplicationFields("user_a", a.id, { resumeText: "resume" });
    const updated = await updateApplicationFields("user_a", a.id, {
      coverLetterText: "cover",
    });
    expect(updated?.resumeText).toBe("resume");
    expect(updated?.coverLetterText).toBe("cover");
  });

  it("refuses to update an application owned by another user (auth invariant)", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    expect(
      await updateApplicationFields("user_b", a.id, { jobDescription: "x" }),
    ).toBeNull();
  });
});

describe("updateEventNote", () => {
  it("updates the note for an owned event", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await changeApplicationStatus("user_a", a.id, "screening");
    const [event] = await getApplicationEvents("user_a", a.id);

    const updated = await updateEventNote(
      "user_a",
      event.id,
      "phone screen with Sarah",
    );
    expect(updated?.note).toBe("phone screen with Sarah");
  });

  it("refuses to update an event owned by another user (auth invariant)", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await changeApplicationStatus("user_a", a.id, "screening");
    const [event] = await getApplicationEvents("user_a", a.id);

    expect(await updateEventNote("user_b", event.id, "x")).toBeNull();
  });

  it("clears the note when passed null", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await changeApplicationStatus("user_a", a.id, "screening");
    const [event] = await getApplicationEvents("user_a", a.id);
    await updateEventNote("user_a", event.id, "x");

    const cleared = await updateEventNote("user_a", event.id, null);
    expect(cleared?.note).toBeNull();
  });
});

describe("updateApplicationFields companyName/role", () => {
  it("updates companyName and role", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    const updated = await updateApplicationFields("user_a", a.id, {
      companyName: "Acmee",
      role: "SWE II",
    });
    expect(updated?.companyName).toBe("Acmee");
    expect(updated?.role).toBe("SWE II");
  });
});

describe("deleteApplication", () => {
  it("deletes an owned application and cascades events", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    await changeApplicationStatus("user_a", a.id, "screening");

    expect(await deleteApplication("user_a", a.id)).toBe(true);
    expect(await listApplications("user_a")).toEqual([]);

    const events = await db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, a.id));
    expect(events).toEqual([]);
  });

  it("refuses to delete an application owned by another user (auth invariant)", async () => {
    const a = await createApplication("user_a", {
      companyName: "Acme",
      role: "SWE",
    });
    expect(await deleteApplication("user_b", a.id)).toBe(false);
    expect(await listApplications("user_a")).toHaveLength(1);
  });
});
