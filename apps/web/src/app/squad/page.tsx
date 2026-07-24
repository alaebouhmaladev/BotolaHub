"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { webClient } from "../../context/AuthContext";
import {
  FantasyTeam,
  PlayerSeason,
  Club,
  Position,
  ValidationIssue,
} from "@botolahub/contracts";
import {
  validateSquad,
  validateStartingLineup,
  validateBench,
  validateCaptaincy,
  INITIAL_BUDGET_TENTHS,
  PlayerData,
} from "@botolahub/fantasy-engine";

export default function SquadBuilderPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerSeason[]>([]);

  // Selected Squad (15 playerSeasons)
  const [selectedSquad, setSelectedSquad] = useState<PlayerSeason[]>([]);

  // Lineup state (11 starters, 4 bench, captain, viceCaptain)
  const [startingIds, setStartingIds] = useState<string[]>([]);
  const [benchIds, setBenchIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  // Filter state
  const [filterPos, setFilterPos] = useState<Position | "ALL">("ALL");
  const [filterClub, setFilterClub] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // Feedback messages
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    issues?: ValidationIssue[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [clubsRes, playersRes, myTeam] = await Promise.all([
          webClient.getClubs(),
          webClient.getPlayers({ page: 1, limit: 250 }),
          webClient.getMyFantasyTeam(token || undefined),
        ]);

        setClubs(clubsRes);
        setAvailablePlayers(playersRes.items);

        if (myTeam) {
          setTeam(myTeam);
          if (myTeam.squadMembers) {
            const squad = myTeam.squadMembers
              .map((m) => m.playerSeason)
              .filter(Boolean) as PlayerSeason[];
            setSelectedSquad(squad);

            const activeLineup = myTeam.gameweekLineups?.[0];
            if (activeLineup && activeLineup.players) {
              const starters = activeLineup.players
                .filter((p) => p.isStarting)
                .map((p) => p.playerSeasonId);
              const bench = activeLineup.players
                .filter((p) => !p.isStarting)
                .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0))
                .map((p) => p.playerSeasonId);

              setStartingIds(starters);
              setBenchIds(bench);
              setCaptainId(activeLineup.captainId || null);
              setViceCaptainId(activeLineup.viceCaptainId || null);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load data";
        setStatusMessage({
          type: "error",
          text: msg,
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, token]);

  // Total cost and remaining budget
  const totalCostTenths = useMemo(() => {
    return selectedSquad.reduce((sum, p) => sum + p.pricePoints, 0);
  }, [selectedSquad]);

  const remainingBudgetTenths = INITIAL_BUDGET_TENTHS - totalCostTenths;

  // Position counts
  const positionCounts = useMemo(() => {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    selectedSquad.forEach((p) => {
      if (p.player?.position) {
        counts[p.player.position]++;
      }
    });
    return counts;
  }, [selectedSquad]);

  // Handle Team Creation
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;
    try {
      setSaving(true);
      const newTeam = await webClient.createFantasyTeam(
        { name: teamNameInput },
        token || undefined,
      );
      setTeam(newTeam);
      setStatusMessage({ type: "success", text: "Fantasy team created successfully!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  // Add/Replace player in squad
  const selectPlayerForSquad = (player: PlayerSeason) => {
    if (selectedSquad.some((p) => p.id === player.id)) {
      setStatusMessage({ type: "error", text: "Player is already in your squad!" });
      return;
    }

    if (selectedSquad.length >= 15) {
      setStatusMessage({ type: "error", text: "Squad is full (15 players maximum)." });
      return;
    }

    const updated = [...selectedSquad, player];
    setSelectedSquad(updated);

    // Auto-assign to starters if starters < 11
    if (startingIds.length < 11) {
      setStartingIds([...startingIds, player.id]);
    } else {
      setBenchIds([...benchIds, player.id]);
    }

    // Auto-assign captain if none
    if (!captainId) setCaptainId(player.id);
    else if (!viceCaptainId && player.id !== captainId) setViceCaptainId(player.id);
  };

  // Remove player from squad
  const removePlayerFromSquad = (playerId: string) => {
    setSelectedSquad(selectedSquad.filter((p) => p.id !== playerId));
    setStartingIds(startingIds.filter((id) => id !== playerId));
    setBenchIds(benchIds.filter((id) => id !== playerId));
    if (captainId === playerId) setCaptainId(null);
    if (viceCaptainId === playerId) setViceCaptainId(null);
  };

  // Save Complete Squad & Lineup
  const handleSaveAll = async () => {
    if (!team) return;
    try {
      setSaving(true);
      setStatusMessage(null);

      const squadPlayerIds = selectedSquad.map((p) => p.id);
      const playerMap = new Map<string, PlayerData>();
      selectedSquad.forEach((p) => {
        if (p.player) {
          playerMap.set(p.id, {
            playerSeasonId: p.id,
            position: p.player.position,
            clubId: p.clubId,
          });
        }
      });

      // 1. Client-side Squad Validation
      const squadVal = validateSquad(
        selectedSquad.map((p) => ({ playerSeasonId: p.id, pricePoints: p.pricePoints })),
        playerMap,
      );

      if (!squadVal.isValid) {
        setStatusMessage({
          type: "error",
          text: squadVal.issues[0]?.message || "Squad validation failed",
          issues: squadVal.issues,
        });
        setSaving(false);
        return;
      }

      // 2. Client-side Lineup Validation
      const lineupVal = validateStartingLineup(startingIds, squadPlayerIds, playerMap);
      const benchVal = validateBench(benchIds, squadPlayerIds, startingIds);
      const captVal = validateCaptaincy(captainId, viceCaptainId, startingIds);

      const allIssues = [...lineupVal.issues, ...benchVal.issues, ...captVal.issues];
      if (allIssues.length > 0) {
        setStatusMessage({
          type: "error",
          text: allIssues[0]?.message || "Lineup validation failed",
          issues: allIssues,
        });
        setSaving(false);
        return;
      }

      // 3. Save Squad to API
      await webClient.updateSquad(
        team.id,
        { squadPlayerIds },
        token || undefined,
      );

      // 4. Save Lineup to API
      const finalTeam = await webClient.updateLineup(
        team.id,
        {
          startingPlayerIds: startingIds,
          benchPlayerIds: benchIds,
          captainId: captainId!,
          viceCaptainId: viceCaptainId!,
        },
        token || undefined,
      );

      setTeam(finalTeam);
      setStatusMessage({
        type: "success",
        text: "Squad and starting lineup saved successfully!",
      });
    } catch (err: unknown) {
      const errObj = err as Error & { details?: { issues?: ValidationIssue[] } };
      const issues = errObj.details?.issues || [];
      setStatusMessage({
        type: "error",
        text: errObj.message || "Failed to save squad",
        issues,
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtered available players for picker
  const filteredPickerPlayers = useMemo(() => {
    return availablePlayers.filter((p) => {
      if (filterPos !== "ALL" && p.player?.position !== filterPos) return false;
      if (filterClub && p.clubId !== filterClub) return false;
      if (filterSearch) {
        const name = `${p.player?.firstName} ${p.player?.lastName}`.toLowerCase();
        if (!name.includes(filterSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [availablePlayers, filterPos, filterClub, filterSearch]);

  if (authLoading || loading) {
    return (
      <div className="container" style={{ padding: "60px", textAlign: "center" }}>
        <h2>Loading BotolaHub Squad Manager...</h2>
      </div>
    );
  }

  // Onboarding: Prompt to create a team
  if (!team) {
    return (
      <div className="container" style={{ maxWidth: "500px", margin: "60px auto" }}>
        <div className="hero-card" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>
            Create Your Fantasy Team
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Welcome to BotolaHub! Pick a unique team name to start building your 15-player squad for the 2024-25 season.
          </p>
          <form onSubmit={handleCreateTeam}>
            <input
              type="text"
              placeholder="e.g. Atlas Lions FC"
              value={teamNameInput}
              onChange={(e) => setTeamNameInput(e.target.value)}
              className="input-field"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                marginBottom: "16px",
                background: "var(--bg-card)",
                color: "var(--text-main)",
              }}
              required
            />
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                padding: "14px",
                background: "var(--primary)",
                color: "#FFF",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {saving ? "Creating..." : "Create Team"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "20px 0" }}>
      {/* Squad Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          background: "var(--bg-card)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "bold", margin: 0 }}>
            {team.name}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "4px 0 0" }}>
            Gameweek 4 Deadline Open
          </p>
        </div>

        {/* Budget Counter */}
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              REMAINING BUDGET
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: "bold",
                color: remainingBudgetTenths < 0 ? "#EF4444" : "#10B981",
              }}
            >
              {(remainingBudgetTenths / 10).toFixed(1)} M
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              SQUAD SIZE
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold" }}>
              {selectedSquad.length} / 15
            </div>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              padding: "12px 28px",
              background: "var(--primary)",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            }}
          >
            {saving ? "Saving..." : "Save Squad & Lineup"}
          </button>
        </div>
      </div>

      {/* Validation / Status Banner */}
      {statusMessage && (
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
            background:
              statusMessage.type === "success"
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${statusMessage.type === "success" ? "#10B981" : "#EF4444"}`,
            color: statusMessage.type === "success" ? "#10B981" : "#EF4444",
          }}
        >
          <div style={{ fontWeight: "bold" }}>{statusMessage.text}</div>
          {statusMessage.issues && statusMessage.issues.length > 0 && (
            <ul style={{ marginTop: "8px", paddingLeft: "20px", fontSize: "0.85rem" }}>
              {statusMessage.issues.map((iss, i) => (
                <li key={i}>{iss.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Position Requirements Checklist */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <span
          className={`badge ${positionCounts.GK === 2 ? "badge-success" : "badge-warn"}`}
        >
          GK: {positionCounts.GK}/2
        </span>
        <span
          className={`badge ${positionCounts.DEF === 5 ? "badge-success" : "badge-warn"}`}
        >
          DEF: {positionCounts.DEF}/5
        </span>
        <span
          className={`badge ${positionCounts.MID === 5 ? "badge-success" : "badge-warn"}`}
        >
          MID: {positionCounts.MID}/5
        </span>
        <span
          className={`badge ${positionCounts.FWD === 3 ? "badge-success" : "badge-warn"}`}
        >
          FWD: {positionCounts.FWD}/3
        </span>
      </div>

      {/* Main Pitch & Selector Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
        }}
      >
        {/* Pitch Visualization */}
        <div
          style={{
            background: "linear-gradient(180deg, #15803D 0%, #166534 100%)",
            borderRadius: "16px",
            padding: "32px 20px",
            border: "3px solid #22C55E",
            position: "relative",
            minHeight: "580px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Pitch lines decoration */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "2px",
              background: "rgba(255, 255, 255, 0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Goalkeeper Line */}
          <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
            {selectedSquad
              .filter((p) => p.player?.position === "GK")
              .map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isCaptain={p.id === captainId}
                  isVice={p.id === viceCaptainId}
                  onRemove={() => removePlayerFromSquad(p.id)}
                  onToggleCaptain={() => {
                    if (captainId === p.id) {
                      setCaptainId(null);
                    } else {
                      setCaptainId(p.id);
                      if (viceCaptainId === p.id) setViceCaptainId(null);
                    }
                  }}
                />
              ))}
          </div>

          {/* Defenders Line */}
          <div style={{ display: "flex", justifyContent: "space-around", gap: "12px" }}>
            {selectedSquad
              .filter((p) => p.player?.position === "DEF")
              .map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isCaptain={p.id === captainId}
                  isVice={p.id === viceCaptainId}
                  onRemove={() => removePlayerFromSquad(p.id)}
                  onToggleCaptain={() => {
                    if (captainId === p.id) {
                      setCaptainId(null);
                    } else {
                      setCaptainId(p.id);
                      if (viceCaptainId === p.id) setViceCaptainId(null);
                    }
                  }}
                />
              ))}
          </div>

          {/* Midfielders Line */}
          <div style={{ display: "flex", justifyContent: "space-around", gap: "12px" }}>
            {selectedSquad
              .filter((p) => p.player?.position === "MID")
              .map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isCaptain={p.id === captainId}
                  isVice={p.id === viceCaptainId}
                  onRemove={() => removePlayerFromSquad(p.id)}
                  onToggleCaptain={() => {
                    if (captainId === p.id) {
                      setCaptainId(null);
                    } else {
                      setCaptainId(p.id);
                      if (viceCaptainId === p.id) setViceCaptainId(null);
                    }
                  }}
                />
              ))}
          </div>

          {/* Forwards Line */}
          <div style={{ display: "flex", justifyContent: "space-around", gap: "12px" }}>
            {selectedSquad
              .filter((p) => p.player?.position === "FWD")
              .map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isCaptain={p.id === captainId}
                  isVice={p.id === viceCaptainId}
                  onRemove={() => removePlayerFromSquad(p.id)}
                  onToggleCaptain={() => {
                    if (captainId === p.id) {
                      setCaptainId(null);
                    } else {
                      setCaptainId(p.id);
                      if (viceCaptainId === p.id) setViceCaptainId(null);
                    }
                  }}
                />
              ))}
          </div>
        </div>

        {/* Player Picker / Transfer Panel */}
        <div
          style={{
            background: "var(--bg-card)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            height: "640px",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px" }}>
            Player Selection
          </h3>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setFilterPos(pos)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: "bold",
                  background: filterPos === pos ? "var(--primary)" : "var(--bg-dark)",
                  color: filterPos === pos ? "#FFF" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search player name..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-dark)",
              color: "var(--text-main)",
              marginBottom: "12px",
              fontSize: "0.85rem",
            }}
          />

          {/* Club Filter */}
          <select
            value={filterClub}
            onChange={(e) => setFilterClub(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-dark)",
              color: "var(--text-main)",
              marginBottom: "16px",
              fontSize: "0.85rem",
            }}
          >
            <option value="">All Clubs</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Player List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {filteredPickerPlayers.map((p) => {
              const isSelected = selectedSquad.some((sp) => sp.id === p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--bg-dark)",
                    border: "1px solid var(--border)",
                    opacity: isSelected ? 0.5 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "0.85rem" }}>
                      {p.player?.firstName} {p.player?.lastName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {p.player?.position} • {p.club?.shortName}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "0.85rem", color: "#10B981" }}>
                      {(p.pricePoints / 10).toFixed(1)} M
                    </div>
                    <button
                      onClick={() => selectPlayerForSquad(p)}
                      disabled={isSelected}
                      style={{
                        padding: "6px 12px",
                        background: isSelected ? "#4B5563" : "var(--primary)",
                        color: "#FFF",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        cursor: isSelected ? "default" : "pointer",
                      }}
                    >
                      {isSelected ? "Added" : "+ Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Player Card Component on Pitch
function PlayerCard({
  player,
  isCaptain,
  isVice,
  onRemove,
  onToggleCaptain,
}: {
  player: PlayerSeason;
  isCaptain: boolean;
  isVice: boolean;
  onRemove: () => void;
  onToggleCaptain: () => void;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        borderRadius: "8px",
        padding: "8px 12px",
        textAlign: "center",
        border: isCaptain ? "2px solid #F59E0B" : isVice ? "2px solid #3B82F6" : "1px solid rgba(255,255,255,0.2)",
        color: "#FFF",
        minWidth: "90px",
        position: "relative",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
      }}
    >
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          top: "-6px",
          right: "-6px",
          background: "#EF4444",
          color: "#FFF",
          border: "none",
          borderRadius: "50%",
          width: "18px",
          height: "18px",
          fontSize: "10px",
          lineHeight: "18px",
          cursor: "pointer",
        }}
      >
        ✕
      </button>

      <div
        onClick={onToggleCaptain}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ fontSize: "0.75rem", fontWeight: "bold" }}>
          {player.player?.lastName}
          {isCaptain && <span style={{ color: "#F59E0B", marginLeft: "4px" }}>(C)</span>}
          {isVice && <span style={{ color: "#3B82F6", marginLeft: "4px" }}>(V)</span>}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
          {(player.pricePoints / 10).toFixed(1)} M
        </div>
      </div>
    </div>
  );
}
