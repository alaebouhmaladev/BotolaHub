"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Navigation } from "../../components/Navigation";
import { BotolaHubApiClient } from "@botolahub/api-client";
import {
  FantasyTeam,
  PlayerSeason,
  TransferPreviewResult,
} from "@botolahub/contracts";

export default function TransfersPage(): JSX.Element | null {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [catalogPlayers, setCatalogPlayers] = useState<PlayerSeason[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer selection state
  const [selectedOutId, setSelectedOutId] = useState<string | null>(null);
  const [selectedInId, setSelectedInId] = useState<string | null>(null);

  // Market Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");

  // Transfer preview & confirm states
  const [preview, setPreview] = useState<TransferPreviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      Promise.all([client.getMyFantasyTeam(), client.getPlayers()])
        .then(([teamData, playersData]) => {
          setTeam(teamData);
          setCatalogPlayers(playersData.items);
          setFetching(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load squad or market catalog");
          setFetching(false);
        });
    }
  }, [loading, user, router]);

  // Trigger transfer preview when outgoing and incoming selections change
  useEffect(() => {
    if (selectedOutId && selectedInId && user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      client
        .previewTransfers({
          transfers: [
            {
              outgoingPlayerSeasonId: selectedOutId,
              incomingPlayerSeasonId: selectedInId,
            },
          ],
        })
        .then((resData) => {
          setPreview(resData);
        })
        .catch((err: Error) => {
          setError(err.message || "Transfer preview failed");
        });
    } else {
      setPreview(null);
    }
  }, [selectedOutId, selectedInId, user]);

  const handleConfirmTransfer = async () => {
    if (!selectedOutId || !selectedInId || !user) return;
    setSubmitting(true);
    setError(null);

    try {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      const res = await client.confirmTransfers({
        transfers: [
          {
            outgoingPlayerSeasonId: selectedOutId,
            incomingPlayerSeasonId: selectedInId,
          },
        ],
      });

      if (res.success) {
        setSuccessMsg("Transfer confirmed successfully!");
        setSelectedOutId(null);
        setSelectedInId(null);
        setPreview(null);
        // Refresh team
        const refreshed = await client.getMyFantasyTeam();
        setTeam(refreshed);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div>
        <Navigation />
        <div
          className="container"
          style={{ textAlign: "center", paddingTop: "40px" }}
        >
          <p>Loading Transfer Hub...</p>
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
          <h2>No Fantasy Team Found</h2>
          <p style={{ color: "#94A3B8", margin: "16px 0" }}>
            You must create a fantasy team before accessing the Transfer Hub.
          </p>
          <button
            onClick={() => router.push("/squad")}
            style={{
              padding: "10px 20px",
              background: "#10B981",
              color: "#FFF",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Create Team on Squad Page
          </button>
        </main>
      </div>
    );
  }

  const currentSquadIds = new Set(
    team.squadMembers?.map((m) => m.playerSeasonId) || [],
  );

  const filteredMarketPlayers = catalogPlayers.filter((p) => {
    if (currentSquadIds.has(p.id)) return false; // Hide already owned players
    if (positionFilter !== "ALL" && p.player?.position !== positionFilter)
      return false;
    if (searchQuery) {
      const fullName =
        `${p.player?.firstName || ""} ${p.player?.lastName || ""}`.toLowerCase();
      if (!fullName.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <Navigation />
      <main
        className="container"
        style={{ maxWidth: "1100px", margin: "30px auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2>Transfer Hub</h2>
            <p style={{ color: "#94A3B8", fontSize: "14px" }}>
              Remaining Budget:{" "}
              <strong style={{ color: "#10B981" }}>
                {((team.budgetPoints || 0) / 10).toFixed(1)}M
              </strong>
            </p>
          </div>

          {preview && (
            <div
              style={{
                background: "#1E293B",
                padding: "12px 20px",
                borderRadius: "8px",
                border: "1px solid #10B981",
              }}
            >
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                Transfer Summary
              </div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                Cost:{" "}
                {preview.deductionPoints > 0
                  ? `-${preview.deductionPoints} pts`
                  : "FREE (1 Available)"}
              </div>
            </div>
          )}
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

        {successMsg && (
          <div
            style={{
              padding: "12px",
              background: "#10B98122",
              border: "1px solid #10B981",
              borderRadius: "8px",
              marginBottom: "20px",
              color: "#6EE7B7",
            }}
          >
            {successMsg}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Current Squad Column */}
          <div
            style={{
              background: "#1E293B",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <h3 style={{ marginBottom: "16px", color: "#10B981" }}>
              1. Select Outgoing Player
            </h3>
            <div
              style={{
                display: "grid",
                gap: "8px",
                maxHeight: "500px",
                overflowY: "auto",
              }}
            >
              {team.squadMembers?.map((m) => {
                const isSelected = selectedOutId === m.playerSeasonId;
                const ps = m.playerSeason;
                return (
                  <div
                    key={m.id}
                    onClick={() =>
                      setSelectedOutId(isSelected ? null : m.playerSeasonId)
                    }
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: isSelected
                        ? "rgba(239, 68, 68, 0.2)"
                        : "#0F172A",
                      border: isSelected
                        ? "1px solid #EF4444"
                        : "1px solid transparent",
                      cursor: "pointer",
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
                        fontSize: "13px",
                        color: "#10B981",
                        fontWeight: "600",
                      }}
                    >
                      {((ps?.pricePoints || 0) / 10).toFixed(1)}M
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Browser Column */}
          <div
            style={{
              background: "#1E293B",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <h3 style={{ marginBottom: "16px", color: "#10B981" }}>
              2. Select Incoming Player
            </h3>

            {/* Filters */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                placeholder="Search player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #334155",
                  background: "#0F172A",
                  color: "#FFF",
                }}
              />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #334155",
                  background: "#0F172A",
                  color: "#FFF",
                }}
              >
                <option value="ALL">All Positions</option>
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="FWD">FWD</option>
              </select>
            </div>

            {/* Market List */}
            <div
              style={{
                display: "grid",
                gap: "8px",
                maxHeight: "430px",
                overflowY: "auto",
              }}
            >
              {filteredMarketPlayers.map((p) => {
                const isSelected = selectedInId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedInId(isSelected ? null : p.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: isSelected
                        ? "rgba(16, 185, 129, 0.2)"
                        : "#0F172A",
                      border: isSelected
                        ? "1px solid #10B981"
                        : "1px solid transparent",
                      cursor: "pointer",
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
                        {p.player?.position}
                      </span>
                      <span style={{ fontWeight: "bold" }}>
                        {p.player
                          ? `${p.player.firstName} ${p.player.lastName}`
                          : "Player"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#10B981",
                        fontWeight: "600",
                      }}
                    >
                      {((p.pricePoints || 0) / 10).toFixed(1)}M
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Transfer Confirmation Bar */}
        {selectedOutId && selectedInId && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px 24px",
              background: "#0F172A",
              borderRadius: "10px",
              border: "1px solid #10B981",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold" }}>Confirm Transfer Pair</div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                Status: {preview?.isValid ? "VALID" : "INVALID"} | Cost:{" "}
                {preview?.deductionPoints
                  ? `-${preview.deductionPoints} pts`
                  : "FREE"}
              </div>
            </div>

            <button
              onClick={handleConfirmTransfer}
              disabled={submitting || !preview?.isValid}
              style={{
                padding: "10px 24px",
                background: preview?.isValid ? "#10B981" : "#4B5563",
                color: "#FFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: preview?.isValid ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "Confirming..." : "Confirm Transfer"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
