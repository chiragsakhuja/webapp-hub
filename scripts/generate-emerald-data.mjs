#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SOURCE_COMMIT = "5eff78649e7170a877b961ef0b3da13b81a16038";
const sourceRoot = resolve(process.argv[2] ?? "");
const outputPath = resolve(process.argv[3] ?? "src/data/emerald.json");

if (!process.argv[2]) {
  console.error(
    "Usage: node scripts/generate-emerald-data.mjs <pokeemerald-source> [output]",
  );
  process.exit(1);
}

const readSource = (path) => readFile(resolve(sourceRoot, path), "utf8");

const [
  speciesConstants,
  pokedexConstants,
  speciesNames,
  speciesInfo,
  encounterJson,
] = await Promise.all([
  readSource("include/constants/species.h"),
  readSource("include/constants/pokedex.h"),
  readSource("src/data/text/species_names.h"),
  readSource("src/data/pokemon/species_info.h"),
  readSource("src/data/wild_encounters.json").then(JSON.parse),
]);

const internalIds = new Map();
for (const match of speciesConstants.matchAll(
  /^#define SPECIES_([A-Z0-9_]+) (\d+)$/gm,
)) {
  internalIds.set(match[1], Number(match[2]));
}

const nationalDexNumbers = new Map();
let nationalDex = 0;
for (const match of pokedexConstants.matchAll(
  /^\s*NATIONAL_DEX_([A-Z0-9_]+),$/gm,
)) {
  nationalDexNumbers.set(match[1], nationalDex);
  nationalDex++;
}

const names = new Map();
for (const match of speciesNames.matchAll(
  /\[SPECIES_([A-Z0-9_]+)\]\s*=\s*_\("([^"]+)"\)/g,
)) {
  names.set(match[1], match[2]);
}

const titleCaseName = (name) =>
  name
    .toLowerCase()
    .split(/([ -])/)
    .map((part) =>
      /^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part,
    )
    .join("");

const readNumber = (body, field) => {
  const match = body.match(new RegExp(`\\.${field}\\s*=\\s*(\\d+)`));
  if (!match) throw new Error(`Missing ${field}`);
  return Number(match[1]);
};

const readToken = (body, field) => {
  const match = body.match(new RegExp(`\\.${field}\\s*=\\s*([A-Z0-9_]+)`));
  if (!match) throw new Error(`Missing ${field}`);
  return match[1];
};

const growthRates = {
  GROWTH_MEDIUM_FAST: "medium-fast",
  GROWTH_ERRATIC: "erratic",
  GROWTH_FLUCTUATING: "fluctuating",
  GROWTH_MEDIUM_SLOW: "medium-slow",
  GROWTH_FAST: "fast",
  GROWTH_SLOW: "slow",
};

const species = [];
const speciesBlockPattern =
  /\[SPECIES_([A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)(?=\n\s*\[SPECIES_|\n};)/g;
for (const match of speciesInfo.matchAll(speciesBlockPattern)) {
  const key = match[1];
  const internalId = internalIds.get(key);
  if (
    !internalId ||
    internalId === 412 ||
    (internalId >= 252 && internalId <= 276)
  )
    continue;

  const body = match[2];
  const nationalDex = nationalDexNumbers.get(key);
  if (!nationalDex)
    throw new Error(`Missing National Pokédex number for ${key}`);
  const growthRateToken = readToken(body, "growthRate");
  const entry = {
    id: key,
    nationalDex,
    name: titleCaseName(names.get(key) ?? key.replaceAll("_", " ")),
    baseStats: {
      hp: readNumber(body, "baseHP"),
      attack: readNumber(body, "baseAttack"),
      defense: readNumber(body, "baseDefense"),
      spAttack: readNumber(body, "baseSpAttack"),
      spDefense: readNumber(body, "baseSpDefense"),
      speed: readNumber(body, "baseSpeed"),
    },
    baseExperience: readNumber(body, "expYield"),
    evYield: {
      hp: readNumber(body, "evYield_HP"),
      attack: readNumber(body, "evYield_Attack"),
      defense: readNumber(body, "evYield_Defense"),
      spAttack: readNumber(body, "evYield_SpAttack"),
      spDefense: readNumber(body, "evYield_SpDefense"),
      speed: readNumber(body, "evYield_Speed"),
    },
    growthRate: growthRates[growthRateToken],
  };

  if (!entry.growthRate)
    throw new Error(`Unknown growth rate ${growthRateToken}`);

  // Emerald displays Deoxys in Speed Form outside link battles.
  if (key === "DEOXYS") {
    entry.baseStats = {
      hp: 50,
      attack: 95,
      defense: 90,
      spAttack: 95,
      spDefense: 90,
      speed: 180,
    };
  }

  species.push(entry);
}

species.sort((a, b) => a.nationalDex - b.nationalDex);
if (species.length !== 386)
  throw new Error(`Expected 386 Pokémon, found ${species.length}`);

const excludedMapPrefixes = [
  "MAP_SAFARI_ZONE_",
  "MAP_MIRAGE_TOWER_",
  "MAP_ALTERING_CAVE",
  "MAP_MAGMA_HIDEOUT_",
  "MAP_CAVE_OF_ORIGIN",
];

const humanizeMap = (map) => {
  const words = map
    .replace(/^MAP_/, "")
    .split("_")
    .map((word) => {
      if (/^[B]?\d+F$/.test(word) || /^\d+R$/.test(word)) return word;
      if (word === "MT") return "Mt.";
      if (word === "STEVENS") return "Steven's";
      return word[0] + word.slice(1).toLowerCase();
    });
  return words.join(" ");
};

const encounterGroup = encounterJson.wild_encounter_groups.find(
  (group) => group.label === "gWildMonHeaders",
);
if (!encounterGroup) throw new Error("Missing gWildMonHeaders");

const weightsByType = Object.fromEntries(
  encounterGroup.fields.map((field) => [field.type, field.encounter_rates]),
);
const speciesIds = new Set(species.map((entry) => entry.id));
const encounters = [];

for (const encounter of encounterGroup.encounters) {
  if (excludedMapPrefixes.some((prefix) => encounter.map.startsWith(prefix)))
    continue;

  for (const [sourceType, method] of [
    ["land_mons", "land"],
    ["water_mons", "surf"],
  ]) {
    const table = encounter[sourceType];
    if (!table) continue;
    const weights = weightsByType[sourceType];
    if (weights.length !== table.mons.length) {
      throw new Error(
        `${encounter.map} ${sourceType} has ${table.mons.length} slots, expected ${weights.length}`,
      );
    }

    encounters.push({
      id: `${encounter.map.replace(/^MAP_/, "").toLowerCase()}:${method}`,
      map: encounter.map,
      location: humanizeMap(encounter.map),
      method,
      encounterRate: table.encounter_rate,
      slots: table.mons.map((slot, index) => {
        const speciesId = slot.species.replace(/^SPECIES_/, "");
        if (!speciesIds.has(speciesId))
          throw new Error(`Unknown encounter species ${speciesId}`);
        return {
          speciesId,
          minLevel: slot.min_level,
          maxLevel: slot.max_level,
          weight: weights[index],
        };
      }),
    });
  }
}

const data = {
  source: {
    repository: "https://github.com/pret/pokeemerald",
    commit: SOURCE_COMMIT,
    romSha1: "f3ae088181bf583e55daf962a92bb46f4f1d07b7",
  },
  species,
  encounters,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(data)}\n`);
console.log(
  `Wrote ${species.length} Pokémon and ${encounters.length} encounter tables to ${outputPath}`,
);
