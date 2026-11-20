"use client";

import { useState } from "react";

export function CopyButton({
  path,
  label = "Copier le lien",
}: {
  path: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const url = new URL(path, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-secondary px-3 py-1.5 text-xs"
    >
      {copied ? "Copié !" : label}
    </button>
  );
}
