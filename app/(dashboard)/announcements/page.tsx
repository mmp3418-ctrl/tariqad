import { redirect } from "next/navigation";

/** Announcements removed from the admin nav. */
export default function AnnouncementsPage() {
  redirect("/grades");
}
