"use client";

import {
  Gift,
  House,
  MessageSquareHeart,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  CABINET_GIFT,
  CABINET_HOME,
  CABINET_PROFILE,
  CABINET_SETTINGS,
  CABINET_WALL,
} from "./routes";

const ITEMS = [
  { key: "home", href: CABINET_HOME, icon: House },
  { key: "profile", href: CABINET_PROFILE, icon: UserRound },
  { key: "gift", href: CABINET_GIFT, icon: Gift },
  { key: "wall", href: CABINET_WALL, icon: MessageSquareHeart },
  { key: "settings", href: CABINET_SETTINGS, icon: Settings },
] as const;

function isActive(pathname: string, key: string, href: string): boolean {
  if (key === "home") {
    return pathname === href || pathname.startsWith("/home/switch");
  }
  if (key === "profile") {
    return (
      pathname.startsWith(href) || pathname.startsWith("/home/participants")
    );
  }
  if (key === "gift") {
    return (
      pathname.startsWith("/home/gift") ||
      pathname.startsWith("/home/recipient") ||
      pathname.startsWith("/home/my-gift")
    );
  }
  return pathname.startsWith(href);
}

/**
 * Bottom navigation of the cabinet (component NMcOL): Главная · Анкета ·
 * Подарок · Стена · Настройки, always all five. Each item takes an equal
 * fifth, so the bar fits a 360px screen.
 */
export function CabinetNav() {
  const t = useTranslations("profile.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="bg-santa-white border-santa-line sticky bottom-0 flex items-stretch border-t px-1 pt-3 pb-4"
    >
      {ITEMS.map(({ key, href, icon: Icon }) => {
        const active = isActive(pathname, key, href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 text-center text-[11px] leading-tight",
              active
                ? "text-santa-green font-semibold"
                : "text-santa-muted font-normal",
            )}
          >
            <Icon className="size-6 shrink-0" aria-hidden />
            {/* A long single word (uk «Налаштування», Cyrillic falls back to
                the system font) wraps within the fifth, so the bar never
                widens the page at 360px. */}
            <span data-nav-label className="w-full wrap-anywhere hyphens-auto">
              {t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
