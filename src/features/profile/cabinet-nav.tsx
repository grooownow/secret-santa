"use client";

import {
  Gift,
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
  { key: "gift", href: CABINET_GIFT, icon: Gift },
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
 * Подарок · Стена · Настройки, plus «Админка» for the organizer. Items share
 * the width equally, so the bar fits a 360px screen.
 */
export function CabinetNav({ organizer = false }: { organizer?: boolean }) {
  const t = useTranslations("profile.nav");
  const pathname = usePathname();
  const items = organizer ? [...ITEMS, ADMIN_ITEM] : ITEMS;

  return (
    <nav
      aria-label={t("label")}
      className="bg-santa-white border-santa-line sticky bottom-0 flex items-stretch gap-0.5 border-t px-1 pt-2 pb-3"
    >
      {items.map(({ key, href, icon: Icon }) => {
        const active = isActive(pathname, key, href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-0.5 py-1.5 text-center text-[11px] leading-tight",
              // The active tab is a filled green pill: colour alone (green
              // vs grey text) was too weak to see which tab is open.
              active
                ? "bg-santa-green text-santa-white font-semibold"
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
