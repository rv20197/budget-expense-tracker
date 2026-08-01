import { getClientCurrency } from "./currencyContext";
import { SUPPORTED_CURRENCIES } from "./currencies";
import { formatCurrency } from "./utils";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return TENS[ten] + (rest ? " " + ONES[rest] : "");
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return ONES[hundred] + " Hundred" + (rest ? " " + convertBelowThousand(rest) : "");
}

/**
 * Converts a non-negative integer to words using the Indian numbering system (Crore, Lakh, Thousand).
 */
export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  if (num < 0) return "Minus " + numberToWords(Math.abs(num));

  let n = Math.floor(num);
  let words = "";

  const crore = Math.floor(n / 10000000);
  n %= 10000000;

  const lakh = Math.floor(n / 100000);
  n %= 100000;

  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore > 0) {
    words += (words ? " " : "") + numberToWords(crore) + " Crore";
  }
  if (lakh > 0) {
    words += (words ? " " : "") + convertBelowThousand(lakh) + " Lakh";
  }
  if (thousand > 0) {
    words += (words ? " " : "") + convertBelowThousand(thousand) + " Thousand";
  }
  if (n > 0) {
    words += (words ? " " : "") + convertBelowThousand(n);
  }

  return words.trim();
}

/**
 * Converts a non-negative integer to words using the Standard numbering system (Billion, Million, Thousand).
 */
export function numberToWordsStandard(num: number): string {
  if (num === 0) return "Zero";
  if (num < 0) return "Minus " + numberToWordsStandard(Math.abs(num));

  let n = Math.floor(num);
  let words = "";

  const billion = Math.floor(n / 1000000000);
  n %= 1000000000;

  const million = Math.floor(n / 1000000);
  n %= 1000000;

  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (billion > 0) {
    words += (words ? " " : "") + convertBelowThousand(billion) + " Billion";
  }
  if (million > 0) {
    words += (words ? " " : "") + convertBelowThousand(million) + " Million";
  }
  if (thousand > 0) {
    words += (words ? " " : "") + convertBelowThousand(thousand) + " Thousand";
  }
  if (n > 0) {
    words += (words ? " " : "") + convertBelowThousand(n);
  }

  return words.trim();
}

/**
 * Formats an amount input string into currency format and words helper text.
 * E.g., "1250.50" => "$1,250.50 (One Thousand Two Hundred Fifty Dollars and Fifty Cents)"
 */
export function formatAmountInWords(
  amountStr: unknown,
  currencyCode?: string,
): string | null {
  const code = currencyCode || getClientCurrency();
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;

  if (amountStr == null) return null;

  const raw = Array.isArray(amountStr) ? amountStr.join("") : String(amountStr);
  const str = raw.trim();
  if (!str) return null;

  const num = parseFloat(str);
  if (Number.isNaN(num) || num <= 0 || !Number.isFinite(num)) {
    return null;
  }

  let units = Math.floor(num);
  let subunits = Math.round((num - units) * 100);

  if (subunits === 100) {
    units += 1;
    subunits = 0;
  }

  const isIndian = config.system === "indian";
  const toWords = isIndian ? numberToWords : numberToWordsStandard;

  const unitsWords = units > 0 ? toWords(units) : "";
  const subunitsWords =
    subunits > 0 && config.subunitSingular ? toWords(subunits) : "";

  const unitLabel = units === 1 ? config.unitSingular : config.unitPlural;
  const subunitLabel = subunits === 1 ? config.subunitSingular : config.subunitPlural;

  let words = "";
  if (units > 0 && subunits > 0 && subunitLabel) {
    words = `${unitsWords} ${unitLabel} and ${subunitsWords} ${subunitLabel}`;
  } else if (units > 0) {
    words = `${unitsWords} ${unitLabel}`;
  } else if (subunits > 0 && subunitLabel) {
    words = `${subunitsWords} ${subunitLabel}`;
  } else {
    words = `Zero ${config.unitPlural}`;
  }

  const formattedCurrency = formatCurrency(num, code);
  return `${formattedCurrency} (${words})`;
}
