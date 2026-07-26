"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { Navigation } from "../../components/Navigation";
import { BotolaHubApiClient } from "@botolahub/api-client";
import { Fixture } from "@botolahub/contracts";

export default function FixturesPage(): JSX.Element | null {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      client
        .getFixtures()
        .then((data) => {
          setFixtures(data);
          setFetching(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load fixtures");
          setFetching(false);
        });
    }
  }, [loading, user, router]);

  if (loading || fetching) {
    return (
      <div>
        <Navigation />
        <div
          className="container"
          style={{ textAlign: "center", paddingTop: "40px" }}
        >
          <p>Loading fixtures...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredFixtures = fixtures.filter((f) => {
    if (filterStatus === "ALL") return true;
    return f.status === filterStatus;
  });

  return (
    <div>
      <Navigation />
      <main
        className="container"
        style={{ maxWidth: "800px", margin: "30px auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2>Botola Pro Fixtures</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            {["ALL", "SCHEDULED", "LIVE", "FINISHED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #334155",
                  background: filterStatus === st ? "#10B981" : "#1E293B",
                  color: "#FFF",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "#EF444422",
              border: "1px solid #EF4444",
              borderRadius: "8px",
              marginBottom: "20px",
              color: "#FCA5A5",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: "12px" }}>
          {filteredFixtures.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                background: "#1E293B",
                borderRadius: "8px",
                color: "#94A3B8",
              }}
            >
              No fixtures found for selected filter.
            </div>
          ) : (
            filteredFixtures.map((fix) => (
              <Link
                key={fix.id}
                href={`/fixtures/${fix.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                }}
              >
                <div
                  style={{
                    background: "#1E293B",
                    borderRadius: "10px",
                    padding: "16px",
                    border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <div
                    style={{ flex: 1, textAlign: "right", fontWeight: "bold" }}
                  >
                    {fix.homeClub?.name || "Home Club"}
                  </div>

                  <div
                    style={{
                      width: "120px",
                      textAlign: "center",
                      padding: "0 10px",
                    }}
                  >
                    {fix.status === "FINISHED" || fix.status === "LIVE" ? (
                      <span
                        style={{
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#10B981",
                        }}
                      >
                        {fix.homeScore ?? 0} - {fix.awayScore ?? 0}
                      </span>
                    ) : (
                      <span style={{ fontSize: "14px", color: "#94A3B8" }}>
                        {new Date(fix.kickoffUtc).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <div style={{ marginTop: "4px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                          background:
                            fix.status === "LIVE"
                              ? "#EF4444"
                              : fix.status === "FINISHED"
                                ? "#3B82F6"
                                : "#6B7280",
                          color: "#FFF",
                        }}
                      >
                        {fix.status}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{ flex: 1, textAlign: "left", fontWeight: "bold" }}
                  >
                    {fix.awayClub?.name || "Away Club"}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
