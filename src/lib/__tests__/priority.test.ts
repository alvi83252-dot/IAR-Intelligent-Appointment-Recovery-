import { describe, expect, it } from "vitest";
import { assessPriority } from "../priority";

describe("assessPriority", () => {
  it("assigns routine band for mild symptoms", () => {
    const result = assessPriority("Annual health check");
    expect(result.band).toBe("routine");
    expect(result.score).toBeLessThan(60);
  });

  it("elevates priority for urgent keywords", () => {
    const result = assessPriority("Severe chest pain and breathing difficulty");
    expect(["urgent", "critical"]).toContain(result.band);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("includes recommendations", () => {
    const result = assessPriority("Persistent fever", 20);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.rationale).toBeTruthy();
  });
});
