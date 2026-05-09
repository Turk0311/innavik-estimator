"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
    >
      Sign out
    </button>
  );
}
