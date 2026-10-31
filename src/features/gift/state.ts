export type GiftError =
  "invalid" | "notFound" | "closed" | "notMarked" | "failed";

export interface GiftState {
  error?: GiftError;
  /** The gift was saved by this submit. */
  saved?: boolean;
  /** Text typed into the form, echoed back so a failed save keeps it. */
  values?: { place?: string; code?: string; note?: string };
}
