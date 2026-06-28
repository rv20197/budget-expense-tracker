import OpenAI from "openai";

export type CategoryOption = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export type CategorizationInput = {
  description: string;
  type: "debit" | "credit";
};

export type CategorizationResult = {
  categoryId: string;
  merchantName: string;
  confidence: number;
};

// Keyword map: exact category name (lowercase) → keywords that match it
const KEYWORD_MAP: Record<string, string[]> = {
  groceries: ["zepto", "blinkit", "avenue supermarts", "dmart", "bigbasket", "grofers", "reliance fresh", "more supermarket", "nature's basket", "supermarket"],
  shopping:  ["amazon", "asspl", "flipkart", "myntra", "ajio", "nykaa", "meesho", "snapdeal", "gpay", "google pay", "g pay"],
  fastfood:  ["zomato", "swiggy", "mcdonalds", "mcdonald", "kfc", "dominos", "domino", "pizza", "burger", "subway", "dunzo", "starbucks", "cafe coffee day"],
  "e-apps":  ["netflix", "prime video", "hotstar", "disney", "spotify", "youtube premium", "zee5", "sonyliv", "apple music"],
  mobile:    ["bharti air", "airtel", "jio", "vodafone", "vi ", "bsnl", "tata docomo", "mobile recharge", "postpaid"],
  food:      ["pt foods", "oziva", "restaurant", "hotel", "dhaba", "mess", "tiffin", "bakery", "cafe"],
  salary:    ["salary", "sal ", "wages", "payroll", "neft cr", "imps cr", "rtgs cr"],
  freelance: ["freelance", "consulting", "professional fee"],
};

function keywordFallback(
  inputs: CategorizationInput[],
  categories: CategoryOption[],
  fallbackCategoryId: string,
): CategorizationResult[] {
  return inputs.map((input) => {
    const lower = input.description.toLowerCase();

    // Try to match keyword map against available category names
    for (const [keyFragment, keywords] of Object.entries(KEYWORD_MAP)) {
      const matched = keywords.some((kw) => lower.includes(kw));
      if (!matched) continue;

        const expectedType = input.type === "credit" ? "income" : "expense";
      const cat =
        categories.find((c) => c.name.toLowerCase() === keyFragment && c.type === expectedType) ??
        categories.find((c) => c.name.toLowerCase() === keyFragment);

      if (cat) {
        return {
          categoryId: cat.id,
          merchantName: extractMerchantName(input.description),
          confidence: 0.7,
        };
      }
    }

    // No keyword match — use fallback category
    return {
      categoryId: fallbackCategoryId,
      merchantName: extractMerchantName(input.description),
      confidence: 0.3,
    };
  });
}

function extractMerchantName(description: string): string {
  // Strip common banking noise: ref numbers, dates, UPI IDs
  return description
    .replace(/\b(UPI|NEFT|IMPS|RTGS|NACH|ECS|ATM)\b[-\/]?/gi, "")
    .replace(/\b\d{6,}\b/g, "") // Remove long reference numbers
    .replace(/\b[A-Z0-9]+@[A-Z0-9]+\b/gi, "") // Remove UPI handles
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 100);
}

type AICategorizationItem = {
  index: number;
  categoryId: string;
  merchantName: string;
  confidence: number;
};

async function categorizeBatchWithAI(
  batch: CategorizationInput[],
  batchOffset: number,
  categories: CategoryOption[],
  client: OpenAI,
): Promise<(AICategorizationItem | null)[]> {
  const inputPayload = batch.map((t, i) => ({
    index: batchOffset + i,
    description: t.description,
    transactionType: t.type,
  }));

  const categoryList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content:
          "You are a transaction categorizer for an Indian personal finance app. Given transaction descriptions and available categories, return a JSON array only with no markdown wrapping.",
      },
      {
        role: "user",
        content: `Categorize these transactions:\n${JSON.stringify(inputPayload)}\n\nAvailable categories:\n${JSON.stringify(categoryList)}\n\nReturn JSON array: [{"index": 0, "categoryId": "uuid", "merchantName": "clean merchant name", "confidence": 0.9}]\nRules:\n- Pick the most appropriate categoryId from the available list\n- merchantName should be a clean, short merchant name (no reference numbers)\n- confidence is 0-1 (1 = very confident)\n- Match income transactions to income categories, expense to expense`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  // Extract JSON array from response, handling potential markdown code blocks
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return batch.map(() => null);

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AICategorizationItem[];
    return parsed;
  } catch {
    return batch.map(() => null);
  }
}

export async function categorizeTransactions(
  inputs: CategorizationInput[],
  categories: CategoryOption[],
): Promise<CategorizationResult[]> {
  if (inputs.length === 0) return [];

  // Prefer "Others" as fallback; otherwise first expense category
  const fallbackCategory =
    categories.find((c) => c.name.toLowerCase() === "others" && c.type === "expense") ??
    categories.find((c) => c.type === "expense") ??
    categories[0];
  const fallbackCategoryId = fallbackCategory?.id ?? "";

  if (!fallbackCategoryId) {
    // No categories at all — return empty merchant names with empty categoryId
    return inputs.map((input) => ({
      categoryId: "",
      merchantName: extractMerchantName(input.description),
      confidence: 0,
    }));
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No API key — use keyword fallback
    return keywordFallback(inputs, categories, fallbackCategoryId);
  }

  const client = new OpenAI({ apiKey });
  const BATCH_SIZE = 25;
  const results: CategorizationResult[] = new Array(inputs.length);

  // Process in batches of 25
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);

    let aiItems: (AICategorizationItem | null)[] = [];
    try {
      aiItems = await categorizeBatchWithAI(batch, i, categories, client);
    } catch {
      // AI call failed — fall back to keyword matching for this batch
      const fallbacks = keywordFallback(batch, categories, fallbackCategoryId);
      for (let j = 0; j < batch.length; j++) {
        results[i + j] = fallbacks[j];
      }
      continue;
    }

    // Map AI results back, filling gaps with keyword fallback
    for (let j = 0; j < batch.length; j++) {
      const aiItem = aiItems.find((item) => item?.index === i + j);

      if (aiItem && categories.some((c) => c.id === aiItem.categoryId)) {
        results[i + j] = {
          categoryId: aiItem.categoryId,
          merchantName: aiItem.merchantName || extractMerchantName(batch[j].description),
          confidence: Math.max(0, Math.min(1, aiItem.confidence)),
        };
      } else {
        // AI returned invalid categoryId or null — keyword fallback for this item
        const [fb] = keywordFallback([batch[j]], categories, fallbackCategoryId);
        results[i + j] = fb;
      }
    }
  }

  return results;
}
