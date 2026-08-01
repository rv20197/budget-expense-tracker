"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CURRENCY_COOKIE_NAME,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyConfig,
} from "./currencies";

export {
  CURRENCY_COOKIE_NAME,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyConfig,
};

type CurrencyContextType = {
  currency: string;
  setCurrency: (code: string) => void;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
});

let globalClientCurrency = DEFAULT_CURRENCY;

export function getClientCurrency(): string {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${CURRENCY_COOKIE_NAME}=([^;]*)`),
    );
    if (match && SUPPORTED_CURRENCIES[decodeURIComponent(match[1])]) {
      return decodeURIComponent(match[1]);
    }
  }
  return globalClientCurrency;
}

export function CurrencyProvider({
  initialCurrency,
  children,
}: {
  initialCurrency?: string;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<string>(() => {
    return initialCurrency && SUPPORTED_CURRENCIES[initialCurrency]
      ? initialCurrency
      : getClientCurrency();
  });

  useEffect(() => {
    globalClientCurrency = currency;
  }, [currency]);

  const setCurrency = (code: string) => {
    if (!SUPPORTED_CURRENCIES[code]) return;
    setCurrencyState(code);
    globalClientCurrency = code;
    document.cookie = `${CURRENCY_COOKIE_NAME}=${code}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
