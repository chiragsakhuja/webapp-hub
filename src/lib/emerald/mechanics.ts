import type {
  GrowthRate,
  NatureName,
  PokemonSpecies,
  SimulationInput,
  StatBlock,
  StatKey,
  ValidationResult,
} from "./types";
import { EV_APPLICATION_ORDER, STAT_KEYS } from "./types";

interface NatureDefinition {
  name: NatureName;
  increased?: Exclude<StatKey, "hp">;
  decreased?: Exclude<StatKey, "hp">;
}

export const NATURES: NatureDefinition[] = [
  { name: "Hardy" },
  { name: "Lonely", increased: "attack", decreased: "defense" },
  { name: "Brave", increased: "attack", decreased: "speed" },
  { name: "Adamant", increased: "attack", decreased: "spAttack" },
  { name: "Naughty", increased: "attack", decreased: "spDefense" },
  { name: "Bold", increased: "defense", decreased: "attack" },
  { name: "Docile" },
  { name: "Relaxed", increased: "defense", decreased: "speed" },
  { name: "Impish", increased: "defense", decreased: "spAttack" },
  { name: "Lax", increased: "defense", decreased: "spDefense" },
  { name: "Timid", increased: "speed", decreased: "attack" },
  { name: "Hasty", increased: "speed", decreased: "defense" },
  { name: "Serious" },
  { name: "Jolly", increased: "speed", decreased: "spAttack" },
  { name: "Naive", increased: "speed", decreased: "spDefense" },
  { name: "Modest", increased: "spAttack", decreased: "attack" },
  { name: "Mild", increased: "spAttack", decreased: "defense" },
  { name: "Quiet", increased: "spAttack", decreased: "speed" },
  { name: "Bashful" },
  { name: "Rash", increased: "spAttack", decreased: "spDefense" },
  { name: "Calm", increased: "spDefense", decreased: "attack" },
  { name: "Gentle", increased: "spDefense", decreased: "defense" },
  { name: "Sassy", increased: "spDefense", decreased: "speed" },
  { name: "Careful", increased: "spDefense", decreased: "spAttack" },
  { name: "Quirky" },
];

export const emptyStatBlock = (value = 0): StatBlock => ({
  hp: value,
  attack: value,
  defense: value,
  spAttack: value,
  spDefense: value,
  speed: value,
});

export const totalEvs = (evs: StatBlock): number =>
  STAT_KEYS.reduce((total, key) => total + evs[key], 0);

export function experienceForLevel(
  growthRate: GrowthRate,
  level: number,
): number {
  if (level <= 0) return 0;
  if (level === 1) return 1;

  const cube = level ** 3;
  switch (growthRate) {
    case "slow":
      return Math.floor((5 * cube) / 4);
    case "fast":
      return Math.floor((4 * cube) / 5);
    case "medium-fast":
      return cube;
    case "medium-slow":
      return Math.floor((6 * cube) / 5) - 15 * level ** 2 + 100 * level - 140;
    case "erratic":
      if (level <= 50) return Math.floor(((100 - level) * cube) / 50);
      if (level <= 68) return Math.floor(((150 - level) * cube) / 100);
      if (level <= 98)
        return Math.floor((Math.floor((1911 - 10 * level) / 3) * cube) / 500);
      return Math.floor(((160 - level) * cube) / 100);
    case "fluctuating":
      if (level <= 15)
        return Math.floor((Math.floor((level + 1) / 3 + 24) * cube) / 50);
      if (level <= 36) return Math.floor(((level + 14) * cube) / 50);
      return Math.floor((Math.floor(level / 2 + 32) * cube) / 50);
  }
}

export function levelFromExperience(
  growthRate: GrowthRate,
  experience: number,
): number {
  let level = 1;
  while (level < 100 && experience >= experienceForLevel(growthRate, level + 1))
    level++;
  return level;
}

