export interface FxPayment {currency:string;amount_received:number;voided_at:string|null}
export interface RevenueEquivalent {usd:number;inr:number;receipts:number}
export declare const CONVERTIBLE_CURRENCIES:readonly string[];
export declare function validateUsdFxRates(rates:Record<string,number>|null|undefined):boolean;
export declare function monthlyRevenueEquivalent(
  payments:FxPayment[],usdBaseRates:Record<string,number>|null|undefined
):RevenueEquivalent|null;
