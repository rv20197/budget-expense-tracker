import { pdf } from "pdf-to-img";
import OpenAI from "openai";

export type ParsedTransaction = {
  date: Date;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance?: number;
};

export type PDFParseResult = {
  transactions: ParsedTransaction[];
  confidence: "high" | "low";
  detectedBank: string | null;
  parsingWarnings: string[];
};

const EXTRACTION_PROMPT = `These are pages of an Indian bank statement. Extract every transaction from ALL pages.

Return ONLY a JSON object (no markdown, no code block, no explanation):
{"bank":"bank name or null","transactions":[{"date":"DD/MM/YYYY","description":"merchant or narration","amount":1234.56,"type":"debit or credit"}]}

Rules:
- Credit card purchases/charges/EMI installments = "debit"
- Credit card payments received / cashback / surcharge waivers / fee reversals = "credit"
- Savings/current account: deposits, credited amounts = "credit"; withdrawals, debited amounts = "debit"
- Skip header rows, summary rows, opening/closing balance rows
- Use only date part (DD/MM/YYYY) — ignore time if present
- Clean merchant names: remove [EMI] tags, bullet points (●), PI markers
- If a page has no transactions, ignore it`;

function parseDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  return y >= 2000 && y <= new Date().getFullYear() + 1 ? d : null;
}

export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  const warnings: string[] = [];

  if (buffer.subarray(0, 4).toString("binary") !== "%PDF") {
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["Not a valid PDF file."] };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["PDF import requires an OpenAI API key (OPENAI_API_KEY). Please contact your administrator."] };
  }

  // Render PDF pages to PNG images
  const images: string[] = [];
  try {
    const doc = await pdf(buffer, { scale: 1.5 });
    for await (const page of doc) {
      images.push(Buffer.from(page).toString("base64"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password|encrypt/i.test(msg)) {
      return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["This PDF is password-protected. Please remove the password and try again."] };
    }
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: [`Could not read PDF: ${msg}`] };
  }

  if (images.length === 0) {
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["PDF appears to be empty."] };
  }

  // GPT-4o vision extraction — send up to 20 pages per request
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const allTransactions: ParsedTransaction[] = [];
  let detectedBank: string | null = null;

  const BATCH = 5;
  for (let start = 0; start < images.length; start += BATCH) {
    const batch = images.slice(start, start + BATCH);
    const content: OpenAI.ChatCompletionContentPart[] = [
      { type: "text", text: EXTRACTION_PROMPT },
      ...batch.map((b64) => ({
        type: "image_url" as const,
        image_url: { url: `data:image/png;base64,${b64}`, detail: "high" as const },
      })),
    ];

    let raw: string;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content }],
        max_tokens: 8192,
      });
      raw = response.choices[0].message.content ?? "";
    } catch (err) {
      warnings.push(`AI extraction error: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      warnings.push("AI returned unexpected format for one batch of pages.");
      continue;
    }

    let parsed: { bank?: string | null; transactions: Array<{ date: string; description: string; amount: number; type: string }> };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      warnings.push("Could not parse AI response as JSON.");
      continue;
    }

    if (!detectedBank && parsed.bank) detectedBank = parsed.bank;

    for (const item of parsed.transactions ?? []) {
      const date = parseDate(item.date);
      if (!date) continue;
      if (typeof item.amount !== "number" || item.amount <= 0 || item.amount > 100_000_000) continue;
      const type = item.type === "credit" ? "credit" : "debit";

      allTransactions.push({
        date,
        description: String(item.description || "Transaction").slice(0, 200),
        amount: Math.round(item.amount * 100) / 100,
        type,
      });
    }
  }

  if (allTransactions.length === 0) {
    warnings.push("No transactions found. This statement may not contain transaction data in a recognizable format.");
  } else if (allTransactions.length < 3) {
    warnings.push("Very few transactions detected. Please review the imported data.");
  }

  return {
    transactions: allTransactions,
    confidence: allTransactions.length >= 3 ? "high" : "low",
    detectedBank,
    parsingWarnings: warnings,
  };
}
