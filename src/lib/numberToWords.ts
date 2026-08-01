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
 * Formats an amount input string into currency format and words helper text.
 * E.g., "1250.50" => "₹1,250.50 (One Thousand Two Hundred Fifty Rupees and Fifty Paise)"
 */
export function formatAmountInWords(
  amountStr: unknown,
): string | null {
  if (amountStr == null) return null;

  const raw = Array.isArray(amountStr) ? amountStr.join("") : String(amountStr);
  const str = raw.trim();
  if (!str) return null;

  const num = parseFloat(str);
  if (Number.isNaN(num) || num <= 0 || !Number.isFinite(num)) {
    return null;
  }

  let rupees = Math.floor(num);
  let paise = Math.round((num - rupees) * 100);

  if (paise === 100) {
    rupees += 1;
    paise = 0;
  }

  const rupeesWords = rupees > 0 ? numberToWords(rupees) : "";
  const paiseWords = paise > 0 ? numberToWords(paise) : "";

  let words = "";
  if (rupees > 0 && paise > 0) {
    words = `${rupeesWords} ${rupees === 1 ? "Rupee" : "Rupees"} and ${paiseWords} ${paise === 1 ? "Paisa" : "Paise"}`;
  } else if (rupees > 0) {
    words = `${rupeesWords} ${rupees === 1 ? "Rupee" : "Rupees"}`;
  } else if (paise > 0) {
    words = `${paiseWords} ${paise === 1 ? "Paisa" : "Paise"}`;
  } else {
    words = "Zero Rupees";
  }

  const formattedCurrency = formatCurrency(num);
  return `${formattedCurrency} (${words})`;
}
