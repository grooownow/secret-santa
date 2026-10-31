"use client";

import { useState } from "react";

/** Shows the translation with a toggle to the original and back. */
export function TranslationToggle({
  original,
  translated,
  showOriginalLabel,
  showTranslationLabel,
}: {
  original: string;
  translated: string;
  showOriginalLabel: string;
  showTranslationLabel: string;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  return (
    <>
      <span className="whitespace-pre-line">
        {showOriginal ? original : translated}
      </span>{" "}
      <button
        type="button"
        onClick={() => setShowOriginal((value) => !value)}
        className="text-santa-green cursor-pointer text-xs font-semibold underline-offset-4 hover:underline"
      >
        {showOriginal ? showTranslationLabel : showOriginalLabel}
      </button>
    </>
  );
}
