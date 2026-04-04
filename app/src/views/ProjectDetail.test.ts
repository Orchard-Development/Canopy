import { describe, it, expect } from "vitest";
import { resolveTab } from "./projectDetailTabs";

describe("resolveTab", () => {
  it("passes through valid tab keys unchanged", () => {
    expect(resolveTab("dashboard")).toBe("dashboard");
    expect(resolveTab("intelligence")).toBe("intelligence");
    expect(resolveTab("files")).toBe("files");
    expect(resolveTab("settings")).toBe("settings");
  });

  it("resolves legacy aliases", () => {
    expect(resolveTab("overview")).toBe("dashboard");
    expect(resolveTab("seeds")).toBe("intelligence");
    expect(resolveTab("browser")).toBe("files");
    expect(resolveTab("theme")).toBe("settings");
    expect(resolveTab("general")).toBe("settings");
    expect(resolveTab("secrets")).toBe("settings");
    expect(resolveTab("servers")).toBe("settings");
    expect(resolveTab("views")).toBe("settings");
  });

  it("falls back to dashboard for unknown values", () => {
    expect(resolveTab("")).toBe("dashboard");
    expect(resolveTab("garbage")).toBe("dashboard");
  });
});
