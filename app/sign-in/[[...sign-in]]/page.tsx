import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ghost Hunter</h1>
      <SignIn />
    </div>
  );
}
