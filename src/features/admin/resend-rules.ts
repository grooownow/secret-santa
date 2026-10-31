import type { Phase } from "@/features/game";
import type { BroadcastEvent } from "@/features/mail";

/** Phases in which the mailing of each event is due (and so may be resent). */
const PHASES: Record<BroadcastEvent, Phase[]> = {
  draw: ["waiting", "gifts", "reveal"],
  "gifts-open": ["gifts", "reveal"],
  reminder: ["gifts"],
  reveal: ["reveal"],
};

export function canResend(event: BroadcastEvent, phase: Phase): boolean {
  return PHASES[event].includes(phase);
}
