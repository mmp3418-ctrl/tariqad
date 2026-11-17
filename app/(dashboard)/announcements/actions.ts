"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/types";

/** Announcements/ads removed from the platform. */
export async function getAnnouncements(): Promise<ActionResult<never[]>> {
  return { success: true, data: [] };
}

export async function createAnnouncement(): Promise<ActionResult> {
  redirect("/grades");
}

export async function updateAnnouncement(): Promise<ActionResult> {
  redirect("/grades");
}

export async function toggleAnnouncement(): Promise<ActionResult> {
  redirect("/grades");
}

export async function deleteAnnouncement(): Promise<ActionResult> {
  redirect("/grades");
}
