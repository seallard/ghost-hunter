import { pgEnum } from "drizzle-orm/pg-core";

export const interviewFormat = pgEnum("interview_format", [
  "phone",
  "video",
  "onsite",
]);
