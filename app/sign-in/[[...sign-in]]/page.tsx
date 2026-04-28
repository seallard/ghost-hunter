import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" aria-hidden="true" className="h-20 w-20" />
        <h1 className="text-2xl font-semibold tracking-tight">Ghost Hunter</h1>
      </div>
      <SignIn />
    </div>
  );
}
