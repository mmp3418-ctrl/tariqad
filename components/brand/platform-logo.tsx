"use client";

import { useEffect, useState } from "react";
import { getSiteBranding } from "@/app/admin/settings/actions";

const DEFAULT_LOGO = "/logo.png";

type PlatformLogoProps = {
  className?: string;
  priority?: boolean;
  /** Optional override (e.g. live preview) */
  src?: string | null;
};

export function PlatformLogo({
  className = "h-10 w-auto object-contain",
  priority = false,
  src,
}: PlatformLogoProps) {
  const [logoUrl, setLogoUrl] = useState(src?.trim() || DEFAULT_LOGO);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (src != null) {
      setLogoUrl(src.trim() || DEFAULT_LOGO);
      setFailed(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await getSiteBranding();
        if (cancelled) return;
        const url = result.success ? result.data?.logo_url?.trim() : "";
        setLogoUrl(url || DEFAULT_LOGO);
        setFailed(false);
      } catch {
        if (!cancelled) setLogoUrl(DEFAULT_LOGO);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

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
    // eslint-disable-next-line @next/next/no-img-element -- public/custom brand asset with fallback
    <img
      src={logoUrl}
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
