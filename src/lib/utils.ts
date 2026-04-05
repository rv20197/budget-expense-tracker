import Decimal from "decimal.js";

export function toDecimal(value: Decimal.Value) {
  return new Decimal(value);
}

export function toMoneyString(value: Decimal.Value) {
  return toDecimal(value).toFixed(2);
}

export function formatCurrency(value: Decimal.Value, currency = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(toDecimal(value).toNumber());
}

export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function getMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => ({
    label: formatMonthYear(index + 1, 2026).split(" ")[0],
    value: String(index + 1),
  }));
}

export function getCurrentMonthYear() {
  const today = new Date();
  return {
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
}

export function generateRandomHexColor() {
  const value = Math.floor(Math.random() * 0xffffff);
  return `#${value.toString(16).padStart(6, "0")}`;
}

export function startOfMonth(month: number, year: number) {
  return new Date(year, month - 1, 1);
}

export function endOfMonth(month: number, year: number) {
  return new Date(year, month, 0);
}

export function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addMonthsClamped(date: Date, monthsToAdd: number) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const targetMonthDate = new Date(year, month + monthsToAdd + 1, 0);
  const lastDayOfTargetMonth = targetMonthDate.getDate();

  return new Date(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth(),
    Math.min(day, lastDayOfTargetMonth),
  );
}

export function addYearsClamped(date: Date, yearsToAdd: number) {
  const targetYear = date.getFullYear() + yearsToAdd;
  const month = date.getMonth();
  const day = date.getDate();
  const lastDay = new Date(targetYear, month + 1, 0).getDate();

  return new Date(targetYear, month, Math.min(day, lastDay));
}
