<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import ToolLayout from "./ToolLayout.vue";
import {
  emptyStatBlock,
  experienceForLevel,
  NATURES,
  totalEvs,
  validateSimulationInput,
} from "@/lib/emerald/mechanics";
import {
  emeraldData,
  generateSeed,
  simulateGrinding,
  speciesById,
} from "@/lib/emerald/simulator";
import type {
  SimulationInput,
  SimulationSummary,
  StatKey,
} from "@/lib/emerald/types";
import { STAT_KEYS } from "@/lib/emerald/types";

const statLabels: Record<StatKey, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  spAttack: "Sp. Atk",
  spDefense: "Sp. Def",
  speed: "Speed",
};

const speciesOptions = emeraldData.species.map((species) => ({
  ...species,
  optionLabel: `#${String(species.nationalDex).padStart(3, "0")} ${species.name}`,
}));

const speciesQuery = ref("");
const currentLevel = ref(50);
const currentExperience = ref(0);
const targetLevel = ref(60);
const nature = ref<SimulationInput["nature"]>("Hardy");
const currentStats = reactive(emptyStatBlock());
const ivs = reactive(emptyStatBlock());
const evs = reactive(emptyStatBlock());
const seed = ref(generateSeed());
const errors = ref<string[]>([]);
const statMismatches = ref<StatKey[]>([]);
const expectedCurrentStats = ref<SimulationInput["currentStats"] | null>(null);
const results = ref<SimulationSummary | null>(null);
const isRunning = ref(false);

const selectedSpecies = computed(() => {
  const normalized = speciesQuery.value.trim().toLowerCase();
  return speciesOptions.find(
    (species) =>
      species.optionLabel.toLowerCase() === normalized ||
      species.name.toLowerCase() === normalized,
  );
});

const experienceRange = computed(() => {
  if (
    !selectedSpecies.value ||
    currentLevel.value < 1 ||
    currentLevel.value >= 100
  )
    return null;
  const growthRate = selectedSpecies.value.growthRate;
  return {
    minimum: experienceForLevel(growthRate, currentLevel.value),
    maximum: experienceForLevel(growthRate, currentLevel.value + 1) - 1,
  };
});

const formatNumber = (value: number): string => value.toLocaleString();
const levelRangeLabel = (from: number, to: number): string =>
  from === to ? `Lv. ${from}` : `Lv. ${from}–${to}`;
const percentileLabel = (values: {
  p10: number;
  p50: number;
  p90: number;
}): string =>
  values.p10 === values.p90
    ? formatNumber(values.p50)
    : `${formatNumber(values.p10)} / ${formatNumber(values.p50)} / ${formatNumber(values.p90)}`;

const buildInput = (): SimulationInput => ({
  speciesId: selectedSpecies.value?.id ?? "",
  nature: nature.value,
  currentLevel: currentLevel.value,
  currentExperience: currentExperience.value,
  targetLevel: targetLevel.value,
  currentStats: { ...currentStats },
  ivs: { ...ivs },
  evs: { ...evs },
});

const runSimulation = async (newSeed = false): Promise<void> => {
  if (newSeed) seed.value = generateSeed();
  const input = buildInput();
  const validation = validateSimulationInput(
    input,
    speciesById.get(input.speciesId),
  );
  errors.value = validation.errors;
  statMismatches.value = validation.statMismatches;
  expectedCurrentStats.value = validation.expectedCurrentStats;
  if (errors.value.length) {
    results.value = null;
    return;
  }

  isRunning.value = true;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  try {
    results.value = simulateGrinding(input, seed.value);
  } finally {
    isRunning.value = false;
  }
};
</script>

