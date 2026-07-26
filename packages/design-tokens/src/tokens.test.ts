import { describe, it, expect } from 'vitest';
import { colors, spacing } from './tokens.js';

describe('Design Tokens', () => {
  it('contains original BotolaHub color definitions', () => {
    expect(colors.bgApp).toBe('#0D0F12');
    expect(colors.cardCharcoal).toBe('#161920');
    expect(colors.moroccanGreen).toBe('#008751');
    expect(colors.warmGold).toBe('#D4AF37');
    expect(colors.restrainedRed).toBe('#C0392B');
  });

  it('enforces accessible minimum touch target size of 44px', () => {
    expect(spacing.touchTargetMin).toBe('44px');
  });
});
