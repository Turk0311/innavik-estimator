export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (sign-in page)
     * - /api/auth/* (NextAuth internal routes)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, static files, etc.
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
