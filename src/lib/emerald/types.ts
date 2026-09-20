export const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "spAttack",
  "spDefense",
  "speed",
] as const;
export const EV_APPLICATION_ORDER = [
  "hp",
  "attack",
  "defense",
  "speed",
  "spAttack",
  "spDefense",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type StatBlock = Record<StatKey, number>;
export type GrowthRate =
  | "medium-fast"
  | "erratic"
  | "fluctuating"
  | "medium-slow"
  | "fast"
  | "slow";
export type EncounterMethod = "land" | "surf";
export type NatureName =
  | "Hardy"
  | "Lonely"
  | "Brave"
  | "Adamant"
  | "Naughty"
  | "Bold"
  | "Docile"
  | "Relaxed"
  | "Impish"
  | "Lax"
  | "Timid"
  | "Hasty"
  | "Serious"
  | "Jolly"
  | "Naive"
  | "Modest"
  | "Mild"
  | "Quiet"
  | "Bashful"
  | "Rash"
  | "Calm"
  | "Gentle"
  | "Sassy"
  | "Careful"
  | "Quirky";

export interface PokemonSpecies {
  id: string;
  nationalDex: number;
  name: string;
  baseStats: StatBlock;
  baseExperience: number;
  evYield: StatBlock;
  growthRate: GrowthRate;
}

export interface EncounterSlot {
  speciesId: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

export interface EncounterTable {
  id: string;
  map: string;
  location: string;
  method: EncounterMethod;
  encounterRate: number;
  slots: EncounterSlot[];
}

export interface EmeraldDataset {
  source: {
    repository: string;
    commit: string;
    romSha1: string;
  };
  species: PokemonSpecies[];
  encounters: EncounterTable[];
}

export interface SimulationInput {
  speciesId: string;
  nature: NatureName;
  currentLevel: number;
  currentExperience: number;
  targetLevel: number;
  currentStats: StatBlock;
  ivs: StatBlock;
  evs: StatBlock;
}

export interface Percentiles {
  p10: number;
  p50: number;
  p90: number;
}

export interface LocationOption {
  tableId: string;
  location: string;
  method: EncounterMethod;
  minOpponentLevel: number;
  maxOpponentLevel: number;
  encounterRate: number;
  selectionPercentage: number;
}

export interface LocationScheduleSegment {
  fromLevel: number;
  toLevel: number;
  options: LocationOption[];
  usedFallback: boolean;
}

export interface EncounterBreakdown {
  label: string;
  count: number;
  percentage: number;
}

export interface SimulationSummary {
  seed: string;
  trials: number;
  statPercentiles: Record<StatKey, Percentiles>;
  evPercentiles: Record<StatKey, Percentiles>;
  battles: Percentiles;
  endingExperience: Percentiles;
  locationSchedule: LocationScheduleSegment[];
  topSpecies: EncounterBreakdown[];
  topLocations: EncounterBreakdown[];
  warnings: string[];
}

export interface ValidationResult {
  errors: string[];
  statMismatches: StatKey[];
  expectedCurrentStats: StatBlock | null;
}
