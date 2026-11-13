export interface CrmTimeZone {value:string;label:string}
export interface CrmCountry {name:string;code:string;label?:string}
export declare const CRM_PARTNERS:readonly string[];
export declare const CRM_TIME_ZONES:readonly CrmTimeZone[];
export declare const CRM_TRAINER_TIME_ZONES:readonly CrmTimeZone[];
export declare const CRM_LEAD_COUNTRIES:readonly CrmCountry[];
export declare function isCrmTimeZone(value:string|null|undefined):boolean;
export declare function timeZoneLabel(value:string|null|undefined):string;
