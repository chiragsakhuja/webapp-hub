// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import PokemonEmeraldGrinder from "../PokemonEmeraldGrinder.vue";

const mountTool = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/pokemon-emerald-grinder", component: PokemonEmeraldGrinder },
    ],
  });
  await router.push("/pokemon-emerald-grinder");
  await router.isReady();
  return mount(PokemonEmeraldGrinder, { global: { plugins: [router] } });
};

describe("Pokémon Emerald Grind Simulator", () => {
  it("renders the exact-input matrix and explains percentile output", async () => {
    const wrapper = await mountTool();
    expect(wrapper.text()).toContain("Current Pokémon values");
    expect(wrapper.findAll(".stat-label")).toHaveLength(6);
    expect(wrapper.text()).toContain("10th / 50th / 90th percentile");
  });

  it("shows blocking validation errors for an empty submission", async () => {
    const wrapper = await mountTool();
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Fix these inputs");
    expect(wrapper.text()).toContain("Choose a valid Pokémon");
  });
});
