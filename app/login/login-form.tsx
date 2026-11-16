"use client";

import { useActionState, useEffect } from "react";
import { Lock, LogIn, Shield, User } from "lucide-react";
import { loginAction } from "./actions";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

const initialState: ActionResult | null = null;

export function LoginForm({ nextPath }: { nextPath: string }) {
  const { error } = useToast();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state && !state.success) error(state.error);
  }, [state, error]);

  return (
    <form action={formAction} className="w-full max-w-full space-y-4">
      <input type="hidden" name="next" value={nextPath} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">اسم المستخدم</span>
        <div className="relative">
          <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="username"
            required
            autoFocus
            autoComplete="username"
            disabled={pending}
            placeholder="admin"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:opacity-70"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">كلمة المرور</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            disabled={pending}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:opacity-70"
          />
        </div>
      </label>

      {state && !state.success && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        className="w-full"
        size="lg"
        variant="primary"
      >
        <LogIn className="h-4 w-4" />
        دخول لوحة التحكم
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <Shield className="h-3.5 w-3.5" />
        دخول آمن للمشرفين والمساعدين
      </p>
    </form>
  );
}
