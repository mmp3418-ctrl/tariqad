import { redirect } from "next/navigation";

/** Schedules live inside unified /teacher-space — keep this route as a redirect. */
export default function SchedulesPage() {
  redirect("/teacher-space");
}
