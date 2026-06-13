import { describe, expect, it } from "vitest";
import { generateFallbackReply } from "../fallback-replies";

describe("generateFallbackReply", () => {
  it("guides booking requests naturally", () => {
    const reply = generateFallbackReply("I want to book a GP appointment");
    expect(reply.toLowerCase()).toContain("symptoms");
    expect(reply.toLowerCase()).toContain("appointment");
  });

  it("directs emergencies to 999/111", () => {
    const reply = generateFallbackReply("I have severe chest pain");
    expect(reply).toContain("999");
    expect(reply).toContain("111");
  });

  it("explains IAR agents when asked", () => {
    const reply = generateFallbackReply("How does IAR work with agents?");
    expect(reply.toLowerCase()).toContain("personal");
    expect(reply.toLowerCase()).toContain("research");
  });
});
