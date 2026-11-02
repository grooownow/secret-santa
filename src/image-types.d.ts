// Static image imports (`import x from "…/foo.webp"`) are typed by Next's
// image-types, which normally arrive via the generated, gitignored
// next-env.d.ts. CI runs `pnpm lint` (tsc) on a clean checkout before any
// `next build`, so that file does not exist there yet — reference the types
// from a committed file instead.
/// <reference types="next/image-types/global" />
