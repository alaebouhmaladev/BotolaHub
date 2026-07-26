import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { BotolaHubApiClient } from "@botolahub/api-client";
import {
  FantasyTeam,
  PlayerSeason,
  TransferPreviewResult,
} from "@botolahub/contracts";

export default function TransfersScreen(): JSX.Element {
  const { user } = useAuth();
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [catalogPlayers, setCatalogPlayers] = useState<PlayerSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOutId, setSelectedOutId] = useState<string | null>(null);
  const [selectedInId, setSelectedInId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransferPreviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      Promise.all([client.getMyFantasyTeam(), client.getPlayers()])
        .then(([teamData, playersData]) => {
          setTeam(teamData);
          setCatalogPlayers(playersData.items);
          setLoading(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load squad or market");
          setLoading(false);
        });
    }
  }, [user]);

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
        .then((resData) => setPreview(resData))
        .catch((err: Error) => setError(err.message || "Preview failed"));
    } else {
      setPreview(null);
    }
  }, [selectedOutId, selectedInId, user]);

  const handleConfirm = async () => {
    if (!selectedOutId || !selectedInId || !user) return;
    setSubmitting(true);
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
        Alert.alert("Success", "Transfer confirmed successfully!");
        setSelectedOutId(null);
        setSelectedInId(null);
        setPreview(null);
        const refreshed = await client.getMyFantasyTeam();
        setTeam(refreshed);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Error", msg || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!team)
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No team found</Text>
      </View>
    );

  const currentSquadIds = new Set(
    team.squadMembers?.map((m) => m.playerSeasonId) || [],
  );
  const marketPlayers = catalogPlayers.filter(
    (p) => !currentSquadIds.has(p.id),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transfer Hub</Text>
        <Text style={styles.budget}>
          Budget: {((team.budgetPoints || 0) / 10).toFixed(1)}M
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Outgoing Section */}
        <Text style={styles.sectionTitle}>1. Outgoing Player</Text>
        <View style={styles.listContainer}>
          {team.squadMembers?.map((m) => {
            const isSel = selectedOutId === m.playerSeasonId;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.itemCard, isSel && styles.itemSelectedOut]}
                onPress={() =>
                  setSelectedOutId(isSel ? null : m.playerSeasonId)
                }
              >
                <Text style={styles.playerName}>
                  {m.playerSeason?.player
                    ? `${m.playerSeason.player.firstName} ${m.playerSeason.player.lastName}`
                    : "Player"}
                </Text>
                <Text style={styles.priceText}>
                  {((m.playerSeason?.pricePoints || 0) / 10).toFixed(1)}M
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Incoming Section */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          2. Incoming Player
        </Text>
        <View style={styles.listContainer}>
          {marketPlayers.slice(0, 15).map((p) => {
            const isSel = selectedInId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.itemCard, isSel && styles.itemSelectedIn]}
                onPress={() => setSelectedInId(isSel ? null : p.id)}
              >
                <Text style={styles.playerName}>
                  {p.player
                    ? `${p.player.firstName} ${p.player.lastName}`
                    : "Player"}
                </Text>
                <Text style={styles.priceText}>
                  {((p.pricePoints || 0) / 10).toFixed(1)}M
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Confirmation Bar */}
      {selectedOutId && selectedInId ? (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>
            Cost:{" "}
            {preview?.deductionPoints
              ? `-${preview.deductionPoints} pts`
              : "FREE"}
          </Text>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!preview?.isValid || submitting) && styles.btnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!preview?.isValid || submitting}
          >
            <Text style={styles.confirmBtnText}>
              {submitting ? "Saving..." : "Confirm Transfer"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },
  budget: { fontSize: 14, fontWeight: "bold", color: "#10B981" },
  text: { color: "#FFF" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 10,
  },
  listContainer: { gap: 6 },
  itemCard: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemSelectedOut: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  itemSelectedIn: {
    backgroundColor: "rgba(16,185,129,0.2)",
    borderColor: "#10B981",
    borderWidth: 1,
  },
  playerName: { color: "#FFF", fontWeight: "bold" },
  priceText: { color: "#10B981", fontWeight: "bold" },
  confirmBar: {
    padding: 16,
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmText: { color: "#FFF", fontWeight: "bold" },
  confirmBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  btnDisabled: { backgroundColor: "#4B5563" },
  confirmBtnText: { color: "#FFF", fontWeight: "bold" },
  errorBanner: {
    padding: 12,
    backgroundColor: "#EF444422",
    margin: 16,
    borderRadius: 8,
  },
  errorText: { color: "#FCA5A5" },
});
