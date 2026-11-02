"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deletePost } from "./delete-post-action";
import { Spinner } from "@/components/spinner";

/** "Удалить" with a confirm step (frame L7mxJF) before anything is removed. */
export function DeletePostButton({ id }: { id: string }) {
  const t = useTranslations("wall.delete");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    setFailed(false);
    start(async () => {
      const result = await deletePost(id);
      if (result.deleted) {
        router.refresh();
        return;
      }
      setFailed(true);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-santa-danger self-start text-[13px] font-semibold"
      >
        {t("action")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("title")}
      </p>
      <p className="text-santa-muted text-sm leading-relaxed">{t("text")}</p>
      {failed ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("failed")}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setConfirming(false);
          setFailed(false);
        }}
        className="bg-santa-green text-santa-white flex h-14 w-full items-center justify-between rounded-full px-6 text-base font-semibold disabled:opacity-60"
      >
        <span>{t("cancel")}</span>
        <ArrowUpRight className="size-[18px]" aria-hidden />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        aria-busy={pending || undefined}
        className="text-santa-danger flex items-center gap-1.5 self-start text-[13px] font-semibold disabled:opacity-60"
      >
        {t("confirm")}
        {pending ? <Spinner className="size-3.5" /> : null}
      </button>
    </div>
  );
}
