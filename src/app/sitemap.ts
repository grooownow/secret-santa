import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseURL = env.NEXT_PUBLIC_APP_URL;

  // /dashboard — authenticated, excluded from search
  // /signin — auth entry page, adds no search value
  return [
    {
      url: `${baseURL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
