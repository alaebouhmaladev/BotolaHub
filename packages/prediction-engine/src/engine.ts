export const PREDICTION_ENGINE_VERSION = '1.0.0-foundation';

export interface PredictionEngineMetadata {
  gameType: '1X2';
  season: string;
  version: string;
}

export function getPredictionEngineMetadata(): PredictionEngineMetadata {
  return {
    gameType: '1X2',
    season: '2026-2027',
    version: PREDICTION_ENGINE_VERSION,
  };
}
