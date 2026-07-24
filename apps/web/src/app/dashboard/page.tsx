"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function DashboardPage(): JSX.Element | null {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="container">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="container"
      style={{ maxWidth: "600px", margin: "40px auto" }}
    >
      <div className="hero-card">
        <h2>User Dashboard</h2>
        <div style={{ margin: "20px 0", textAlign: "left" }}>
          <p>
            <strong>Name:</strong> {user.displayName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link
            href="/squad"
            style={{
              padding: "10px 20px",
              background: "var(--primary)",
              color: "#FFF",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            Manage Fantasy Squad
          </Link>

          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            style={{
              padding: "10px 20px",
              background: "#EF4444",
              color: "#FFF",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
