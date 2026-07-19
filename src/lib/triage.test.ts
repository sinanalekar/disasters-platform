import { describe, expect, it } from "vitest";
import { rulesTriage } from "./triage";

describe("rulesTriage", () => {
  it("marks active building fire as critical", () => {
    const result = rulesTriage("There is fire and thick smoke coming from a residential building. A child may be trapped.");
    expect(result.category).toBe("fire");
    expect(result.priority).toBe("critical");
    expect(result.requiresHumanReview).toBe(true);
  });

  it("classifies a pothole as low priority", () => {
    const result = rulesTriage("There is a large pothole on the road near our building.");
    expect(result.category).toBe("road");
    expect(result.priority).toBe("low");
  });

  it("falls back to the citizen category when uncertain", () => {
    const result = rulesTriage("The issue needs attention but I am not sure what happened.", "sanitation");
    expect(result.category).toBe("sanitation");
    expect(result.requiresHumanReview).toBe(true);
  });
});
