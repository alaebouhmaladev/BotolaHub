"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { Navigation } from "../../../components/Navigation";
import { BotolaHubApiClient } from "@botolahub/api-client";
import {
  Fixture,
  FixtureEvent,
  PlayerFixtureStats,
} from "@botolahub/contracts";

export default function FixtureDetailPage(): JSX.Element | null {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [events, setEvents] = useState<FixtureEvent[]>([]);
  const [stats, setStats] = useState<PlayerFixtureStats[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (user && id) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      Promise.all([
        client.getFixture(id),
        client.getFixtureEvents(id),
        client.getFixtureStats(id),
      ])
        .then(([fix, evts, statData]) => {
          setFixture(fix);
          setEvents(evts);
          setStats(statData);
          setFetching(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load fixture detail");
          setFetching(false);
        });
    }
  }, [loading, user, id, router]);

  if (loading || fetching) {
    return (
      <div>
        <Navigation />
        <div
          className="container"
          style={{ textAlign: "center", paddingTop: "40px" }}
        >
          <p>Loading match details...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <Navigation />
      <main
        className="container"
        style={{ maxWidth: "800px", margin: "30px auto" }}
      >
        {error ? (
          <div
            style={{
              padding: "12px",
              background: "#EF444422",
              border: "1px solid #EF4444",
              borderRadius: "8px",
              color: "#FCA5A5",
            }}
          >
            {error}
          </div>
        ) : fixture ? (
          <div>
            {/* Match Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                marginBottom: "24px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#94A3B8",
                  marginBottom: "12px",
                }}
              >
                {fixture.venue || "Botola Pro Stadium"}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: 1, fontSize: "20px", fontWeight: "bold" }}>
                  {fixture.homeClub?.name}
                </div>

                <div style={{ padding: "0 20px" }}>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: "800",
                      color: "#10B981",
                    }}
                  >
                    {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      background:
                        fixture.status === "LIVE" ? "#EF4444" : "#3B82F6",
                      color: "#FFF",
                    }}
                  >
                    {fixture.status}
                  </span>
                </div>

                <div style={{ flex: 1, fontSize: "20px", fontWeight: "bold" }}>
                  {fixture.awayClub?.name}
                </div>
              </div>
            </div>

            {/* Events Timeline */}
            <div
              style={{
                background: "#1E293B",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  marginBottom: "16px",
                  fontSize: "16px",
                  color: "#10B981",
                }}
              >
                Match Events Timeline
              </h3>
              {events.length === 0 ? (
                <p style={{ color: "#94A3B8", fontSize: "14px" }}>
                  No match events recorded yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        padding: "8px 12px",
                        background: "#0F172A",
                        borderRadius: "6px",
                        display: "flex",
                        gap: "12px",
                        fontSize: "14px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          color: "#10B981",
                          width: "40px",
                        }}
                      >
                        {evt.minute}&apos;
                      </span>
                      <span
                        style={{
                          textTransform: "capitalize",
                          fontWeight: "600",
                        }}
                      >
                        {evt.type}
                      </span>
                      <span style={{ color: "#94A3B8" }}>{evt.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Player Statistics */}
            <div
              style={{
                background: "#1E293B",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  marginBottom: "16px",
                  fontSize: "16px",
                  color: "#10B981",
                }}
              >
                Player Match Statistics
              </h3>
              {stats.length === 0 ? (
                <p style={{ color: "#94A3B8", fontSize: "14px" }}>
                  No player stats recorded yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid #334155",
                          color: "#94A3B8",
                          textAlign: "left",
                        }}
                      >
                        <th style={{ padding: "8px" }}>Player</th>
                        <th style={{ padding: "8px" }}>Min</th>
                        <th style={{ padding: "8px" }}>G</th>
                        <th style={{ padding: "8px" }}>A</th>
                        <th style={{ padding: "8px" }}>CS</th>
                        <th style={{ padding: "8px" }}>YC</th>
                        <th style={{ padding: "8px" }}>RC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((st) => (
                        <tr
                          key={st.id}
                          style={{ borderBottom: "1px solid #0F172A" }}
                        >
                          <td style={{ padding: "8px", fontWeight: "600" }}>
                            {st.playerSeason?.player
                              ? `${st.playerSeason.player.firstName} ${st.playerSeason.player.lastName}`
                              : "Player"}
                          </td>
                          <td style={{ padding: "8px" }}>{st.minutesPlayed}</td>
                          <td style={{ padding: "8px" }}>{st.goals}</td>
                          <td style={{ padding: "8px" }}>{st.assists}</td>
                          <td style={{ padding: "8px" }}>
                            {st.cleanSheet ? "Yes" : "No"}
                          </td>
                          <td style={{ padding: "8px" }}>{st.yellowCards}</td>
                          <td style={{ padding: "8px" }}>{st.redCards}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
