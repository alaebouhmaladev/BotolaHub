import { getTranslation, SupportedLanguage } from "@botolahub/localization";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const [lang, setLang] = useState<SupportedLanguage>("en");
  const t = getTranslation(lang);
  const isRtl = lang === "ar";

  return (
    <View style={[styles.container, { direction: isRtl ? "rtl" : "ltr" }]}>
      <Stack.Screen options={{ title: t.appName }} />

      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>BH</Text>
        </View>

        <Text style={styles.tagline}>{t.tagline}</Text>
        <Text style={styles.welcome}>{t.welcome}</Text>

        <Text style={styles.langHeader}>{t.languageSelect}</Text>
        <View style={styles.langContainer}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "ar" && styles.langBtnActive]}
            onPress={() => setLang("ar")}
          >
            <Text
              style={[
                styles.langBtnText,
                lang === "ar" && styles.langBtnTextActive,
              ]}
            >
              العربية
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, lang === "fr" && styles.langBtnActive]}
            onPress={() => setLang("fr")}
          >
            <Text
              style={[
                styles.langBtnText,
                lang === "fr" && styles.langBtnTextActive,
              ]}
            >
              Français
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => setLang("en")}
          >
            <Text
              style={[
                styles.langBtnText,
                lang === "en" && styles.langBtnTextActive,
              ]}
            >
              English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Language: {lang.toUpperCase()} | Direction: {isRtl ? "RTL" : "LTR"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "#0F5132",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "bold",
  },
  tagline: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  welcome: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  langHeader: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 12,
  },
  langContainer: {
    flexDirection: "row",
    gap: 8,
  },
  langBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  langBtnActive: {
    backgroundColor: "#0F5132",
    borderColor: "#D4AF37",
  },
  langBtnText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  langBtnTextActive: {
    color: "#FFFFFF",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
  },
});
