"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, webClient } from "../../context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await webClient.login({ email, password });
      login(res.accessToken, res.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message || "Invalid credentials");
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
        <h2 style={{ marginBottom: "20px" }}>Log In to BotolaHub</h2>
        {error && (
          <div style={{ color: "#EF4444", marginBottom: "15px" }}>{error}</div>
        )}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
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
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p style={{ marginTop: "15px", fontSize: "14px", textAlign: "center" }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "#D4AF37" }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
