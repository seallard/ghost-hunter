import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ApplicationsTable } from "@/components/applications-table";
import { getEventsForApplications, listApplications } from "@/lib/applications";

export default async function Home() {
  const user = await currentUser();
  if (!user) return null;
  const applications = await listApplications(user.id);
  const eventsByApp = await getEventsForApplications(
    user.id,
    applications.map((a) => a.id),
  );

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">ghost-hunter</h1>
        <UserButton />
      </header>
      <section className="flex-1 px-6 py-8">
        <ApplicationsTable
          applications={applications}
          eventsByApp={eventsByApp}
        />
      </section>
    </main>
  );
}
