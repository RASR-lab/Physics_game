import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS } from "../src/game/rules";

describe("game rules", () => {
  it("students get 3 tries per situation", () => {
    expect(MAX_ATTEMPTS).toBe(3);
  });
});
