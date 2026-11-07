import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { labelChanges } = createRequire(import.meta.url)("../../label-issues/decide-labels.cjs");

describe("labelChanges", () => {
  it("adds the label named by the title prefix", () => {
    expect(labelChanges("[TASK] Find the caravan", [])).toEqual({ remove: [], add: ["task"] });
    expect(labelChanges("[STORY] As a player", [])).toEqual({ remove: [], add: ["story"] });
    expect(labelChanges("[EPIC] Quests", [])).toEqual({ remove: [], add: ["epic"] });
  });

  it("changes nothing when the issue already has its label", () => {
    expect(labelChanges("[EPIC] Quests", ["epic"])).toEqual({ remove: [], add: [] });
  });

  it("swaps the label when the prefix changes, keeping other labels", () => {
    expect(labelChanges("[STORY] Retitled", ["task", "bug"])).toEqual({ remove: ["task"], add: ["story"] });
  });

  it("removes every other type label", () => {
    expect(labelChanges("[EPIC] Quests", ["task", "story"])).toEqual({ remove: ["story", "task"], add: ["epic"] });
  });

  it("takes the label off when the prefix is removed", () => {
    expect(labelChanges("No prefix any more", ["story"])).toEqual({ remove: ["story"], add: [] });
  });

  it("changes nothing on an issue without a prefix or a type label", () => {
    expect(labelChanges("Typo in the README", ["bug"])).toEqual({ remove: [], add: [] });
  });

  it("reads the prefix only at the start of the title, in capitals", () => {
    expect(labelChanges("Split [TASK] into two", [])).toEqual({ remove: [], add: [] });
    expect(labelChanges("[task] Find the caravan", [])).toEqual({ remove: [], add: [] });
  });
});
