import "server-only";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/**
 * The public site address (the landing, NEXT_PUBLIC_APP_URL) and its QR code
 * as a PNG data URL of the given pixel width. Shared by the admin invite and
 * the cabinet «Поделиться игрой» popover.
 */
export async function siteQr(
  width: number,
): Promise<{ url: string; dataUrl: string }> {
  const url = env.NEXT_PUBLIC_APP_URL;
  return { url, dataUrl: await QRCode.toDataURL(url, { width, margin: 2 }) };
}
