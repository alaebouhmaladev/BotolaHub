import { describe, it, expect } from 'vitest';
import { getPredictionEngineMetadata, PREDICTION_ENGINE_VERSION } from './engine.js';

describe('Prediction Engine Foundation', () => {
  it('returns valid metadata for 1X2 game mode foundation', () => {
    const meta = getPredictionEngineMetadata();
    expect(meta.gameType).toBe('1X2');
    expect(meta.version).toBe(PREDICTION_ENGINE_VERSION);
  });
});
