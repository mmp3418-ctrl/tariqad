"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Advertisements / announcements removed from the admin panel. */
export function AnnouncementsManager() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/grades");
  }, [router]);
  return null;
}
