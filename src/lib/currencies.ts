export const CURRENCY_COOKIE_NAME = "currency_pref";
export const DEFAULT_CURRENCY = "INR";

export type CurrencyConfig = {
  code: string;
  symbol: string;
  name: string;
  unitSingular: string;
  unitPlural: string;
  subunitSingular: string;
  subunitPlural: string;
  system: "indian" | "standard";
};

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    name: "INR (₹) - Indian Rupee",
    unitSingular: "Rupee",
    unitPlural: "Rupees",
    subunitSingular: "Paisa",
    subunitPlural: "Paise",
    system: "indian",
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "USD ($) - US Dollar",
    unitSingular: "Dollar",
    unitPlural: "Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "standard",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "EUR (€) - Euro",
    unitSingular: "Euro",
    unitPlural: "Euros",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "standard",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "GBP (£) - British Pound",
    unitSingular: "Pound",
    unitPlural: "Pounds",
    subunitSingular: "Penny",
    subunitPlural: "Pence",
    system: "standard",
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    name: "AED (د.إ) - UAE Dirham",
    unitSingular: "Dirham",
    unitPlural: "Dirhams",
    subunitSingular: "Fils",
    subunitPlural: "Fils",
    system: "standard",
  },
  CAD: {
    code: "CAD",
    symbol: "$",
    name: "CAD ($) - Canadian Dollar",
    unitSingular: "Dollar",
    unitPlural: "Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "standard",
  },
  AUD: {
    code: "AUD",
    symbol: "$",
    name: "AUD ($) - Australian Dollar",
    unitSingular: "Dollar",
    unitPlural: "Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "standard",
  },
  SGD: {
    code: "SGD",
    symbol: "$",
    name: "SGD ($) - Singapore Dollar",
    unitSingular: "Dollar",
    unitPlural: "Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "standard",
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "JPY (¥) - Japanese Yen",
    unitSingular: "Yen",
    unitPlural: "Yen",
    subunitSingular: "Sen",
    subunitPlural: "Sen",
    system: "standard",
  },
};
