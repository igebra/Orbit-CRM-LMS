export type PaymentCurrency = "USD"|"INR"|"AED"|"SGD"|"THB"|"AUD"|"NZD";
export interface PaymentCurrencyOption {
  code:PaymentCurrency;symbol:string;country:string;name:string;locale:string;
}
export interface PaymentRowForTotals {
  currency:string;amount_received:number;voided_at:string|null;
}
export declare const PAYMENT_CURRENCIES:readonly PaymentCurrencyOption[];
export declare function currencySymbol(currency:string):string;
export declare function currencyOptionLabel(option:PaymentCurrencyOption):string;
export declare function formatPaymentAmount(value:number,currency:string):string;
export declare function sumPaymentsByCurrency(payments:PaymentRowForTotals[]):Record<string,number>;
