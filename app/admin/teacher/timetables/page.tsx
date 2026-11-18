import { redirect } from "next/navigation";

/** Timetable feature removed — keep route from breaking old bookmarks */
export default function RemovedTimetablesPage() {
  redirect("/admin/teacher");
}
