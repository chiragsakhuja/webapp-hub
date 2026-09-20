import rawDataset from "@/data/emerald.json";
import {
  applyEvYield,
  calculateStats,
  experienceForLevel,
  experienceYield,
  levelFromExperience,
} from "./mechanics";
import type {
  EmeraldDataset,
  EncounterBreakdown,
  EncounterTable,
  LocationOption,
  LocationScheduleSegment,
  Percentiles,
  PokemonSpecies,
  SimulationInput,
  SimulationSummary,
  StatBlock,
  StatKey,
} from "./types";
import { STAT_KEYS } from "./types";

export const emeraldData = rawDataset as EmeraldDataset;
export const speciesById = new Map(
  emeraldData.species.map((species) => [species.id, species]),
);

interface TableChoice {
  table: EncounterTable;
  usedFallback: boolean;
  penalty: number;
  expectedExperience: number;
}

interface WeightedTableChoice extends TableChoice {
  selectionWeight: number;
}

interface TrialResult {
  stats: StatBlock;
  evs: StatBlock;
  battles: number;
  endingExperience: number;
  speciesCounts: Map<string, number>;
  locationCounts: Map<string, number>;
}

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const levelPenalty = (gap: number): number => {
  if (gap >= 2 && gap <= 5) return 0;
  return gap < 2 ? 2 - gap : gap - 5;
};

const evaluateTable = (
  table: EncounterTable,
  playerLevel: number,
): Omit<TableChoice, "table" | "usedFallback"> => {
  let penalty = 0;
  let expectedExperience = 0;
  let totalWeight = 0;

  for (const slot of table.slots) {
    const species = speciesById.get(slot.speciesId);
    if (!species) continue;
    const levels = slot.maxLevel - slot.minLevel + 1;
    const levelWeight = slot.weight / levels;
    for (let level = slot.minLevel; level <= slot.maxLevel; level++) {
      penalty += levelPenalty(playerLevel - level) * levelWeight;
      expectedExperience += experienceYield(species, level) * levelWeight;
      totalWeight += levelWeight;
    }
  }

  return {
    penalty: penalty / totalWeight,
    expectedExperience: expectedExperience / totalWeight,
  };
};

const rankEncounterTables = (playerLevel: number): TableChoice[] => {
  const lowerTables = emeraldData.encounters.filter(
    (table) =>
      Math.max(...table.slots.map((slot) => slot.maxLevel)) < playerLevel,
  );
  const usedFallback = lowerTables.length === 0;
  const candidates = usedFallback ? emeraldData.encounters : lowerTables;

  return candidates
    .map((table) => ({
      table,
      usedFallback,
      ...evaluateTable(table, playerLevel),
    }))
    .sort(
      (a, b) =>
        a.penalty - b.penalty ||
        b.expectedExperience - a.expectedExperience ||
        b.table.encounterRate - a.table.encounterRate ||
        a.table.id.localeCompare(b.table.id),
    );
};

export function chooseEncounterTable(playerLevel: number): TableChoice {
  return rankEncounterTables(playerLevel)[0];
}

const speciesMixSignature = (table: EncounterTable): string =>
  [...new Set(table.slots.map((slot) => slot.speciesId))].sort().join(":");

export function getEncounterTablePool(
  playerLevel: number,
): WeightedTableChoice[] {
  const ranked = rankEncounterTables(playerLevel);
  const distinctChoices: TableChoice[] = [];
  const seenSpeciesMixes = new Set<string>();

  for (const choice of ranked) {
    const signature = speciesMixSignature(choice.table);
    if (seenSpeciesMixes.has(signature)) continue;
    distinctChoices.push(choice);
    seenSpeciesMixes.add(signature);
    if (distinctChoices.length === 6) break;
  }

  const bestPenalty = distinctChoices[0].penalty;
  return distinctChoices.map((choice) => ({
    ...choice,
    selectionWeight: Math.exp(-(choice.penalty - bestPenalty) / 4),
  }));
}

const sampleEncounterTable = (
  playerLevel: number,
  random: () => number,
): EncounterTable => {
  const pool = getEncounterTablePool(playerLevel);
  const totalWeight = pool.reduce(
    (total, choice) => total + choice.selectionWeight,
    0,
  );
  const roll = random() * totalWeight;
  let cumulative = 0;

  for (const choice of pool) {
    cumulative += choice.selectionWeight;
    if (roll < cumulative) return choice.table;
  }

  return pool[pool.length - 1].table;
};

const sampleEncounter = (
  table: EncounterTable,
  random: () => number,
): { species: PokemonSpecies; level: number } => {
  const totalWeight = table.slots.reduce(
    (total, slot) => total + slot.weight,
    0,
  );
  const roll = random() * totalWeight;
  let cumulative = 0;
  let chosenSlot = table.slots[table.slots.length - 1];

  for (const slot of table.slots) {
    cumulative += slot.weight;
    if (roll < cumulative) {
      chosenSlot = slot;
      break;
    }
  }

  const level =
    chosenSlot.minLevel +
    Math.floor(random() * (chosenSlot.maxLevel - chosenSlot.minLevel + 1));
  const species = speciesById.get(chosenSlot.speciesId);
  if (!species) throw new Error(`Unknown species ${chosenSlot.speciesId}`);
  return { species, level };
};

const increment = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

