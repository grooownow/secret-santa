import { Heart } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { getLocalized, LocalizedText, postKey } from "@/features/translation";
import { isLocale } from "@/i18n/locale";
import { DeletePostButton } from "./delete-post-button";
import type { WallPost } from "./queries";

/** The feed (frame z6Qz5) and its empty state (frame uuByn). */
export async function WallFeed({ posts }: { posts: WallPost[] }) {
  const [t, locale] = await Promise.all([
    getTranslations("wall.feed"),
    getLocale(),
  ]);
  const viewer = isLocale(locale) ? locale : "en";

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
          <Heart className="size-6" aria-hidden />
        </div>
        <h2 className="text-santa-ink text-xl font-bold">{t("emptyTitle")}</h2>
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("emptyText")}
        </p>
      </div>
    );
  }

  const translated = await getLocalized(
    posts.map((post) => ({ key: postKey(post.id), original: post.text })),
    viewer,
  );
  const date = new Intl.DateTimeFormat(viewer, {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });

  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => (
        <li
          key={post.id}
          className="border-santa-line bg-santa-white flex flex-col gap-3 rounded-2xl border p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-santa-green text-sm font-semibold">
              {post.authorName}
            </p>
            <time
              dateTime={post.createdAt.toISOString()}
              className="text-santa-muted text-xs"
            >
              {date.format(post.createdAt)}
            </time>
          </div>
          <p className="text-santa-ink text-sm leading-relaxed">
            <LocalizedText
              original={post.text}
              translated={translated.get(postKey(post.id)) ?? null}
              sourceLocale={post.authorLocale}
            />
          </p>
          {post.photoUrl ? (
            // Photos are already compressed and stored by us.
            <Image
              src={post.photoUrl}
              alt={t("photoAlt", { name: post.authorName })}
              width={600}
              height={450}
              unoptimized
              className="h-auto w-full rounded-xl object-cover"
            />
          ) : null}
          {post.canDelete ? <DeletePostButton id={post.id} /> : null}
        </li>
      ))}
    </ul>
  );
}
