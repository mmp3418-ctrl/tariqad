"use server";

import { revalidatePath } from "next/cache";
import {
  createSubjectRecord,
  deleteSubjectRecord,
  listSubjects,
  updateSubjectRecord,
  type SubjectInput,
  type SubjectListFilter,
} from "@/lib/subjects";
import type { ActionResult, Subject } from "@/lib/types";

export type { SubjectInput, SubjectListFilter };

function revalidateSubjectPaths() {
  revalidatePath("/admin/materials");
  revalidatePath("/admin/playlists");
}

export async function getSubjects(
  filter: SubjectListFilter = {},
): Promise<ActionResult<Subject[]>> {
  return listSubjects(filter);
}

export async function createSubject(
  input: SubjectInput,
): Promise<ActionResult<Subject>> {
  const result = await createSubjectRecord(input);
  if (result.success) revalidateSubjectPaths();
  return result;
}

export async function updateSubject(
  id: string,
  input: SubjectInput,
): Promise<ActionResult<Subject>> {
  const result = await updateSubjectRecord(id, input);
  if (result.success) revalidateSubjectPaths();
  return result;
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const result = await deleteSubjectRecord(id);
  if (result.success) revalidateSubjectPaths();
  return result;
}
