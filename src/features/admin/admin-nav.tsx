"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  ADMIN_BACKUP,
  ADMIN_HOME,
  ADMIN_PARTICIPANTS,
  ADMIN_SETTINGS,
} from "./routes";

const ITEMS = [
  { key: "overview", href: ADMIN_HOME },
  { key: "participants", href: ADMIN_PARTICIPANTS },
  { key: "backup", href: ADMIN_BACKUP },
  { key: "settings", href: ADMIN_SETTINGS },
] as const;

/** Section tabs of the admin area (frames ThhEp, a8tVB). */
export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="flex items-center gap-2 overflow-x-auto"
    >
      {ITEMS.map(({ key, href }) => {
        const active =
          href === ADMIN_HOME ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap",
              active
                ? "bg-santa-green text-santa-white"
                : "bg-santa-mint text-santa-green",
            )}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
