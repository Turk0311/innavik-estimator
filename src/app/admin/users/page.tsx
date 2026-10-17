import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-2.5 py-1.5">
              <Image src="/innavik-logo.png" alt="Innavik" width={2340} height={564} className="h-7 w-auto" priority />
            </div>
            <span className="text-lg font-bold tracking-tight">Estimator</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors">
              Admin
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage rep and admin accounts</p>
          </div>
        </div>

        <UsersClient />
      </main>
    </div>
  );
}
