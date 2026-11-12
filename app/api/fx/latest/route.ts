import { NextResponse } from "next/server";
import { CONVERTIBLE_CURRENCIES, validateUsdFxRates } from "../../../lib/monthlyRevenueFx.mjs";

/** Public reference rates only. No student, payment or authorization data is returned.
 * Source permits commercial conversion and caching, but requires visible attribution.
 */
export const runtime = "nodejs";
export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Exchange-rate provider is unavailable");
    const payload=await response.json();
    if (payload?.result!=="success" || payload?.base_code!=="USD"
      || !validateUsdFxRates(payload.rates)
      || !Number.isFinite(payload.time_last_update_unix)) {
      throw new Error("Invalid exchange-rate response");
    }
    const now=Math.floor(Date.now()/1000);
    if (payload.time_last_update_unix > now+3600 ||
      now-payload.time_last_update_unix > 4*86400) {
      throw new Error("Exchange-rate data is stale");
    }
    const rates=Object.fromEntries(CONVERTIBLE_CURRENCIES.map(code=>[code,payload.rates[code]]));
    return NextResponse.json({
      base:"USD",
      rates,
      updatedAt:new Date(payload.time_last_update_unix*1000).toISOString(),
      source:"ExchangeRate-API",
    },{headers:{"Cache-Control":"public, max-age=0, s-maxage=3600"}});
  } catch {
    return NextResponse.json(
      {error:"Latest exchange rates are temporarily unavailable. Revenue equivalents are hidden."},
      {status:503,headers:{"Cache-Control":"no-store"}}
    );
  }
}
