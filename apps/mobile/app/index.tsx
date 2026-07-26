import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SupportedLocale, t, getDirection } from '@botolahub/localization';

export default function MobileHomeScreen() {
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const dir = getDirection(locale);
  const isRtl = dir === 'rtl';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          <View style={[styles.logoGroup, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <View style={styles.logoDot} />
            <Text style={styles.appTitle}>BotolaHub</Text>
          </View>

          <View style={[styles.langContainer, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            {(['en', 'fr', 'ar'] as SupportedLocale[]).map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.langBtn, locale === loc && styles.langBtnActive]}
                onPress={() => setLocale(loc)}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${loc}`}
              >
                <Text style={[styles.langText, locale === loc && styles.langTextActive]}>
                  {loc.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.card}>
          <View style={styles.badgeGoldContainer}>
            <Text style={styles.badgeGoldText}>Botola Pro Inwi</Text>
          </View>

          <Text style={[styles.heroTitle, { textAlign: isRtl ? 'right' : 'left' }]}>
            {t(locale, 'welcomeTitle')}
          </Text>

          <Text style={[styles.heroSubtitle, { textAlign: isRtl ? 'right' : 'left' }]}>
            {t(locale, 'welcomeSubtitle')}
          </Text>

          <View style={styles.noticeContainer}>
            <View style={styles.badgeGreenContainer}>
              <Text style={styles.badgeGreenText}>{t(locale, 'predictionLockNotice')}</Text>
            </View>
            <View style={styles.badgeRedContainer}>
              <Text style={styles.badgeRedText}>{t(locale, 'notFantasyNotice')}</Text>
            </View>
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRtl ? 'right' : 'left' }]}>
            1X2 Match Predictions
          </Text>
          <Text style={[styles.cardText, { textAlign: isRtl ? 'right' : 'left' }]}>
            Predict Home Win (1), Draw (X), or Away Win (2) for every scheduled Botola Pro fixture.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRtl ? 'right' : 'left' }]}>
            Favorite Club Multiplier
          </Text>
          <Text style={[styles.cardText, { textAlign: isRtl ? 'right' : 'left' }]}>
            Earn +4/-2 points on your favorite club&apos;s matches (+3/-1 on standard fixtures).
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRtl ? 'right' : 'left' }]}>
            Global & Private Leagues
          </Text>
          <Text style={[styles.cardText, { textAlign: isRtl ? 'right' : 'left' }]}>
            Compete on weekly & season-long global leaderboards or create private mini-leagues.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGroup: {
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#008751',
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  langContainer: {
    gap: 6,
  },
  langBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232732',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  langBtnActive: {
    backgroundColor: '#008751',
    borderColor: '#008751',
  },
  langText: {
    color: '#8A94A6',
    fontSize: 12,
    fontWeight: '500',
  },
  langTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#161920',
    borderWidth: 1,
    borderColor: '#232732',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  badgeGoldContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeGoldText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#8A94A6',
    fontSize: 14,
    marginBottom: 16,
  },
  noticeContainer: {
    gap: 8,
  },
  badgeGreenContainer: {
    backgroundColor: 'rgba(0, 135, 81, 0.2)',
    borderWidth: 1,
    borderColor: '#008751',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeGreenText: {
    color: '#00E687',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRedContainer: {
    backgroundColor: 'rgba(192, 57, 43, 0.2)',
    borderWidth: 1,
    borderColor: '#C0392B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeRedText: {
    color: '#FF6B5B',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardText: {
    color: '#8A94A6',
    fontSize: 13,
    lineHeight: 18,
  },
});