function runTrial(input: SimulationInput, seed: string): TrialResult {
  const playerSpecies = speciesById.get(input.speciesId);
  if (!playerSpecies) throw new Error(`Unknown species ${input.speciesId}`);

  const random = seededRandom(seed);
  const targetExperience = experienceForLevel(
    playerSpecies.growthRate,
    input.targetLevel,
  );
  let experience = input.currentExperience;
  let evs = { ...input.evs };
  let battles = 0;
  let selectedLevel = -1;
  let selectedTable: EncounterTable | null = null;
  const speciesCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();

  while (experience < targetExperience) {
    const level = levelFromExperience(playerSpecies.growthRate, experience);
    if (level !== selectedLevel) {
      selectedLevel = level;
      selectedTable = sampleEncounterTable(level, random);
    }

    if (!selectedTable)
      throw new Error(`No encounter table available for level ${level}.`);
    const activeTable = selectedTable;
    const opponent = sampleEncounter(activeTable, random);
    experience += experienceYield(opponent.species, opponent.level);
    if (input.targetLevel === 100) {
      experience = Math.min(
        experience,
        experienceForLevel(playerSpecies.growthRate, 100),
      );
    }
    evs = applyEvYield(evs, opponent.species.evYield);
    battles++;
    increment(speciesCounts, opponent.species.name);
    increment(
      locationCounts,
      `${activeTable.location} (${activeTable.method === "land" ? "Land/Cave" : "Surf"})`,
    );

    if (battles > 100_000)
      throw new Error("Simulation exceeded the battle safety limit.");
  }

  return {
    stats: calculateStats(
      playerSpecies,
      input.targetLevel,
      input.ivs,
      evs,
      input.nature,
    ),
    evs,
    battles,
    endingExperience: experience,
    speciesCounts,
    locationCounts,
  };
}

export const percentile = (values: number[], probability: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(probability * sorted.length) - 1);
  return sorted[index];
};

const summarizeValues = (values: number[]): Percentiles => ({
  p10: percentile(values, 0.1),
  p50: percentile(values, 0.5),
  p90: percentile(values, 0.9),
});

const summarizeStats = (
  trials: TrialResult[],
  field: "stats" | "evs",
): Record<StatKey, Percentiles> =>
  Object.fromEntries(
    STAT_KEYS.map((key) => [
      key,
      summarizeValues(trials.map((trial) => trial[field][key])),
    ]),
  ) as Record<StatKey, Percentiles>;

const summarizeCounts = (
  counts: Map<string, number>,
  total: number,
): EncounterBreakdown[] =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([label, count]) => ({
      label,
      count,
      percentage: (count / total) * 100,
    }));

const buildLocationSchedule = (
  input: SimulationInput,
): LocationScheduleSegment[] => {
  const schedule: LocationScheduleSegment[] = [];
  for (let level = input.currentLevel; level < input.targetLevel; level++) {
    const choices = getEncounterTablePool(level);
    const totalWeight = choices.reduce(
      (total, choice) => total + choice.selectionWeight,
      0,
    );
    const options: LocationOption[] = choices.map((choice) => ({
      tableId: choice.table.id,
      location: choice.table.location,
      method: choice.table.method,
      minOpponentLevel: Math.min(
        ...choice.table.slots.map((slot) => slot.minLevel),
      ),
      maxOpponentLevel: Math.max(
        ...choice.table.slots.map((slot) => slot.maxLevel),
      ),
      encounterRate: choice.table.encounterRate,
      selectionPercentage: (choice.selectionWeight / totalWeight) * 100,
    }));
    const usedFallback = choices.some((choice) => choice.usedFallback);
    const optionKey = options
      .map(
        (option) =>
          `${option.tableId}:${option.selectionPercentage.toFixed(4)}`,
      )
      .join("|");
    const previous = schedule[schedule.length - 1];
    if (
      previous?.options
        .map(
          (option) =>
            `${option.tableId}:${option.selectionPercentage.toFixed(4)}`,
        )
        .join("|") === optionKey &&
      previous.usedFallback === usedFallback
    ) {
      previous.toLevel = level;
      continue;
    }
    schedule.push({
      fromLevel: level,
      toLevel: level,
      options,
      usedFallback,
    });
  }
  return schedule;
};

export function generateSeed(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return [...values]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("-");
}

export function simulateGrinding(
  input: SimulationInput,
  seed: string,
  trialCount = 2_000,
): SimulationSummary {
  const trials: TrialResult[] = [];
  const speciesCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  let totalBattles = 0;

  for (let index = 0; index < trialCount; index++) {
    const trial = runTrial(input, `${seed}:${index}`);
    trials.push(trial);
    totalBattles += trial.battles;
    for (const [key, count] of trial.speciesCounts)
      speciesCounts.set(key, (speciesCounts.get(key) ?? 0) + count);
    for (const [key, count] of trial.locationCounts)
      locationCounts.set(key, (locationCounts.get(key) ?? 0) + count);
  }

  const locationSchedule = buildLocationSchedule(input);
  const warnings = locationSchedule.some((segment) => segment.usedFallback)
    ? [
        "At least one level had no encounter table entirely below the player; the closest available table was used.",
      ]
    : [];

  return {
    seed,
    trials: trialCount,
    statPercentiles: summarizeStats(trials, "stats"),
    evPercentiles: summarizeStats(trials, "evs"),
    battles: summarizeValues(trials.map((trial) => trial.battles)),
    endingExperience: summarizeValues(
      trials.map((trial) => trial.endingExperience),
    ),
    locationSchedule,
    topSpecies: summarizeCounts(speciesCounts, totalBattles),
    topLocations: summarizeCounts(locationCounts, totalBattles),
    warnings,
  };
}
