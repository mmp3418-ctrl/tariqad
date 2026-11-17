import { redirect } from "next/navigation";

/** Notes/summaries are managed inside /units */
export default function NotesPage() {
  redirect("/units");
}
