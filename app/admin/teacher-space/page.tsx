import { redirect } from "next/navigation";

/** Legacy path — canonical Teacher Space lives at `/admin/teacher`. */
export default function TeacherSpaceRedirectPage() {
  redirect("/admin/teacher");
}
