import { describe, expect, it } from "vitest";
import { formatAmountInWords, numberToWords, numberToWordsStandard } from "./numberToWords";

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

  it("converts standard millions and billions correctly", () => {
    expect(numberToWordsStandard(1000000)).toBe("One Million");
    expect(numberToWordsStandard(1500000)).toBe("One Million Five Hundred Thousand");
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

  it("formats integer amounts with INR currency symbol and words", () => {
    expect(formatAmountInWords("500", "INR")).toBe("₹500.00 (Five Hundred Rupees)");
    expect(formatAmountInWords("1250", "INR")).toBe("₹1,250.00 (One Thousand Two Hundred Fifty Rupees)");
  });

  it("formats decimal amounts with paise", () => {
    expect(formatAmountInWords("1250.50", "INR")).toBe("₹1,250.50 (One Thousand Two Hundred Fifty Rupees and Fifty Paise)");
    expect(formatAmountInWords("0.75", "INR")).toBe("₹0.75 (Seventy Five Paise)");
  });

  it("formats USD currency amounts correctly", () => {
    expect(formatAmountInWords("1250.50", "USD")).toBe("$1,250.50 (One Thousand Two Hundred Fifty Dollars and Fifty Cents)");
  });

  it("formats EUR currency amounts correctly", () => {
    expect(formatAmountInWords("1250.50", "EUR")).toBe("€1,250.50 (One Thousand Two Hundred Fifty Euros and Fifty Cents)");
  });

  it("formats GBP currency amounts correctly", () => {
    expect(formatAmountInWords("1250.50", "GBP")).toBe("£1,250.50 (One Thousand Two Hundred Fifty Pounds and Fifty Pence)");
  });

  it("formats JPY currency amounts correctly", () => {
    expect(formatAmountInWords("1250", "JPY")).toBe("¥1,250 (One Thousand Two Hundred Fifty Yen)");
  });
});
