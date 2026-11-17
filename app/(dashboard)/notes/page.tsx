import { redirect } from "next/navigation";

/** Legacy notes route — managed via PDF books + curriculum. */
export default function NotesPage() {
  redirect("/admin/pdf-books");
}
