import { pgEnum } from "drizzle-orm/pg-core";

export const workMode = pgEnum("work_mode", ["in_office", "hybrid", "remote"]);
