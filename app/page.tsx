import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">ghost-hunter</h1>
        <UserButton />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Hi {user?.firstName ?? "there"}
        </h2>
        <p className="text-muted-foreground">No applications yet.</p>
      </section>
    </main>
  );
}
