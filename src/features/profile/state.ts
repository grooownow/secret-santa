export type ProfileError =
  | "invalid"
  | "photo"
  | "photoTooLarge"
  | "closed"
  | "noOwner"
  | "notFound"
  | "consent"
  | "failed";

/** Text typed into the form, echoed back so a failed save keeps it. */
export interface ProfileValues {
  name?: string;
  building?: string;
  apartment?: string;
  age?: string;
  wishes?: string;
  avoid?: string;
}

export interface ProfileState {
  error?: ProfileError;
  values?: ProfileValues;
}
