import { describe, it, expect } from 'vitest';
import { getDirection, t } from './i18n.js';

describe('Localization & RTL Helper', () => {
  it('returns rtl direction for Arabic locale', () => {
    expect(getDirection('ar')).toBe('rtl');
  });

  it('returns ltr direction for English and French locales', () => {
    expect(getDirection('en')).toBe('ltr');
    expect(getDirection('fr')).toBe('ltr');
  });

  it('translates keys correctly in supported languages', () => {
    expect(t('en', 'welcomeTitle')).toBe('Welcome to BotolaHub');
    expect(t('fr', 'welcomeTitle')).toBe('Bienvenue sur BotolaHub');
    expect(t('ar', 'welcomeTitle')).toBe('مرحباً بكم في البطولة هاب');
  });

  it('falls back gracefully to English when key is missing or invalid locale provided', () => {
    expect(t('invalid' as any, 'welcomeTitle')).toBe('Welcome to BotolaHub');
  });
});
