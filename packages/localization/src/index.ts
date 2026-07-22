export type SupportedLanguage = "ar" | "fr" | "en";

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  welcome: string;
  languageSelect: string;
  status: {
    online: string;
    offline: string;
    healthy: string;
  };
  navigation: {
    home: string;
    squad: string;
    transfers: string;
    leagues: string;
    admin: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  ar: {
    appName: "بطولة هاب",
    tagline: "فانتازي كرة القدم للبطولة الاحترافية المغربية",
    welcome: "مرحباً بكم في بطولة هاب! أنشئ فريق الأحلام ونافس أصدقائك.",
    languageSelect: "اختر اللغة",
    status: {
      online: "متصل",
      offline: "غير متصل",
      healthy: "سليم",
    },
    navigation: {
      home: "الرئيسية",
      squad: "التشكيلة",
      transfers: "الانتقالات",
      leagues: "الدوريات",
      admin: "الإدارة",
    },
  },
  fr: {
    appName: "BotolaHub",
    tagline: "Fantasy Football pour la Botola Pro du Maroc",
    welcome:
      "Bienvenue sur BotolaHub ! Créez votre équipe de rêve et affrontez vos amis.",
    languageSelect: "Choisir la langue",
    status: {
      online: "En ligne",
      offline: "Hors ligne",
      healthy: "Opérationnel",
    },
    navigation: {
      home: "Accueil",
      squad: "Équipe",
      transfers: "Transferts",
      leagues: "Ligues",
      admin: "Admin",
    },
  },
  en: {
    appName: "BotolaHub",
    tagline: "Fantasy football for Morocco's Botola Pro",
    welcome:
      "Welcome to BotolaHub! Build your dream squad and compete with friends.",
    languageSelect: "Select Language",
    status: {
      online: "Online",
      offline: "Offline",
      healthy: "Healthy",
    },
    navigation: {
      home: "Home",
      squad: "Squad",
      transfers: "Transfers",
      leagues: "Leagues",
      admin: "Admin",
    },
  },
};

export function getTranslation(
  lang: SupportedLanguage = "en",
): TranslationDictionary {
  return translations[lang] || translations.en;
}

export function getLayoutDirection(lang: SupportedLanguage): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}
