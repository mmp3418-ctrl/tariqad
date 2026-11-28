/**
 * Structured Supabase / Storage error logging for server + client modules.
 * Never surfaces internals to the UI — call arabicDbError for user copy.
 */
export function logSupabaseError(
  scope: string,
  error: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    statusCode?: string | number;
    name?: string;
  } | null | undefined,
  extra?: Record<string, unknown>,
) {
  console.error(`[${scope}]`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    statusCode: error?.statusCode,
    name: error?.name,
    ...extra,
  });
}
