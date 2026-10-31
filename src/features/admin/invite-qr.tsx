import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { env } from "@/lib/env";
import { PrintButton } from "./print-button";

/**
 * QR with the site link (frame wESwL): PNG download and a print view. The
 * sheet below is hidden on screen and is the only thing printed.
 */
export async function InviteQr() {
  const t = await getTranslations("admin.settings");
  const url = env.NEXT_PUBLIC_APP_URL;
  const [preview, sheet] = await Promise.all([
    QRCode.toDataURL(url, { width: 360, margin: 2 }),
    QRCode.toDataURL(url, { width: 900, margin: 2 }),
  ]);

  return (
    <>
      <section className="flex flex-col gap-4 print:hidden">
        <h2 className="text-santa-ink text-[17px] font-bold">{t("qrTitle")}</h2>
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("qrText")}
        </p>
        <p className="text-santa-ink text-sm font-semibold break-all">{url}</p>
        <div className="border-santa-line bg-santa-white flex justify-center rounded-2xl border p-4">
          {/* A data URL: next/image has nothing to optimise here. */}
          {/* oxlint-disable-next-line nextjs/no-img-element */}
          <img src={preview} alt={t("qrAlt")} width={240} height={240} />
        </div>
        <a
          href={sheet}
          download="secret-santa-qr.png"
          className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold"
        >
          {t("download")}
        </a>
        <PrintButton />
      </section>
      <section
        aria-hidden
        className="hidden flex-col items-center gap-6 print:flex"
      >
        <h2 className="text-santa-ink text-center text-4xl font-bold">
          {t("sheetTitle")}
        </h2>
        {/* oxlint-disable-next-line nextjs/no-img-element */}
        <img src={sheet} alt="" width={480} height={480} />
        <p className="text-santa-ink text-xl break-all">{url}</p>
      </section>
    </>
  );
}
