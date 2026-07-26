export type SupportedLocale = 'en' | 'fr' | 'ar';

export const dictionaries = {
  en: {
    welcomeTitle: 'Welcome to BotolaHub',
    welcomeSubtitle: "Morocco's Botola Pro Inwi Weekly Match Prediction Game",
    selectLanguage: 'Select Language',
    status: 'System Status',
    environment: 'Environment',
    apiVersion: 'API Version',
    databaseStatus: 'Database Status',
    redisStatus: 'Redis Status',
    predictionLockNotice: 'Predictions lock 1 hour before earliest match kickoff.',
    notFantasyNotice: 'BotolaHub is a match prediction game, not fantasy football.',
  },
  fr: {
    welcomeTitle: 'Bienvenue sur BotolaHub',
    welcomeSubtitle: 'Le jeu de prédiction hebdomadaire de la Botola Pro Inwi au Maroc',
    selectLanguage: 'Choisir la langue',
    status: 'État du système',
    environment: 'Environnement',
    apiVersion: 'Version API',
    databaseStatus: 'État de la base de données',
    redisStatus: 'État de Redis',
    predictionLockNotice: "Les prédictions ferment 1 heure avant le premier coup d'envoi.",
    notFantasyNotice: 'BotolaHub est un jeu de prédiction de matchs, pas de fantasy football.',
  },
  ar: {
    welcomeTitle: 'مرحباً بكم في البطولة هاب',
    welcomeSubtitle: 'لعبة توقعات البطولة الاحترافية إنوي المغربية الأسبوعية',
    selectLanguage: 'اختر اللغة',
    status: 'حالة النظام',
    environment: 'البيئة',
    apiVersion: 'إصدار واجهة البرمجة',
    databaseStatus: 'حالة قاعدة البيانات',
    redisStatus: 'حالة ريديس',
    predictionLockNotice: 'تغلق التوقعات قبل ساعة واحدة من انطلاق أول مباراة.',
    notFantasyNotice: 'البطولة هاب هي لعبة توقع نتايج المباريات وليست فانتازي.',
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)['en'];

export function getDirection(locale: SupportedLocale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function t(locale: SupportedLocale, key: TranslationKey): string {
  const dict = dictionaries[locale] || dictionaries.en;
  return dict[key] || dictionaries.en[key] || key;
}
