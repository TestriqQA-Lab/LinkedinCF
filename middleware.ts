import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Always allow public/auth routes
    const publicPaths = ["/", "/login", "/subscribe", "/onboarding"];
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }

    // Always allow API auth, webhook, subscription, and profile routes
    // Profile routes must be reachable in all states since they have their own auth checks
    // Subscription routes must be reachable to complete checkout even when trial expired
    if (
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/webhooks") ||
      pathname.startsWith("/api/subscription") ||
      pathname.startsWith("/api/profile")
    ) {
      return NextResponse.next();
    }

    // Admin routes: require admin role, bypass onboarding/subscription gates
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (!token || token.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // For all dashboard routes, enforce onboarding and subscription gates
    if (token) {
      // Gate 1: Onboarding must be completed
      if (!token.onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }

      // Gate 2: Subscription must be active or trialing (even if expired trial — read-only access)
      // Only hard-redirect for canceled, unpaid, or no subscription
      const status = token.subscriptionStatus as string | undefined;

      if (!status || (status !== "active" && status !== "trialing" && status !== "cancel_pending")) {
        return NextResponse.redirect(new URL("/subscribe", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/calendar/:path*",
    "/posts/:path*",
    "/settings/:path*",
    "/newsletter/:path*",
    "/api/generate/:path*",
    "/api/content/:path*",
    "/api/profile/:path*",
    "/api/subscription/:path*",
    "/api/post-to-linkedin/:path*",
    "/api/newsletter/:path*",
    // Note: /api/onboarding is intentionally excluded — it must be reachable
    // before onboarding is complete, and it has its own session auth check.
  ],
};
