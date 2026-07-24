import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { BotolaHubApiClient } from "@botolahub/api-client";
import {
  FantasyTeam,
  PlayerSeason,
  Position,
} from "@botolahub/contracts";
import {
  validateSquad,
  INITIAL_BUDGET_TENTHS,
  PlayerData,
} from "@botolahub/fantasy-engine";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function MobileSquadScreen() {
  const { user, token, loading: authLoading } = useAuth();
  const client = useMemo(() => new BotolaHubApiClient({ baseUrl: API_URL }), []);

  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [availablePlayers, setAvailablePlayers] = useState<PlayerSeason[]>([]);

  // Squad and lineup state
  const [selectedSquad, setSelectedSquad] = useState<PlayerSeason[]>([]);
  const [startingIds, setStartingIds] = useState<string[]>([]);
  const [benchIds, setBenchIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  // Filter state
  const [filterPos, setFilterPos] = useState<Position | "ALL">("ALL");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [playersRes, myTeam] = await Promise.all([
          client.getPlayers({ page: 1, limit: 250 }),
          client.getMyFantasyTeam(token || undefined),
        ]);

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
                .map((p) => p.playerSeasonId);

              setStartingIds(starters);
              setBenchIds(bench);
              setCaptainId(activeLineup.captainId || null);
              setViceCaptainId(activeLineup.viceCaptainId || null);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load squad data";
        Alert.alert("Error", msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, token, client]);

  const totalCostTenths = useMemo(
    () => selectedSquad.reduce((sum, p) => sum + p.pricePoints, 0),
    [selectedSquad],
  );

  const remainingBudget = (INITIAL_BUDGET_TENTHS - totalCostTenths) / 10;

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert("Error", "Please enter a team name");
      return;
    }
    try {
      setSaving(true);
      const newTeam = await client.createFantasyTeam(
        { name: teamName.trim() },
        token || undefined,
      );
      setTeam(newTeam);
      Alert.alert("Success", "Fantasy Team created!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation failed";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const addPlayer = (player: PlayerSeason) => {
    if (selectedSquad.some((p) => p.id === player.id)) return;
    if (selectedSquad.length >= 15) {
      Alert.alert("Squad Full", "Squad cannot exceed 15 players.");
      return;
    }
    const updated = [...selectedSquad, player];
    setSelectedSquad(updated);
    if (startingIds.length < 11) {
      setStartingIds([...startingIds, player.id]);
    } else {
      setBenchIds([...benchIds, player.id]);
    }
    if (!captainId) setCaptainId(player.id);
    else if (!viceCaptainId && player.id !== captainId) setViceCaptainId(player.id);
  };

  const removePlayer = (playerId: string) => {
    setSelectedSquad(selectedSquad.filter((p) => p.id !== playerId));
    setStartingIds(startingIds.filter((id) => id !== playerId));
    setBenchIds(benchIds.filter((id) => id !== playerId));
    if (captainId === playerId) setCaptainId(null);
    if (viceCaptainId === playerId) setViceCaptainId(null);
  };

  const handleSave = async () => {
    if (!team) return;
    try {
      setSaving(true);
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

      const squadVal = validateSquad(
        selectedSquad.map((p) => ({ playerSeasonId: p.id, pricePoints: p.pricePoints })),
        playerMap,
      );

      if (!squadVal.isValid) {
        Alert.alert("Validation Error", squadVal.issues[0]?.message || "Invalid squad");
        setSaving(false);
        return;
      }

      await client.updateSquad(team.id, { squadPlayerIds }, token || undefined);
      const updatedTeam = await client.updateLineup(
        team.id,
        {
          startingPlayerIds: startingIds,
          benchPlayerIds: benchIds,
          captainId: captainId!,
          viceCaptainId: viceCaptainId!,
        },
        token || undefined,
      );

      setTeam(updatedTeam);
      Alert.alert("Success", "Squad and lineup saved!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save squad";
      Alert.alert("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredPickerPlayers = useMemo(() => {
    return availablePlayers.filter((p) => {
      if (filterPos !== "ALL" && p.player?.position !== filterPos) return false;
      if (filterSearch) {
        const name = `${p.player?.firstName} ${p.player?.lastName}`.toLowerCase();
        if (!name.includes(filterSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [availablePlayers, filterPos, filterSearch]);

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F5132" />
        <Text style={styles.loadingText}>Loading Squad Manager...</Text>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Create Team" }} />
        <View style={styles.card}>
          <Text style={styles.title}>Create Fantasy Team</Text>
          <TextInput
            style={styles.input}
            placeholder="Team Name (e.g. Botola Stars)"
            placeholderTextColor="#94A3B8"
            value={teamName}
            onChangeText={setTeamName}
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateTeam} disabled={saving}>
            <Text style={styles.btnText}>{saving ? "Creating..." : "Create Team"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: team.name }} />

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View>
          <Text style={styles.statLabel}>REMAINING</Text>
          <Text style={[styles.statVal, { color: remainingBudget < 0 ? "#EF4444" : "#10B981" }]}>
            {remainingBudget.toFixed(1)} M
          </Text>
        </View>
        <View>
          <Text style={styles.statLabel}>SQUAD</Text>
          <Text style={styles.statVal}>{selectedSquad.length} / 15</Text>
        </View>
        <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnSaveText}>{saving ? "Saving..." : "Save Squad"}</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Squad List */}
      <Text style={styles.sectionHeader}>Selected Squad ({selectedSquad.length}/15)</Text>
      {selectedSquad.map((p) => {
        const isCapt = p.id === captainId;
        const isVCapt = p.id === viceCaptainId;
        return (
          <View key={p.id} style={styles.squadRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName}>
                {p.player?.firstName} {p.player?.lastName}
                {isCapt && " (C)"}
                {isVCapt && " (V)"}
              </Text>
              <Text style={styles.playerMeta}>
                {p.player?.position} • {p.club?.shortName} • {(p.pricePoints / 10).toFixed(1)} M
              </Text>
            </View>
            <TouchableOpacity onPress={() => removePlayer(p.id)} style={styles.btnRemove}>
              <Text style={styles.btnRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Available Player Catalog */}
      <Text style={styles.sectionHeader}>Player Catalog</Text>

      {/* Filter Pills */}
      <View style={styles.pillRow}>
        {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((pos) => (
          <TouchableOpacity
            key={pos}
            style={[styles.pill, filterPos === pos && styles.pillActive]}
            onPress={() => setFilterPos(pos)}
          >
            <Text style={[styles.pillText, filterPos === pos && styles.pillTextActive]}>{pos}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Filter by name..."
        placeholderTextColor="#94A3B8"
        value={filterSearch}
        onChangeText={setFilterSearch}
      />

      {filteredPickerPlayers.slice(0, 30).map((p) => {
        const isSelected = selectedSquad.some((sp) => sp.id === p.id);
        return (
          <View key={p.id} style={styles.catalogRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName}>
                {p.player?.firstName} {p.player?.lastName}
              </Text>
              <Text style={styles.playerMeta}>
                {p.player?.position} • {p.club?.shortName}
              </Text>
            </View>
            <Text style={styles.priceText}>{(p.pricePoints / 10).toFixed(1)} M</Text>
            <TouchableOpacity
              style={[styles.btnAdd, isSelected && styles.btnAddDisabled]}
              onPress={() => addPlayer(p)}
              disabled={isSelected}
            >
              <Text style={styles.btnAddText}>{isSelected ? "Added" : "+ Add"}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingText: {
    color: "#F8FAFC",
    marginTop: 12,
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: "#0F5132",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "bold",
  },
  statVal: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
  },
  btnSave: {
    backgroundColor: "#0F5132",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnSaveText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionHeader: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 12,
  },
  squadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    color: "#F8FAFC",
    fontWeight: "bold",
    fontSize: 14,
  },
  playerMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  btnRemove: {
    backgroundColor: "#EF4444",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnRemoveText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    backgroundColor: "#1E293B",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: "#0F5132",
  },
  pillText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "bold",
  },
  pillTextActive: {
    color: "#FFF",
  },
  catalogRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  priceText: {
    color: "#10B981",
    fontWeight: "bold",
    marginRight: 12,
  },
  btnAdd: {
    backgroundColor: "#0F5132",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnAddDisabled: {
    backgroundColor: "#475569",
  },
  btnAddText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 12,
  },
});
