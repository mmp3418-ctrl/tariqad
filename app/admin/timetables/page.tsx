import { redirect } from "next/navigation";

/** Alias route → dedicated Interactive Timetable Creator */
export default function TimetablesAliasPage() {
  redirect("/admin/teacher/timetables");
}
