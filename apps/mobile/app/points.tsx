import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { BotolaHubApiClient } from "@botolahub/api-client";
import { FantasyTeam, TeamGameweekScore } from "@botolahub/contracts";

export default function PointsScreen(): JSX.Element {
  const { user } = useAuth();
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [teamScore, setTeamScore] = useState<TeamGameweekScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      Promise.all([client.getMyFantasyTeam(), client.getGameweeks()])
        .then(([teamData, gwData]) => {
          setTeam(teamData);
          if (teamData && gwData.length > 0) {
            client
              .getTeamGameweekScore(teamData.id, gwData[0].id)
              .then((score) => setTeamScore(score))
              .catch(() => setTeamScore(null));
          }
          setLoading(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load points");
          setLoading(false);
        });
    }
  }, [user]);

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
        <Text style={{ color: "#FFF" }}>No team found</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gameweek Points</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Score Header Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.scoreValue}>
            {teamScore ? teamScore.points : 0} PTS
          </Text>
          {teamScore ? (
            <View style={styles.scoreMeta}>
              <Text style={styles.metaText}>
                Captain Bonus: +{teamScore.captainBonus} pts
              </Text>
              <Text style={styles.metaText}>
                Transfer Cost: -{teamScore.transferCost} pts
              </Text>
            </View>
          ) : null}
        </View>

        {/* Squad Breakdown */}
        <Text style={styles.sectionTitle}>Lineup Performance</Text>
        <View style={{ gap: 8 }}>
          {team.squadMembers?.map((m) => {
            const ps = m.playerSeason;
            return (
              <View key={m.id} style={styles.playerCard}>
                <Text style={styles.posBadge}>{ps?.player?.position}</Text>
                <Text style={styles.nameText}>
                  {ps?.player
                    ? `${ps.player.firstName} ${ps.player.lastName}`
                    : "Player"}
                </Text>
                <Text style={styles.ptsText}>Active</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  title: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },
  scoreCard: {
    backgroundColor: "#1E293B",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  teamName: { fontSize: 14, color: "#94A3B8", marginBottom: 8 },
  scoreValue: { fontSize: 40, fontWeight: "bold", color: "#10B981" },
  scoreMeta: { flexDirection: "row", gap: 16, marginTop: 12 },
  metaText: { fontSize: 12, color: "#94A3B8" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 12,
  },
  playerCard: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  posBadge: { color: "#94A3B8", fontWeight: "bold", width: 40 },
  nameText: { flex: 1, color: "#FFF", fontWeight: "bold" },
  ptsText: { color: "#10B981", fontWeight: "bold" },
  errorBanner: {
    padding: 12,
    backgroundColor: "#EF444422",
    margin: 16,
    borderRadius: 8,
  },
  errorText: { color: "#FCA5A5" },
});
