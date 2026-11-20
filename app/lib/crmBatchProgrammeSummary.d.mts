export type CrmProgramme = "Math" | "AiEdge" | "Coding4AI";
export interface CrmBatchForSummary { course_name:string; status:string }
export declare const CRM_BATCH_PROGRAMMES:readonly CrmProgramme[];
export declare function crmBatchProgramme(courseName:string|null|undefined):CrmProgramme|"Other";
export declare function crmBatchProgrammeSummary(batches:CrmBatchForSummary[]):{
  counts:Record<CrmProgramme,number>;
  other:number;
  active:number;
};
export declare function crmFilteredBatches<T extends CrmBatchForSummary>(batches:T[],selectedProgramme:string):T[];

export declare function crmSearchBatches<T extends {
  id:string;
  batch_name?:string|null;
  course_name?:string|null;
  trainer_name?:string|null;
  status?:string|null;
}>(batches:T[],search:string|null|undefined,studentNamesByBatch?:Map<string,string[]>):T[];
