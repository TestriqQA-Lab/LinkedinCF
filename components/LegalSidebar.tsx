"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  FileText,
  CreditCard,
  Cookie,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LEGAL_PAGES = [
  { href: "/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/terms", label: "Terms of Use", icon: FileText },
  { href: "/refund", label: "Refund Policy", icon: CreditCard },
  { href: "/cookies", label: "Cookie Policy", icon: Cookie },
  { href: "/disclaimer", label: "Disclaimer", icon: AlertTriangle },
];

export default function LegalSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block w-56 flex-shrink-0 sticky top-24 self-start">
        <div className="space-y-1">
          {LEGAL_PAGES.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 dark:bg-blue-900/20 text-[#0A66C2] dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile horizontal nav */}
      <nav className="md:hidden overflow-x-auto pb-2 mb-6 -mx-2 px-2">
        <div className="flex gap-2 min-w-max">
          {LEGAL_PAGES.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  active
                    ? "bg-[#0A66C2] text-white border-[#0A66C2]"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
