import { redirect } from "next/navigation";

/** Legacy route — PDFs live on the dedicated books page. */
export default function LegacyResourcesPage() {
  redirect("/admin/pdf-books");
}
