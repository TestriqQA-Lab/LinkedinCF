import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { checkSiteGate } from "@/lib/site-gate";

// ── Site-wide password gate ────────────────────────────────────────────────────
// Set SITE_PASSWORD env var to enable. Remove it to disable.
// API routes, cron jobs, webhooks, and static assets bypass the gate.

const authMiddleware = withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Always allow public/auth routes
    const publicPaths = ["/", "/login", "/subscribe", "/onboarding"];
    if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }

    // Always allow API auth, webhook, subscription, and profile routes
    if (
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/webhooks") ||
      pathname.startsWith("/api/subscription") ||
      pathname.startsWith("/api/profile") ||
      pathname.startsWith("/api/cron")  // Vercel Cron jobs (protected by CRON_SECRET)
    ) {
      return NextResponse.next();
    }

    // Admin routes: require admin role
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (!token || token.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // For all dashboard routes, enforce onboarding and subscription gates
    if (token) {
      if (!token.onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
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

// ── Main middleware: gate check → auth check ─────────────────────────────────
export default function middleware(req: NextRequest) {
  // Check site-wide password gate first
  const gateResponse = checkSiteGate(req);
  if (gateResponse) return gateResponse;

  // Then run the auth middleware
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: [
    // Site gate catches everything via checkSiteGate's own path filtering
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

