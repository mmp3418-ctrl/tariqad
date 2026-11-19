"use client";

import { useState } from "react";

type PlatformLogoProps = {
  className?: string;
  priority?: boolean;
};

export function PlatformLogo({
  className = "h-10 w-auto object-contain",
  priority = false,
}: PlatformLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-sm font-extrabold text-white"
        aria-hidden="true"
      >
        ط
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- public brand asset with graceful fallback
    <img
      src="/logo.png"
      alt="شعار منصة طارق"
      width={160}
      height={160}
      className={className}
      onError={() => setFailed(true)}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
