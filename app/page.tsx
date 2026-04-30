import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { DashboardClient } from "@/components/dashboard-client";
import {
  getApplicationCountsByDay,
  getEventsForApplications,
  listApplications,
} from "@/lib/applications";
import { buildHeatmap } from "@/lib/applications-heatmap";
import { buildSankey } from "@/lib/applications-sankey";

export default async function Home() {
  const user = await currentUser();
  if (!user) return null;
  const applications = await listApplications(user.id);
  const eventsByApp = await getEventsForApplications(
    user.id,
    applications.map((a) => a.id),
  );
  const counts = await getApplicationCountsByDay(user.id, 90);
  const weeks = buildHeatmap(counts, new Date(), 90);
  const sankey = buildSankey(applications, eventsByApp);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="grid grid-cols-3 items-center border-b px-6 py-2">
        <div />
        <Link
          href="/"
          aria-label="Ghost Hunter — home"
          className="flex items-center justify-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            aria-hidden="true"
            className="h-12 w-12"
          />
          <h1 className="font-display text-2xl tracking-[0.2em] uppercase">
            Ghost Hunter
          </h1>
        </Link>
        <div className="justify-self-end">
          <UserButton />
        </div>
      </header>
      <DashboardClient
        applications={applications}
        eventsByApp={eventsByApp}
        heatmapWeeks={weeks}
        sankey={sankey}
      />
    </main>
  );
}
