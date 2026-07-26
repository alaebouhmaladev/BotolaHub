import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { BotolaHubApiClient } from "@botolahub/api-client";
import { Fixture } from "@botolahub/contracts";

export default function FixturesScreen(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const client = new BotolaHubApiClient({ baseUrl: "" });
      client
        .getFixtures()
        .then((data) => {
          setFixtures(data);
          setLoading(false);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to fetch fixtures");
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Botola Pro Fixtures</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={fixtures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(
                  `/fixtures/${item.id}` as unknown as `/fixtures/${string}`,
                )
              }
            >
              <Text style={styles.teamName}>
                {item.homeClub?.name || "Home"}
              </Text>
              <View style={styles.scoreContainer}>
                {item.status === "FINISHED" || item.status === "LIVE" ? (
                  <Text style={styles.scoreText}>
                    {item.homeScore ?? 0} - {item.awayScore ?? 0}
                  </Text>
                ) : (
                  <Text style={styles.timeText}>
                    {new Date(item.kickoffUtc).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
                <Text
                  style={[
                    styles.statusBadge,
                    item.status === "LIVE" && { backgroundColor: "#EF4444" },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
              <Text style={styles.teamName}>
                {item.awayClub?.name || "Away"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
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
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  scoreContainer: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
  },
  timeText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  errorBanner: {
    padding: 12,
    backgroundColor: "#EF444422",
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: "#FCA5A5",
  },
});
