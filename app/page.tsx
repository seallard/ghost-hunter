import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { ApplicationsTable } from "@/components/applications-table";
import {
  getApplicationCountsByDay,
  getEventsForApplications,
  listApplications,
} from "@/lib/applications";
import { buildHeatmap } from "@/lib/applications-heatmap";

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

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link href="/" aria-label="Ghost Hunter — home">
          <h1>
            <Image
              src="/logo.png"
              alt="Ghost Hunter"
              width={140}
              height={76}
              priority
              className="h-10 w-auto"
            />
          </h1>
        </Link>
        <UserButton />
      </header>
      <section className="border-b px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <ActivityHeatmap weeks={weeks} />
        </div>
      </section>
      <section className="flex-1 px-6 py-8">
        <ApplicationsTable
          applications={applications}
          eventsByApp={eventsByApp}
        />
      </section>
    </main>
  );
}
