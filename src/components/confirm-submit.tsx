"use client";

import type { ReactNode } from "react";

export function ConfirmSubmit({
  message,
  children,
  className = "btn-danger",
}: {
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
