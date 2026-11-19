export interface CrmWorkloadTrainer {id:string;trainer_name:string;linked_user_id?:string|null}
export interface CrmWorkloadBatch {id:string;batch_name?:string|null;course_name?:string|null;status:string|null;trainer_id?:string|null;trainer_user_id?:string|null}
export interface CrmBatchAssignment {batch_id:string;trainer_id?:string|null;trainer_user_id?:string|null;is_active:boolean;assigned_from?:string|null;assigned_to?:string|null}
export interface CrmWorkloadBatchSummary {id:string;batch_name:string;course_name:string}
export interface CrmTrainerWorkload {byTrainer:Record<string,CrmWorkloadBatchSummary[]>;totalActiveBatches:number;assignedActiveBatches:number}
export declare function buildTrainerBatchWorkload(trainers:CrmWorkloadTrainer[],batches:CrmWorkloadBatch[],assignments?:CrmBatchAssignment[],asOfDay?:string):CrmTrainerWorkload;
export declare function workloadMatches(count:number,filter:string):boolean;
export declare function sortTrainersByWorkload<T extends CrmWorkloadTrainer>(trainers:T[],byTrainer:Record<string,CrmWorkloadBatchSummary[]>,sortBy?:string):T[];
