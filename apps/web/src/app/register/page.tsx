"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { webClient } from "../../context/AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await webClient.register({
        email,
        displayName,
        password,
        preferredLanguage: "en",
      });
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container"
      style={{ maxWidth: "400px", margin: "40px auto" }}
    >
      <div className="hero-card">
        <h2 style={{ marginBottom: "20px" }}>Create Account</h2>
        {error && (
          <div style={{ color: "#EF4444", marginBottom: "15px" }}>{error}</div>
        )}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #334155",
                background: "#0F172A",
                color: "#FFF",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #334155",
                background: "#0F172A",
                color: "#FFF",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #334155",
                background: "#0F172A",
                color: "#FFF",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              background: "#0F5132",
              color: "#FFF",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <p style={{ marginTop: "15px", fontSize: "14px", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#D4AF37" }}>
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
