import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/panel/:path*",
    "/admin/:path*",
    "/obs/:path*",
    "/api/monobank/:path*",
    "/api/users/:path*",
  ],
};
