import "server-only";
import pino from "pino";
import { env } from "@/lib/env";

export const logger = pino({
  base: { service: "secret-santa" },
  level: env.LOG_LEVEL,
});
