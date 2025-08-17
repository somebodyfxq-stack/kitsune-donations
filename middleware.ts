import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.nextauth?.token;
  if (pathname === "/login" && token) return NextResponse.redirect(new URL("/panel", req.url));
  return NextResponse.next();
}

export default withAuth(middleware, {
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      if (pathname.startsWith("/panel") || pathname.startsWith("/admin")) return !!token;
      return true;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
});

export const config = {
  matcher: ["/panel/:path*", "/admin/:path*", "/login"],
};

