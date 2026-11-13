/** CRM controlled lists: preserve existing stored values and historical lead data. */
export const CRM_PARTNERS = Object.freeze([
  "Shiva Chidara",
  "Chandra Shekar",
  "Satya Prakash",
  "Srini Vemula",
  "Chiranjeevi M",
  "Venkat M",
]);

export const CRM_TIME_ZONES = Object.freeze([
  {value:"America/New_York",label:"US Eastern"},
  {value:"America/Chicago",label:"US Central"},
  {value:"America/Denver",label:"US Mountain"},
  {value:"America/Los_Angeles",label:"US Pacific"},
  {value:"Asia/Kolkata",label:"India IST"},
  {value:"Asia/Bangkok",label:"Thailand · Bangkok (ICT)"},
  {value:"Pacific/Auckland",label:"New Zealand · Auckland (NZST/NZDT)"},
  {value:"Australia/Sydney",label:"Australia · Sydney / Melbourne (AEST/AEDT)"},
  {value:"Australia/Brisbane",label:"Australia · Brisbane (AEST)"},
  {value:"Australia/Perth",label:"Australia · Perth (AWST)"},
  {value:"Australia/Adelaide",label:"Australia · Adelaide (ACST/ACDT)"},
  {value:"Europe/Copenhagen",label:"Denmark · Copenhagen (CET/CEST)"},
  {value:"Asia/Dubai",label:"Dubai · UAE (GST)"},
]);

/** Trainer records historically store display labels for the original US/India zones. */
export const CRM_TRAINER_TIME_ZONES = Object.freeze([
  ...["US Eastern","US Central","US Mountain","US Pacific","India IST"].map(v=>({value:v,label:v})),
  ...CRM_TIME_ZONES.slice(5),
  {value:"Other",label:"Other"},
]);

export const CRM_LEAD_COUNTRIES = Object.freeze([
  {name:"United States",code:"+1"},
  {name:"Canada",code:"+1"},
  {name:"Australia",code:"+61"},
  {name:"New Zealand",code:"+64"},
  {name:"United Kingdom",code:"+44"},
  {name:"Denmark",code:"+45"},
  {name:"India",code:"+91"},
  {name:"UAE",code:"+971",label:"UAE / Dubai"},
  {name:"Saudi Arabia",code:"+966"},
  {name:"Qatar",code:"+974"},
  {name:"Kuwait",code:"+965"},
  {name:"Bahrain",code:"+973"},
  {name:"Oman",code:"+968"},
  {name:"Singapore",code:"+65"},
  {name:"Malaysia",code:"+60"},
  {name:"Thailand",code:"+66"},
  {name:"Indonesia",code:"+62"},
  {name:"Philippines",code:"+63"},
  {name:"Hong Kong",code:"+852"},
]);

export function isCrmTimeZone(value) {
  return CRM_TIME_ZONES.some(zone=>zone.value===value);
}

export function timeZoneLabel(value) {
  return CRM_TIME_ZONES.find(zone=>zone.value===value)?.label||value||"Not specified";
}
