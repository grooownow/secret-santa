import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseURL = env.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        // The site is closed to search engines entirely (spec: neighbours only).
        disallow: "/",
      },
    ],
    sitemap: `${baseURL}/sitemap.xml`,
  };
}
