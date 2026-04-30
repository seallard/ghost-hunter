import type { ApplicationWithActivity } from "@/lib/applications";
import type { ApplicationEvent } from "@/lib/db/schema";

export type UpcomingInterview = {
  app: ApplicationWithActivity;
  event: ApplicationEvent;
};

export function getUpcomingInterviews(
  apps: ApplicationWithActivity[],
  eventsByApp: Map<string, ApplicationEvent[]>,
  now: Date = new Date(),
): UpcomingInterview[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = startOfToday.getTime();

  const appsById = new Map(apps.map((a) => [a.id, a]));
  const out: UpcomingInterview[] = [];

  for (const [appId, events] of eventsByApp) {
    const app = appsById.get(appId);
    if (!app) continue;
    for (const event of events) {
      if (event.status !== "interviewing") continue;
      if (!event.scheduledAt) continue;
      if (event.scheduledAt.getTime() < cutoff) continue;
      out.push({ app, event });
    }
  }

  out.sort(
    (a, b) => a.event.scheduledAt!.getTime() - b.event.scheduledAt!.getTime(),
  );
  return out;
}
