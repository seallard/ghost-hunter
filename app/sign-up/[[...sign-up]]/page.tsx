import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Image
        src="/logo.png"
        alt="Ghost Hunter"
        width={224}
        height={122}
        priority
        className="h-16 w-auto"
      />
      <SignUp />
    </div>
  );
}
