import { describe, expect, it } from "vitest";
import {
  applyEvYield,
  calculateStats,
  emptyStatBlock,
  experienceForLevel,
  experienceYield,
  levelFromExperience,
  validateSimulationInput,
} from "../mechanics";
import { emeraldData, speciesById } from "../simulator";
import type { SimulationInput } from "../types";

describe("Emerald experience mechanics", () => {
  it("matches the six level-100 growth-curve totals", () => {
    expect(experienceForLevel("fast", 100)).toBe(800_000);
    expect(experienceForLevel("medium-fast", 100)).toBe(1_000_000);
    expect(experienceForLevel("medium-slow", 100)).toBe(1_059_860);
    expect(experienceForLevel("slow", 100)).toBe(1_250_000);
    expect(experienceForLevel("erratic", 100)).toBe(600_000);
    expect(experienceForLevel("fluctuating", 100)).toBe(1_640_000);
  });

  it("derives levels at exact thresholds and one point below", () => {
    const level50 = experienceForLevel("medium-slow", 50);
    expect(levelFromExperience("medium-slow", level50)).toBe(50);
    expect(levelFromExperience("medium-slow", level50 - 1)).toBe(49);
  });

  it("uses the Gen III solo-wild formula", () => {
    const blissey = speciesById.get("BLISSEY")!;
    expect(experienceYield(blissey, 50)).toBe(
      Math.floor((blissey.baseExperience * 50) / 7),
    );
  });
});

describe("Emerald stat and EV mechanics", () => {
  it("applies IVs, EVs, level, and nature with in-game rounding", () => {
    const swampert = speciesById.get("SWAMPERT")!;
    const ivs = emptyStatBlock(31);
    const evs = { ...emptyStatBlock(), hp: 252, attack: 252 };
    expect(calculateStats(swampert, 50, ivs, evs, "Adamant")).toEqual({
      hp: 207,
      attack: 178,
      defense: 110,
      spAttack: 94,
      spDefense: 110,
      speed: 80,
    });
  });

  it("keeps Shedinja at one HP", () => {
    const shedinja = speciesById.get("SHEDINJA")!;
    expect(
      calculateStats(
        shedinja,
        80,
        emptyStatBlock(31),
        emptyStatBlock(255),
        "Hardy",
      ).hp,
    ).toBe(1);
  });

  it("applies the final EV point in Emerald stat order", () => {
    const current = { ...emptyStatBlock(), hp: 254, attack: 255 };
    const gained = { ...emptyStatBlock(), hp: 1, defense: 3, speed: 3 };
    expect(applyEvYield(current, gained)).toEqual({
      hp: 255,
      attack: 255,
      defense: 0,
      spAttack: 0,
      spDefense: 0,
      speed: 0,
    });
  });
});

describe("simulation input validation", () => {
  it("warns about visible stat mismatches without blocking a valid exact state", () => {
    const species = speciesById.get("SWAMPERT")!;
    const level = 50;
    const input: SimulationInput = {
      speciesId: species.id,
      nature: "Hardy",
      currentLevel: level,
      currentExperience: experienceForLevel(species.growthRate, level),
      targetLevel: 51,
      currentStats: emptyStatBlock(1),
      ivs: emptyStatBlock(0),
      evs: emptyStatBlock(0),
    };
    const result = validateSimulationInput(input, species);
    expect(result.errors).toEqual([]);
    expect(result.statMismatches).toHaveLength(6);
  });

  it("contains exactly 386 selectable species", () => {
    expect(emeraldData.species).toHaveLength(386);
    expect(
      new Set(emeraldData.species.map((species) => species.nationalDex)).size,
    ).toBe(386);
  });
});
