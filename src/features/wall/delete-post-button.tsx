"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deletePost } from "./delete-post-action";

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
        className="text-santa-danger self-start text-[13px] font-semibold underline-offset-4 hover:underline"
      >
        {t("action")}
      </button>
    );
  }

  return (
    <div className="bg-santa-danger-bg flex flex-col gap-3 rounded-2xl p-4">
      <p className="text-santa-danger text-base font-bold">{t("title")}</p>
      <p className="text-santa-danger text-sm leading-relaxed">{t("text")}</p>
      {failed ? (
        <p role="alert" className="text-santa-danger text-sm">
          {t("failed")}
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="bg-santa-danger text-santa-white h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-60"
        >
          {t("confirm")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setFailed(false);
          }}
          className="text-santa-ink text-sm font-semibold"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
