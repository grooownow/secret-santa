export type WallError =
  | "invalid"
  | "photo"
  | "photoTooLarge"
  | "closed"
  | "noParticipant"
  | "notFound"
  | "failed";

export interface PostState {
  posted?: boolean;
  error?: WallError;
  /** Text typed into the form, echoed back so a failed post keeps it. */
  text?: string;
}