export function calculateStats(
  species: PokemonSpecies,
  level: number,
  ivs: StatBlock,
  evs: StatBlock,
  natureName: NatureName,
): StatBlock {
  const nature =
    NATURES.find((entry) => entry.name === natureName) ?? NATURES[0];
  const stats = emptyStatBlock();

  for (const key of STAT_KEYS) {
    if (key === "hp") {
      stats.hp =
        species.id === "SHEDINJA"
          ? 1
          : Math.floor(
              ((2 * species.baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) *
                level) /
                100,
            ) +
            level +
            10;
      continue;
    }

    let value =
      Math.floor(
        ((2 * species.baseStats[key] + ivs[key] + Math.floor(evs[key] / 4)) *
          level) /
          100,
      ) + 5;
    if (nature.increased === key) value = Math.floor((value * 110) / 100);
    if (nature.decreased === key) value = Math.floor((value * 90) / 100);
    stats[key] = value;
  }

  return stats;
}

export function applyEvYield(
  currentEvs: StatBlock,
  yieldEvs: StatBlock,
): StatBlock {
  const next = { ...currentEvs };
  let total = totalEvs(next);

  for (const key of EV_APPLICATION_ORDER) {
    if (total >= 510) break;
    const increase = Math.min(yieldEvs[key], 510 - total, 255 - next[key]);
    next[key] += increase;
    total += increase;
  }

  return next;
}

export const experienceYield = (
  species: PokemonSpecies,
  level: number,
): number => Math.max(1, Math.floor((species.baseExperience * level) / 7));

export function validateSimulationInput(
  input: SimulationInput,
  species?: PokemonSpecies,
): ValidationResult {
  const errors: string[] = [];
  let expectedCurrentStats: StatBlock | null = null;
  const statMismatches: StatKey[] = [];

  if (!species) errors.push("Choose a valid Pokémon.");
  if (
    !Number.isInteger(input.currentLevel) ||
    input.currentLevel < 1 ||
    input.currentLevel >= 100
  ) {
    errors.push("Current level must be between 1 and 99.");
  }
  if (
    !Number.isInteger(input.targetLevel) ||
    input.targetLevel <= input.currentLevel ||
    input.targetLevel > 100
  ) {
    errors.push(
      "Target level must be above the current level and no higher than 100.",
    );
  }

  for (const key of STAT_KEYS) {
    if (
      !Number.isInteger(input.ivs[key]) ||
      input.ivs[key] < 0 ||
      input.ivs[key] > 31
    ) {
      errors.push(`${key} IV must be an integer from 0 to 31.`);
    }
    if (
      !Number.isInteger(input.evs[key]) ||
      input.evs[key] < 0 ||
      input.evs[key] > 255
    ) {
      errors.push(`${key} EV must be an integer from 0 to 255.`);
    }
    if (
      !Number.isInteger(input.currentStats[key]) ||
      input.currentStats[key] < 1
    ) {
      errors.push(`${key} current stat must be a positive integer.`);
    }
  }

  if (totalEvs(input.evs) > 510) errors.push("EVs cannot total more than 510.");

  if (!Number.isInteger(input.currentExperience)) {
    errors.push("Current EXP must be an integer.");
  } else if (species) {
    const minimum = experienceForLevel(species.growthRate, input.currentLevel);
    const nextLevel = experienceForLevel(
      species.growthRate,
      input.currentLevel + 1,
    );
    if (
      input.currentExperience < minimum ||
      input.currentExperience >= nextLevel
    ) {
      errors.push(
        `Current EXP must be from ${minimum.toLocaleString()} to ${(nextLevel - 1).toLocaleString()} for level ${input.currentLevel}.`,
      );
    }
  }

  if (
    species &&
    errors.every((error) => !error.includes("IV") && !error.includes("EV"))
  ) {
    expectedCurrentStats = calculateStats(
      species,
      input.currentLevel,
      input.ivs,
      input.evs,
      input.nature,
    );
    for (const key of STAT_KEYS) {
      if (input.currentStats[key] !== expectedCurrentStats[key])
        statMismatches.push(key);
    }
  }

  return { errors, statMismatches, expectedCurrentStats };
}
