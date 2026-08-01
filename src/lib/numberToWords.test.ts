import { describe, expect, it } from "vitest";
import { formatAmountInWords, numberToWords } from "./numberToWords";

describe("numberToWords", () => {
  it("converts single digits correctly", () => {
    expect(numberToWords(1)).toBe("One");
    expect(numberToWords(5)).toBe("Five");
  });

  it("converts tens and hundreds correctly", () => {
    expect(numberToWords(25)).toBe("Twenty Five");
    expect(numberToWords(100)).toBe("One Hundred");
    expect(numberToWords(350)).toBe("Three Hundred Fifty");
  });

  it("converts thousands, lakhs, and crores correctly", () => {
    expect(numberToWords(1000)).toBe("One Thousand");
    expect(numberToWords(1250)).toBe("One Thousand Two Hundred Fifty");
    expect(numberToWords(50000)).toBe("Fifty Thousand");
    expect(numberToWords(100000)).toBe("One Lakh");
    expect(numberToWords(1500000)).toBe("Fifteen Lakh");
    expect(numberToWords(10000000)).toBe("One Crore");
  });
});

describe("formatAmountInWords", () => {
  it("returns null for empty, invalid, or zero amounts", () => {
    expect(formatAmountInWords("")).toBeNull();
    expect(formatAmountInWords("abc")).toBeNull();
    expect(formatAmountInWords("0")).toBeNull();
    expect(formatAmountInWords("-50")).toBeNull();
    expect(formatAmountInWords(null)).toBeNull();
  });

  it("formats integer amounts with currency symbol and words", () => {
    expect(formatAmountInWords("500")).toBe("₹500.00 (Five Hundred Rupees)");
    expect(formatAmountInWords("1250")).toBe("₹1,250.00 (One Thousand Two Hundred Fifty Rupees)");
  });

  it("formats decimal amounts with paise", () => {
    expect(formatAmountInWords("1250.50")).toBe("₹1,250.50 (One Thousand Two Hundred Fifty Rupees and Fifty Paise)");
    expect(formatAmountInWords("0.75")).toBe("₹0.75 (Seventy Five Paise)");
  });
});