<template>
  <ToolLayout title="Pokémon Emerald Grind Simulator" scrollable>
    <div class="grinder">
      <section class="intro card">
        <p>
          Simulate ordinary solo wild grinding with Pokémon Emerald's exact EXP,
          EV, stat, and encounter rules. Results show the 10th / 50th / 90th
          percentile from 2,000 runs.
        </p>
      </section>

      <form class="input-card card" @submit.prevent="runSimulation(false)">
        <div class="basic-grid">
          <label class="field species-field">
            <span>Pokémon</span>
            <input
              v-model="speciesQuery"
              list="emerald-species"
              placeholder="#260 Swampert"
              autocomplete="off"
            />
            <datalist id="emerald-species">
              <option
                v-for="species in speciesOptions"
                :key="species.id"
                :value="species.optionLabel"
              />
            </datalist>
          </label>

          <label class="field">
            <span>Nature</span>
            <select v-model="nature">
              <option
                v-for="entry in NATURES"
                :key="entry.name"
                :value="entry.name"
              >
                {{ entry.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Current level</span>
            <input
              v-model.number="currentLevel"
              type="number"
              min="1"
              max="99"
              inputmode="numeric"
            />
          </label>

          <label class="field">
            <span>Current total EXP</span>
            <input
              v-model.number="currentExperience"
              type="number"
              min="1"
              inputmode="numeric"
            />
            <small v-if="experienceRange">
              Level range: {{ formatNumber(experienceRange.minimum) }}–{{
                formatNumber(experienceRange.maximum)
              }}
            </small>
          </label>

          <label class="field">
            <span>Target level</span>
            <input
              v-model.number="targetLevel"
              type="number"
              min="2"
              max="100"
              inputmode="numeric"
            />
          </label>

          <label class="field seed-field">
            <span>Batch seed</span>
            <input v-model.trim="seed" type="text" autocomplete="off" />
          </label>
        </div>

        <div class="stat-section">
          <div class="section-heading">
            <div>
              <h2>Current Pokémon values</h2>
              <p>
                Enter the values shown by your save editor. Current stats are
                checked but not used to derive IVs.
              </p>
            </div>
            <span class="ev-total" :class="{ invalid: totalEvs(evs) > 510 }"
              >EV total: {{ totalEvs(evs) }} / 510</span
            >
          </div>

          <div
            class="stat-grid"
            role="group"
            aria-label="Current stats, IVs, and EVs"
          >
            <div class="grid-header">Stat</div>
            <div class="grid-header">Current</div>
            <div class="grid-header">IV</div>
            <div class="grid-header">EV</div>
            <template v-for="key in STAT_KEYS" :key="key">
              <label class="stat-label" :for="`${key}-current`">{{
                statLabels[key]
              }}</label>
              <input
                :id="`${key}-current`"
                v-model.number="currentStats[key]"
                type="number"
                min="1"
                inputmode="numeric"
              />
              <input
                v-model.number="ivs[key]"
                :aria-label="`${statLabels[key]} IV`"
                type="number"
                min="0"
                max="31"
                inputmode="numeric"
              />
              <input
                v-model.number="evs[key]"
                :aria-label="`${statLabels[key]} EV`"
                type="number"
                min="0"
                max="255"
                inputmode="numeric"
              />
            </template>
          </div>
        </div>

        <div v-if="errors.length" class="validation errors" role="alert">
          <strong>Fix these inputs:</strong>
          <ul>
            <li v-for="error in errors" :key="error">{{ error }}</li>
          </ul>
        </div>

        <div
          v-if="statMismatches.length && !errors.length"
          class="validation warning"
          role="status"
        >
          <strong>Displayed-stat mismatch:</strong>
          {{ statMismatches.map((key) => statLabels[key]).join(", ") }} do not
          match the entered species, nature, IVs, and EVs. This can legitimately
          happen before Gen III recalculates newly earned EVs. The simulation
          uses the exact nature, IVs, and EVs you entered.
          <span v-if="expectedCurrentStats">
            Expected now:
            {{
              STAT_KEYS.map(
                (key) => `${statLabels[key]} ${expectedCurrentStats?.[key]}`,
              ).join(", ")
            }}.
          </span>
        </div>

        <button
          class="btn btn-primary simulate-button"
          type="submit"
          :disabled="isRunning"
        >
          {{ isRunning ? "Simulating…" : "Simulate grind" }}
        </button>
      </form>

      <section v-if="results" class="results" aria-live="polite">
        <div class="results-heading">
          <div>
            <h2>Projected result ranges</h2>
            <p>
              P10 / median / P90 across
              {{ results.trials.toLocaleString() }} real encounter sequences.
            </p>
          </div>
          <button
            class="btn btn-secondary rerun-button"
            type="button"
            :disabled="isRunning"
            @click="runSimulation(true)"
          >
            Resimulate
          </button>
        </div>

        <div class="summary-grid">
          <div class="summary-card card">
            <span>Battles</span>
            <strong>{{ percentileLabel(results.battles) }}</strong>
          </div>
          <div class="summary-card card">
            <span>Ending EXP</span>
            <strong>{{ percentileLabel(results.endingExperience) }}</strong>
          </div>
          <div class="summary-card card">
            <span>Seed</span>
            <strong class="seed-value">{{ results.seed }}</strong>
          </div>
        </div>

        <div class="result-tables">
          <div class="card table-card">
            <h3>Target stats</h3>
            <table>
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>P10</th>
                  <th>P50</th>
                  <th>P90</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="key in STAT_KEYS" :key="key">
                  <th>{{ statLabels[key] }}</th>
                  <td>{{ results.statPercentiles[key].p10 }}</td>
                  <td>{{ results.statPercentiles[key].p50 }}</td>
                  <td>{{ results.statPercentiles[key].p90 }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card table-card">
            <h3>Final EVs</h3>
            <table>
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>P10</th>
                  <th>P50</th>
                  <th>P90</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="key in STAT_KEYS" :key="key">
                  <th>{{ statLabels[key] }}</th>
                  <td>{{ results.evPercentiles[key].p10 }}</td>
                  <td>{{ results.evPercentiles[key].p50 }}</td>
                  <td>{{ results.evPercentiles[key].p90 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="results.warnings.length" class="validation warning">
          <p v-for="warning in results.warnings" :key="warning">
            {{ warning }}
          </p>
        </div>

        <div class="card schedule-card">
          <h3>Grinding location rotation</h3>
          <p class="schedule-intro">
            At each level, a trial chooses one of these real encounter tables.
            Better level matches remain more likely, but distinct Pokémon mixes
            stay in the rotation.
          </p>
          <div class="schedule-list">
            <div
              v-for="segment in results.locationSchedule"
              :key="`${segment.options[0].tableId}-${segment.fromLevel}`"
              class="schedule-row"
            >
              <strong>{{
                levelRangeLabel(segment.fromLevel, segment.toLevel)
              }}</strong>
              <div class="schedule-options">
                <div
                  v-for="option in segment.options"
                  :key="option.tableId"
                  class="schedule-option"
                >
                  <span>
                    {{ option.location }} ·
                    {{ option.method === "land" ? "Land/Cave" : "Surf" }} · Wild
                    Lv. {{ option.minOpponentLevel }}–{{
                      option.maxOpponentLevel
                    }}
                  </span>
                  <strong>{{ option.selectionPercentage.toFixed(0) }}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="breakdown-grid">
          <div class="card breakdown-card">
            <h3>Most defeated Pokémon</h3>
            <div
              v-for="entry in results.topSpecies"
              :key="entry.label"
              class="breakdown-row"
            >
              <span>{{ entry.label }}</span
              ><strong>{{ entry.percentage.toFixed(1) }}%</strong>
            </div>
          </div>
          <div class="card breakdown-card">
            <h3>Battle locations</h3>
            <div
              v-for="entry in results.topLocations"
              :key="entry.label"
              class="breakdown-row"
            >
              <span>{{ entry.label }}</span
              ><strong>{{ entry.percentage.toFixed(1) }}%</strong>
            </div>
          </div>
        </div>

        <div class="assumptions card">
          <h3>What this result means</h3>
          <p>
            Each percentile is calculated independently, so one P50 column is
            not guaranteed to be a single EV spread that occurred together. The
            simulation assumes solo wild battles, no held-item or Pokérus
            modifiers, canceled evolution, no encounter-altering ability, and a
            guaranteed win. A location is held for each level, and its original
            encounter-slot odds are used. The 2–5-level gap is a one-shot
            heuristic; damage is not simulated.
          </p>
          <p>
            Data and mechanics are extracted from
            <a
              :href="`${emeraldData.source.repository}/tree/${emeraldData.source.commit}`"
              target="_blank"
              rel="noreferrer"
            >
              pret/pokeemerald {{ emeraldData.source.commit.slice(0, 7) }} </a
            >.
          </p>
        </div>
      </section>
    </div>
  </ToolLayout>
</template>

<style scoped>
.grinder {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 2px 4px 32px;
}

.intro p,
.field span,
.section-heading p,
.results-heading p,
.assumptions p {
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.84);
}

.field small {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.25;
}

.input-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.basic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.field span,
.grid-header,
.stat-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

input,
select {
  width: 100%;
  min-width: 0;
  padding: 10px 11px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  background: rgba(16, 19, 45, 0.4);
  color: white;
  font: inherit;
}

select option {
  color: #222;
}

input:focus,
select:focus {
  outline: 2px solid #51cf66;
  outline-offset: 1px;
}

.stat-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-heading,
.results-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h2 {
  font-size: 1.35rem;
  margin-bottom: 5px;
}

h3 {
  margin-bottom: 14px;
}

.ev-total {
  flex-shrink: 0;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(81, 207, 102, 0.2);
  font-weight: 700;
}

.ev-total.invalid {
  background: rgba(255, 107, 107, 0.25);
  color: #ffe3e3;
}

.stat-grid {
  display: grid;
  grid-template-columns: minmax(78px, 1.2fr) repeat(3, minmax(58px, 1fr));
  gap: 8px;
  align-items: center;
}

.grid-header {
  text-align: center;
}

.grid-header:first-child,
.stat-label {
  text-align: left;
}

.stat-grid input {
  text-align: center;
}

.validation {
  padding: 14px 16px;
  border-radius: 9px;
  line-height: 1.45;
}

.validation ul {
  margin: 8px 0 0 20px;
}

.errors {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 180, 180, 0.5);
}

.warning {
  background: rgba(255, 212, 59, 0.18);
  border: 1px solid rgba(255, 225, 120, 0.5);
}

.simulate-button {
  align-self: center;
}

button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rerun-button {
  padding: 10px 18px;
  font-size: 0.95rem;
}

.summary-grid,
.result-tables,
.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card span {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.86rem;
}

.summary-card strong {
  font-size: 1.05rem;
}

.seed-value {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem !important;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 8px 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  text-align: right;
}

th:first-child {
  text-align: left;
}

thead th {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.8rem;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-intro {
  margin: 6px 0 14px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.9rem;
}

.schedule-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.schedule-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.schedule-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.schedule-option span {
  color: rgba(255, 255, 255, 0.82);
}

.breakdown-card {
  min-width: 0;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.breakdown-row span {
  overflow-wrap: anywhere;
}

.assumptions {
  font-size: 0.9rem;
}

.assumptions p + p {
  margin-top: 10px;
}

.assumptions a {
  color: #fff3bf;
}

@media (max-width: 680px) {
  .basic-grid,
  .summary-grid,
  .result-tables,
  .breakdown-grid {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .results-heading {
    flex-direction: column;
  }

  .schedule-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 420px) {
  .input-card,
  .table-card,
  .schedule-card,
  .breakdown-card,
  .assumptions {
    padding: 16px;
  }

  .stat-grid {
    grid-template-columns: 70px repeat(3, minmax(50px, 1fr));
    gap: 6px;
  }

  .stat-grid input {
    padding: 9px 4px;
  }

  .schedule-row {
    grid-template-columns: 1fr;
  }
}
</style>
