import { getTranslations } from "next-intl/server";
import { siteQr } from "@/lib/site-qr";
import { ShareMenu } from "./share-menu";

/** Server half of «Поделиться игрой»: the site QR and the labels. */
export async function ShareGame() {
  const [t, { url, dataUrl }] = await Promise.all([
    getTranslations("share"),
    siteQr(400),
  ]);
  return (
    <ShareMenu
      url={url}
      qr={dataUrl}
      labels={{
        button: t("button"),
        title: t("title"),
        qrAlt: t("qrAlt"),
        copy: t("copy"),
        copied: t("copied"),
        copyFailed: t("copyFailed"),
      }}
    />
  );
}
