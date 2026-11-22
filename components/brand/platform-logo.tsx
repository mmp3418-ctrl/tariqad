"use client";

import { useState } from "react";

const DEFAULT_LOGO = "/logo.png";

type PlatformLogoProps = {
  className?: string;
  priority?: boolean;
  /** Optional override; empty/null falls back to `/logo.png` */
  src?: string | null;
};

/**
 * Static platform mark. Always uses `/logo.png` unless an explicit `src` is passed.
 * Logo upload / site_branding management has been removed from admin.
 */
export function PlatformLogo({
  className = "h-10 w-auto object-contain",
  priority = false,
  src,
}: PlatformLogoProps) {
  const preferred = String(src ?? "").trim() || DEFAULT_LOGO;
  const [logoUrl, setLogoUrl] = useState(preferred);
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
    // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
    <img
      key={preferred}
      src={logoUrl === preferred ? preferred : logoUrl}
      alt="شعار منصة طارق"
      width={160}
      height={160}
      className={className}
      onError={() => {
        if (logoUrl !== DEFAULT_LOGO) {
          setLogoUrl(DEFAULT_LOGO);
          return;
        }
        setFailed(true);
      }}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
