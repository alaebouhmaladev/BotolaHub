"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export function Navigation(): JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/squad", label: "Squad" },
    { href: "/transfers", label: "Transfers" },
    { href: "/fixtures", label: "Fixtures" },
    { href: "/points", label: "Points" },
  ];

  return (
    <header
      style={{
        background: "var(--card-bg, #1e293b)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <Link
          href="/dashboard"
          style={{
            color: "#FFF",
            fontSize: "18px",
            fontWeight: "bold",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⚽ <span style={{ color: "#10B981" }}>BotolaHub</span>
        </Link>

        <nav style={{ display: "flex", gap: "8px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive
                    ? "rgba(16, 185, 129, 0.2)"
                    : "transparent",
                  color: isActive ? "#10B981" : "#94A3B8",
                  border: isActive
                    ? "1px solid rgba(16, 185, 129, 0.4)"
                    : "1px solid transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "14px", color: "#94A3B8" }}>
          {user.displayName}
        </span>
        <button
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          style={{
            padding: "6px 12px",
            background: "#EF4444",
            color: "#FFF",
            border: "none",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
