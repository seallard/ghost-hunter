"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/relative-time";

export function RelativeTime({ date }: { date: Date | string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return <>{relativeTime(date)}</>;
}
