import type { MetadataRoute } from "next";

// The site is closed to search engines entirely (spec: neighbours only).
// There is no sitemap on purpose: nothing here should be discoverable.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
