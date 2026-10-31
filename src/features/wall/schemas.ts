import { z } from "zod";

export const MAX_POST_LENGTH = 1000;

export const postTextSchema = z.string().trim().min(1).max(MAX_POST_LENGTH);
export const postIdSchema = z.uuid();
