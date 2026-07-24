import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function ProfileScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#FFF" }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "User Profile" }} />
      <View style={styles.card}>
        <Text style={styles.title}>User Profile</Text>

        <Text style={styles.infoLabel}>Name:</Text>
        <Text style={styles.infoValue}>{user.displayName}</Text>

        <Text style={styles.infoLabel}>Email:</Text>
        <Text style={styles.infoValue}>{user.email}</Text>

        <Text style={styles.infoLabel}>Role:</Text>
        <Text style={styles.infoValue}>{user.role}</Text>

        <TouchableOpacity
          style={styles.squadBtn}
          onPress={() => router.push("/squad")}
        >
          <Text style={styles.squadBtnText}>Manage Squad</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            router.replace("/");
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  infoLabel: { color: "#94A3B8", fontSize: 12, marginTop: 10 },
  infoValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  squadBtn: {
    backgroundColor: "#0F5132",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  squadBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  logoutBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  logoutText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});
