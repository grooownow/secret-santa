"use client";

import { Gift, Heart, House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  CABINET_GIFT,
  CABINET_HOME,
  CABINET_SETTINGS,
  CABINET_WALL,
} from "./routes";

const ITEMS = [
  { key: "home", href: CABINET_HOME, icon: House },
  { key: "gift", href: CABINET_GIFT, icon: Gift },
  { key: "wall", href: CABINET_WALL, icon: Heart },
  { key: "settings", href: CABINET_SETTINGS, icon: Settings },
] as const;

function isActive(pathname: string, key: string, href: string): boolean {
  if (key === "home") {
    return pathname === href || pathname.startsWith("/home/participants");
  }
  return pathname.startsWith(href);
}

/** Bottom navigation of the cabinet (component NMcOL). Always shows all four. */
export function CabinetNav() {
  const t = useTranslations("profile.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="bg-santa-white border-santa-line sticky bottom-0 flex items-center justify-around border-t px-2 pt-3 pb-4"
    >
      {ITEMS.map(({ key, href, icon: Icon }) => {
        const active = isActive(pathname, key, href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-16 flex-col items-center gap-1 text-xs",
              active
                ? "text-santa-green font-semibold"
                : "text-santa-muted font-normal",
            )}
          >
            <Icon className="size-6" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
