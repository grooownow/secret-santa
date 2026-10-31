import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/features/account";
import { isOrganizer, requireVerifiedAccount } from "@/features/auth";
import { getSettings, wallOpen } from "@/features/game";
import { getCurrentParticipant } from "@/features/profile";
import { listPosts, PostForm, WallClosed, WallFeed } from "@/features/wall";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wall");
  return { title: t("title") };
}

// The thank-you wall: open 25 December to 9 January; earlier, a placeholder.
export default async function WallPage() {
  const account = await requireVerifiedAccount();
  const settings = await getSettings();
  if (!wallOpen(new Date(), settings)) {
    return <WallClosed opensOn={settings.giftsStartOn} />;
  }
  const [t, author, posts] = await Promise.all([
    getTranslations("wall"),
    getCurrentParticipant(account.id),
    listPosts({ userId: account.id, organizer: isOrganizer(account) }),
  ]);
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      {author ? (
        <PostForm authorName={author.name}>
          <WallFeed posts={posts} />
        </PostForm>
      ) : (
        <WallFeed posts={posts} />
      )}
    </>
  );
}
