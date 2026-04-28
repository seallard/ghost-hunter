import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ApplicationsSankey } from "@/components/applications-sankey";
import { ApplicationsTable } from "@/components/applications-table";
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
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link
          href="/"
          aria-label="Ghost Hunter — home"
          className="flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8" />
          <h1 className="text-lg font-semibold tracking-tight">Ghost Hunter</h1>
        </Link>
        <UserButton />
      </header>
      <section className="px-6 py-8">
        <ApplicationsTable
          applications={applications}
          eventsByApp={eventsByApp}
          heatmapWeeks={weeks}
        />
      </section>
      <section className="flex-1 border-t px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <ApplicationsSankey data={sankey} />
        </div>
      </section>
    </main>
  );
}
