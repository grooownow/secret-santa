"use client";

import {
  HandHeart,
  House,
  MessageSquareHeart,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
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
  // «Я дарю»: a hand giving, not a gift box (a box reads as "a gift for me").
  { key: "gift", href: CABINET_GIFT, icon: HandHeart },
  { key: "wall", href: CABINET_WALL, icon: MessageSquareHeart },
  { key: "settings", href: CABINET_SETTINGS, icon: Settings },
] as const;

// Only the organizer sees it; the admin area itself shows this same bar, so
// the way back to the cabinet is always one tap. A literal, not an import from
// features/admin: features do not import each other.
const ADMIN_ITEM = { key: "admin", href: "/admin" as Route, icon: ShieldCheck };

function isActive(pathname: string, key: string, href: string): boolean {
  if (key === "home") {
    return pathname === href || pathname.startsWith("/home/switch");
  }
  // «Профиль»: what I receive — my cards, my gift, guessing my Santa.
  if (key === "profile") {
    return (
      pathname.startsWith(href) ||
      pathname.startsWith("/home/participants") ||
      pathname.startsWith("/home/my-gift") ||
      pathname.startsWith("/home/guess")
    );
  }
  // «Я дарю»: my recipient and leaving the gift.
  if (key === "gift") {
    return (
      pathname.startsWith("/home/gift") ||
      pathname.startsWith("/home/recipient")
    );
  }
  return pathname.startsWith(href);
}

/**
 * Navigation of the cabinet (component NMcOL): Главная · Профиль · Я дарю ·
 * Стена · Настройки, plus «Админка» for the organizer. On a phone it is the
 * bottom bar, where items share the width equally so it fits a 360px screen;
 * from `lg` it is the row of tabs under the header (desktop mockups).
 */
export function CabinetNav({ organizer = false }: { organizer?: boolean }) {
  const t = useTranslations("profile.nav");
  const pathname = usePathname();
  const items = organizer ? [...ITEMS, ADMIN_ITEM] : ITEMS;

  return (
    <nav
      aria-label={t("label")}
      className="bg-santa-white border-santa-line sticky bottom-0 border-t lg:static lg:border-t-0 lg:border-b"
    >
      <div className="lg:santa-page flex items-stretch gap-0.5 px-1 pt-2 pb-3 lg:gap-8 lg:py-0">
        {items.map(({ key, href, icon: Icon }) => {
          const active = isActive(pathname, key, href);
          return (
            <Link
              key={key}
              href={href}
              // Full prefetch: the tab's page is ready before the tap.
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 text-center text-[11px] leading-tight",
                "lg:-mb-px lg:h-16 lg:flex-none lg:flex-row lg:gap-2.5 lg:border-b-2 lg:px-1 lg:text-[15px]",
                active
                  ? "text-santa-green lg:border-santa-green font-semibold"
                  : "text-santa-muted font-normal lg:border-transparent",
              )}
            >
              {/* The active tab: a mint pill (the «Подарок оставлен» box colour) behind the icon only
                (owner, 2 Nov), so it reads at a glance without a heavy block. */}
              <span
                data-nav-icon
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-colors lg:size-5",
                  active && "bg-santa-mint lg:bg-transparent",
                )}
              >
                <Icon className="size-6 shrink-0 lg:size-5" aria-hidden />
              </span>
              {/* A long single word (uk «Налаштування», Cyrillic falls back to
                the system font) wraps within the fifth, so the bar never
                widens the page at 360px. */}
              <span
                data-nav-label
                className="w-full wrap-anywhere hyphens-auto lg:w-auto lg:whitespace-nowrap"
              >
                {t(key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
