import { describe, expect, it } from "vitest";
import {
  calculateStats,
  emptyStatBlock,
  experienceForLevel,
} from "../mechanics";
import {
  chooseEncounterTable,
  emeraldData,
  getEncounterTablePool,
  percentile,
  simulateGrinding,
  speciesById,
} from "../simulator";
import type { SimulationInput } from "../types";

const makeInput = (): SimulationInput => {
  const species = speciesById.get("SWAMPERT")!;
  const level = 50;
  const ivs = emptyStatBlock(20);
  const evs = emptyStatBlock(0);
  return {
    speciesId: species.id,
    nature: "Modest",
    currentLevel: level,
    currentExperience: experienceForLevel(species.growthRate, level),
    targetLevel: 52,
    currentStats: calculateStats(species, level, ivs, evs, "Modest"),
    ivs,
    evs,
  };
};

describe("Emerald encounter data", () => {
  it("keeps valid 100-percent Land and Surf tables only", () => {
    for (const table of emeraldData.encounters) {
      expect(["land", "surf"]).toContain(table.method);
      expect(table.slots.reduce((total, slot) => total + slot.weight, 0)).toBe(
        100,
      );
      expect(table.map).not.toMatch(
        /SAFARI|MIRAGE_TOWER|ALTERING_CAVE|MAGMA_HIDEOUT|CAVE_OF_ORIGIN/,
      );
    }
  });

  it("chooses a table entirely below a postgame player level", () => {
    const choice = chooseEncounterTable(50);
    expect(choice.usedFallback).toBe(false);
    expect(
      Math.max(...choice.table.slots.map((slot) => slot.maxLevel)),
    ).toBeLessThan(50);
  });

  it("keeps several distinct high-level encounter mixes in rotation", () => {
    const pool = getEncounterTablePool(55);
    const locations = new Set(pool.map((choice) => choice.table.location));
    const speciesMixes = new Set(
      pool.map((choice) =>
        [...new Set(choice.table.slots.map((slot) => slot.speciesId))]
          .sort()
          .join(":"),
      ),
    );

    expect(pool).toHaveLength(6);
    expect(locations.size).toBeGreaterThanOrEqual(5);
    expect(speciesMixes.size).toBe(6);
    expect(
      pool.every(
        (choice) =>
          Math.max(...choice.table.slots.map((slot) => slot.maxLevel)) < 55,
      ),
    ).toBe(true);
  });
});

describe("Monte Carlo grinding simulation", () => {
  it("is deterministic for a seed and reaches the target level", () => {
    const input = makeInput();
    const first = simulateGrinding(input, "fixed-test-seed", 80);
    const second = simulateGrinding(input, "fixed-test-seed", 80);
    expect(first).toEqual(second);
    expect(first.endingExperience.p10).toBeGreaterThanOrEqual(
      experienceForLevel(
        speciesById.get(input.speciesId)!.growthRate,
        input.targetLevel,
      ),
    );
    expect(first.locationSchedule[0].fromLevel).toBe(input.currentLevel);
    expect(first.locationSchedule.at(-1)?.toLevel).toBe(input.targetLevel - 1);
    expect(first.locationSchedule[0].options.length).toBeGreaterThan(1);
  });

  it("uses multiple realistic locations for a level-55 grind", () => {
    const input = makeInput();
    const species = speciesById.get(input.speciesId)!;
    input.currentLevel = 55;
    input.currentExperience = experienceForLevel(species.growthRate, 55);
    input.targetLevel = 57;
    input.currentStats = calculateStats(
      species,
      55,
      input.ivs,
      input.evs,
      input.nature,
    );

    const result = simulateGrinding(input, "variety-test-seed", 200);
    expect(result.topLocations.length).toBeGreaterThanOrEqual(5);
    expect(result.topSpecies.length).toBeGreaterThanOrEqual(8);
  });

  it("calculates nearest-rank percentiles", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
  });
});
