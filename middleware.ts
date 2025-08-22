import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Custom middleware used to protect routes.  It inspects the decoded
 * next-auth token to determine whether the user is allowed to access
 * administrative or panel pages.  By checking the `role` field set in
 * authOptions.jwt() we avoid allowing stale tokens from deleted users.
 */
function middleware(req: NextRequest & { nextauth?: { token?: any } }) {
  const { pathname } = req.nextUrl;
  const token = (req as any).nextauth?.token;
  
  // If a signed in user visits the login page, send them to the
  // appropriate dashboard.  We only redirect when a valid role is
  // present to guard against deleted users retaining an empty token.
  if (pathname === "/login" && token && token.role) {
    const role = token.role as string;
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (role === "streamer") {
      return NextResponse.redirect(new URL("/panel", req.url));
    }
  }
  
  // Create response with tunnel bypass headers
  const response = NextResponse.next();
  
  // Add headers to bypass tunnel warning pages
  response.headers.set('ngrok-skip-browser-warning', 'true'); // For ngrok
  response.headers.set('bypass-tunnel-reminder', 'true'); // For localtunnel
  response.headers.set('User-Agent', 'kitsune-donations-app');
  
  return response;
}

export default withAuth(middleware, {
  callbacks: {
    /**
     * Determine whether the request is authorised.  Paths beginning with
     * `/admin` are restricted to administrators only.  Paths beginning
     * with `/panel` are accessible to streamers and admins.  If no role
     * exists on the token the request is rejected.  Other paths are
     * permitted without authentication.
     */
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      const role = token?.role;
      if (pathname.startsWith("/admin")) {
        return role === "admin";
      }
      if (pathname.startsWith("/panel")) {
        return role === "streamer" || role === "admin";
      }
      return true;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
});

// Apply this middleware only to the login page and pages under /panel or /admin.
export const config = {
  matcher: ["/panel/:path*", "/admin/:path*", "/login"],
};