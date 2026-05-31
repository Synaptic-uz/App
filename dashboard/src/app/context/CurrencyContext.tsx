import React, { createContext, useContext, useEffect, useState } from 'react';

export type Currency = 'UZS' | 'USD' | 'EUR' | 'RUB';

interface CurrencyRate {
  Ccy: string;
  Rate: string;
  Nominal: string;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<string, number>;
  convert: (amount: number, from: Currency, to: Currency) => number;
  format: (amount: number, c?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(
    (localStorage.getItem('synaptic_currency') as Currency) || 'UZS'
  );
  const [rates, setRates] = useState<Record<string, number>>({ UZS: 1 });

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('https://cbu.uz/ru/arkhiv-kursov-valyut/json/');
        const data: CurrencyRate[] = await res.json();
        const newRates: Record<string, number> = { UZS: 1 };
        data.forEach((item) => {
          if (['USD', 'EUR', 'RUB'].includes(item.Ccy)) {
            newRates[item.Ccy] = parseFloat(item.Rate) / parseFloat(item.Nominal);
          }
        });
        setRates(newRates);
      } catch (err) {
        console.error('Failed to fetch rates', err);
        // Fallback to approximate rates if API fails
        setRates({
          UZS: 1,
          USD: 12600,
          EUR: 13700,
          RUB: 140,
        });
      }
    }
    fetchRates();
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('synaptic_currency', c);
  };

  const convert = (amount: number, from: Currency, to: Currency) => {
    if (from === to) return amount;
    const uzsAmount = amount * (rates[from] || 1);
    return uzsAmount / (rates[to] || 1);
  };

  const format = (amount: number, c?: Currency) => {
    const activeCurrency = c || currency;
    const value = convert(amount, 'UZS', activeCurrency);
    
    if (value > 1e12) return `${value.toExponential(2)} ${activeCurrency}`;
    
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: activeCurrency,
      minimumFractionDigits: activeCurrency === 'UZS' ? 0 : 2,
      maximumFractionDigits: activeCurrency === 'UZS' ? 0 : 2,
    }).format(value).replace('$', 'USD').replace('€', 'EUR').replace('₽', 'RUB'); 
    // Intl.NumberFormat might use symbols, but we want custom labels sometimes or just normalized ones.
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
