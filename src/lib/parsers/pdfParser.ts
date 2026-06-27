import pdfParse from "pdf-parse";
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

const TEXT_PROMPT = `This is text extracted from an Indian bank statement. Extract every transaction.

Return ONLY a JSON object (no markdown, no code block, no explanation):
{"bank":"bank name or null","transactions":[{"date":"DD/MM/YYYY","description":"merchant or narration","amount":1234.56,"type":"debit or credit"}]}

Rules:
- Credit card purchases/charges/EMI installments = "debit"
- Credit card payments received / cashback / surcharge waivers / fee reversals = "credit"
- Savings/current account: deposits, credited amounts = "credit"; withdrawals, debited amounts = "debit"
- Skip header rows, summary rows, opening/closing balance rows
- Use only date part (DD/MM/YYYY) — ignore time if present
- Clean merchant names: remove [EMI] tags, bullet points (●), PI markers
- If a section has no transactions, ignore it`;

const IMAGE_PROMPT = `These are pages of an Indian bank statement. Extract every transaction from ALL pages.

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

// Renders each PDF page to a base64 PNG using pdfjs-dist + @napi-rs/canvas.
// @napi-rs/canvas supplies the DOMMatrix + CanvasRenderingContext2D that
// pdfjs-dist needs for rendering, without any browser DOM dependency.
async function renderPDFToImages(buffer: Buffer): Promise<string[]> {
  const { createCanvas, DOMMatrix: NapiDOMMatrix } = await import("@napi-rs/canvas");

  // Polyfill DOMMatrix globally so pdfjs-dist's render path can find it
  if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
    (globalThis as Record<string, unknown>).DOMMatrix = NapiDOMMatrix;
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { pathToFileURL } = await import("url");
  const { join } = await import("path");

  // Point pdfjs-dist at its worker file via a proper file:// URL so Node.js
  // worker_threads can load it on both Windows (d:\...) and Linux (/var/task/...)
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs"),
  ).href;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const images: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
    images.push(canvas.toBuffer("image/png").toString("base64"));
  }

  return images;
}

async function callGPT(
  openai: OpenAI,
  content: OpenAI.ChatCompletionContentPart[],
  warnings: string[],
): Promise<{ bank: string | null; transactions: ParsedTransaction[] }> {
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
    return { bank: null, transactions: [] };
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    warnings.push("AI returned unexpected format.");
    return { bank: null, transactions: [] };
  }

  let parsed: { bank?: string | null; transactions: Array<{ date: string; description: string; amount: number; type: string }> };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    warnings.push("Could not parse AI response as JSON.");
    return { bank: null, transactions: [] };
  }

  const transactions: ParsedTransaction[] = [];
  for (const item of parsed.transactions ?? []) {
    const date = parseDate(item.date);
    if (!date) continue;
    if (typeof item.amount !== "number" || item.amount <= 0 || item.amount > 100_000_000) continue;
    transactions.push({
      date,
      description: String(item.description || "Transaction").slice(0, 200),
      amount: Math.round(item.amount * 100) / 100,
      type: item.type === "credit" ? "credit" : "debit",
    });
  }

  return { bank: parsed.bank ?? null, transactions };
}

export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  const warnings: string[] = [];

  if (buffer.subarray(0, 4).toString("binary") !== "%PDF") {
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["Not a valid PDF file."] };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["PDF import requires an OpenAI API key (OPENAI_API_KEY). Please contact your administrator."] };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // --- Attempt 1: text extraction ---
  let fullText = "";
  let numPages = 1;
  try {
    const data = await pdfParse(buffer);
    fullText = data.text ?? "";
    numPages = data.numpages ?? 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password|encrypt/i.test(msg)) {
      return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["This PDF is password-protected. Please remove the password and try again."] };
    }
    // Non-fatal: fall through to image mode
    warnings.push(`Text extraction failed, trying image mode: ${msg}`);
  }

  const avgCharsPerPage = fullText.trim().length / numPages;
  const hasUsableText = avgCharsPerPage >= 80;

  if (hasUsableText) {
    // --- Text mode: send in ~20k char chunks to GPT-4o ---
    const allTransactions: ParsedTransaction[] = [];
    let detectedBank: string | null = null;
    const CHUNK = 20_000;

    for (let start = 0; start < fullText.length; start += CHUNK) {
      const chunk = fullText.slice(start, start + CHUNK);
      const { bank, transactions } = await callGPT(
        openai,
        [{ type: "text", text: `${TEXT_PROMPT}\n\n--- STATEMENT TEXT ---\n${chunk}` }],
        warnings,
      );
      if (!detectedBank && bank) detectedBank = bank;
      allTransactions.push(...transactions);
    }

    if (allTransactions.length > 0 || warnings.some(w => w.startsWith("AI"))) {
      return buildResult(allTransactions, detectedBank, warnings);
    }
    // If GPT found nothing from text, fall through to image mode
    warnings.push("Text extraction yielded no transactions, retrying with image mode.");
  }

  // --- Image mode: render pages → GPT-4o vision ---
  let images: string[];
  try {
    images = await renderPDFToImages(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password|encrypt/i.test(msg)) {
      return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: ["This PDF is password-protected. Please remove the password and try again."] };
    }
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: [...warnings, `Could not render PDF: ${msg}`] };
  }

  if (images.length === 0) {
    return { transactions: [], confidence: "low", detectedBank: null, parsingWarnings: [...warnings, "PDF appears to be empty."] };
  }

  const allTransactions: ParsedTransaction[] = [];
  let detectedBank: string | null = null;
  const BATCH = 5;

  for (let start = 0; start < images.length; start += BATCH) {
    const batch = images.slice(start, start + BATCH);
    const content: OpenAI.ChatCompletionContentPart[] = [
      { type: "text", text: IMAGE_PROMPT },
      ...batch.map((b64) => ({
        type: "image_url" as const,
        image_url: { url: `data:image/png;base64,${b64}`, detail: "high" as const },
      })),
    ];
    const { bank, transactions } = await callGPT(openai, content, warnings);
    if (!detectedBank && bank) detectedBank = bank;
    allTransactions.push(...transactions);
  }

  return buildResult(allTransactions, detectedBank, warnings);
}

function buildResult(
  transactions: ParsedTransaction[],
  detectedBank: string | null,
  warnings: string[],
): PDFParseResult {
  if (transactions.length === 0) {
    warnings.push("No transactions found. This statement may not contain transaction data in a recognizable format.");
  } else if (transactions.length < 3) {
    warnings.push("Very few transactions detected. Please review the imported data.");
  }
  return {
    transactions,
    confidence: transactions.length >= 3 ? "high" : "low",
    detectedBank,
    parsingWarnings: warnings,
  };
}
