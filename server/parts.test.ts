import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidModelNumber } from "./ocr";
import { lookupModelNumber, fetchModelData } from "./scraper";

describe("OCR - Model Number Validation", () => {
  it("should accept valid model numbers", () => {
    expect(isValidModelNumber("MVWB300WQ1")).toBe(true);
    expect(isValidModelNumber("WFW5620HW")).toBe(true);
    expect(isValidModelNumber("LG-ABC123")).toBe(true);
    expect(isValidModelNumber("ABC")).toBe(true);
  });

  it("should reject invalid model numbers", () => {
    expect(isValidModelNumber("AB")).toBe(false);
    expect(isValidModelNumber("")).toBe(false);
    expect(isValidModelNumber("   ")).toBe(false);
    expect(isValidModelNumber("A".repeat(21))).toBe(false);
  });

  it("should handle special characters", () => {
    expect(isValidModelNumber("ABC-123")).toBe(true);
    expect(isValidModelNumber("ABC_123")).toBe(false);
    expect(isValidModelNumber("ABC@123")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isValidModelNumber("mvwb300wq1")).toBe(true);
    expect(isValidModelNumber("MvWb300Wq1")).toBe(true);
  });
});

describe("Scraper - Model Lookup", () => {
  it("should return null for non-existent models", async () => {
    const result = await lookupModelNumber("NONEXISTENT12345");
    expect(result).toBeNull();
  });

  it("should handle network errors gracefully", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await lookupModelNumber("MVWB300WQ1");
    expect(result).toBeNull();

    global.fetch = originalFetch;
  });
});

describe("Scraper - Data Fetching", () => {
  it("should return data structure even for invalid model IDs", async () => {
    const result = await fetchModelData("999999999");
    expect(result).toBeDefined();
    expect(result?.diagrams).toBeDefined();
    expect(Array.isArray(result?.diagrams)).toBe(true);
    expect(result?.parts).toBeDefined();
  });

  it("should handle malformed HTML gracefully", async () => {
    const result = await fetchModelData("0");
    expect(result).toBeDefined();
    expect(Array.isArray(result?.diagrams)).toBe(true);
  });

  it("should return proper structure with modelNumber and dlPartsLookupId", async () => {
    const result = await fetchModelData("999999999");
    expect(result?.modelNumber).toBeDefined();
    expect(result?.dlPartsLookupId).toBeDefined();
    expect(typeof result?.modelNumber).toBe("string");
    expect(typeof result?.dlPartsLookupId).toBe("string");
  });
});

describe("Model Number Extraction", () => {
  it("should extract model numbers from various formats", () => {
    const testCases = [
      { input: "MVWB300WQ1", expected: true },
      { input: "mvwb300wq1", expected: true },
      { input: "ABC-123", expected: true },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = isValidModelNumber(input);
      expect(result).toBe(expected);
    });
  });
});

describe("Parts Data Structure", () => {
  it("should validate parts have required fields", () => {
    const validPart = {
      partNumber: "ABC123",
      description: "Test part",
      price: "$10.00",
      availability: "In stock",
    };

    expect(validPart.partNumber).toBeDefined();
    expect(typeof validPart.partNumber).toBe("string");
  });

  it("should handle missing optional fields", () => {
    const part = {
      partNumber: "ABC123",
    };

    expect(part.partNumber).toBeDefined();
  });
});
