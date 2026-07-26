"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Navigation } from "../../components/Navigation";
import { BotolaHubApiClient } from "@botolahub/api-client";
import { FantasyTeam, TeamGameweekScore, Gameweek } from "@botolahub/contracts";

export default function PointsPage(): JSX.Element | null {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [selectedGameweekId, setSelectedGameweekId] = useState<string>("");
  const [teamScore, setTeamScore] = useState<TeamGameweekScore | null>(null);

  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      Promise.all([client.getMyFantasyTeam(), client.getGameweeks()])
        .then(([teamData, gwData]) => {
          setTeam(teamData);
          setGameweeks(gwData);
          if (gwData.length > 0) {
            setSelectedGameweekId(gwData[0].id);
          }
          setFetching(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load team or gameweeks");
          setFetching(false);
        });
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && team && selectedGameweekId) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      client
        .getTeamGameweekScore(team.id, selectedGameweekId)
        .then((score) => {
          setTeamScore(score);
        })
        .catch(() => {
          setTeamScore(null);
        });
    }
  }, [user, team, selectedGameweekId]);

  if (loading || fetching) {
    return (
      <div>
        <Navigation />
        <div
          className="container"
          style={{ textAlign: "center", paddingTop: "40px" }}
        >
          <p>Loading fantasy points...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!team) {
    return (
      <div>
        <Navigation />
        <main
          className="container"
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            textAlign: "center",
          }}
        >
          <h2>Gameweek Points</h2>
          <p style={{ color: "#94A3B8", margin: "16px 0" }}>
            You must create a fantasy team before viewing gameweek points.
          </p>
        </main>
      </div>
    );
  }

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
          <h2>Gameweek Points</h2>

          <select
            value={selectedGameweekId}
            onChange={(e) => setSelectedGameweekId(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #334155",
              background: "#1E293B",
              color: "#FFF",
              fontWeight: "bold",
            }}
          >
            {gameweeks.map((gw) => (
              <option key={gw.id} value={gw.id}>
                Gameweek {gw.number} ({gw.status})
              </option>
            ))}
          </select>
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

        {/* Score Header Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
            marginBottom: "24px",
            border: "1px solid rgba(16,185,129,0.3)",
          }}
        >
          <div
            style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "8px" }}
          >
            {team.name} — Total Gameweek Score
          </div>

          <div
            style={{ fontSize: "48px", fontWeight: "800", color: "#10B981" }}
          >
            {teamScore ? teamScore.points : 0}{" "}
            <span style={{ fontSize: "20px" }}>PTS</span>
          </div>

          {teamScore && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                marginTop: "16px",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "#94A3B8" }}>Captain Bonus: </span>
                <strong style={{ color: "#10B981" }}>
                  +{teamScore.captainBonus} pts
                </strong>
              </div>
              <div>
                <span style={{ color: "#94A3B8" }}>Transfer Cost: </span>
                <strong
                  style={{
                    color: teamScore.transferCost > 0 ? "#EF4444" : "#94A3B8",
                  }}
                >
                  -{teamScore.transferCost} pts
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Lineup Points Breakdown */}
        <div
          style={{
            background: "#1E293B",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginBottom: "16px", color: "#10B981" }}>
            Lineup Points Breakdown
          </h3>

          {!teamScore ? (
            <p style={{ color: "#94A3B8", fontSize: "14px" }}>
              Scores for this gameweek have not been processed yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {team.squadMembers?.map((m) => {
                const ps = m.playerSeason;
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: "10px 14px",
                      background: "#0F172A",
                      borderRadius: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          color: "#94A3B8",
                          marginRight: "8px",
                        }}
                      >
                        {ps?.player?.position}
                      </span>
                      <span style={{ fontWeight: "bold" }}>
                        {ps?.player
                          ? `${ps.player.firstName} ${ps.player.lastName}`
                          : "Player"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#10B981",
                      }}
                    >
                      Active
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
