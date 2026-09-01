import { createHash } from 'node:crypto';

export const RECOVERY_POLICY_VERSION='RECOVERY_POLICY:v1' as const;

export const RECOVERY_CAUSES=[
  'TIMEOUT_PRE_EFFECT','QUOTA_LIMIT','RATE_LIMIT','INFRA_TRANSIENT',
  'WORKER_DEAD_NO_OUTPUT','JOB_NOT_CONSUMED','WORKTREE_MISSING_NO_EVIDENCE',
  'LEASE_LOST','HANDOFF_CRASH','NO_TERMINAL_CONFIRMATION','DIRTY_WORKTREE',
  'OPERATION_UNRECORDED','COMMIT_PRESENT','EXECUTION_EVIDENCE_PRESENT',
  'DELIVERY_PRESENT','QA_FINDING_PRESENT','MERGE_TIMEOUT','PUSH_TIMEOUT',
  'MERGE_APPLIED_UNRECORDED','PUSH_APPLIED_UNRECORDED','GIT_DIVERGED',
  'INTEGRATION_DEFECT','RETRY_EXHAUSTED'
] as const;
export type RecoveryCause=typeof RECOVERY_CAUSES[number];
export type EffectCertainty='NO_EFFECT'|'EFFECT_PRESENT'|'EFFECT_UNKNOWN';
export type EvidenceFootprint='NO_EFFECT'|'EXECUTION_EVIDENCE'|'COMMIT_PRESENT'|'DELIVERY_PRESENT'|'QA_FINDING'|'DIRTY_WORKTREE'|'MERGE_EFFECT_POSSIBLE'|'PUSH_EFFECT_POSSIBLE'|'INTEGRATION_EFFECT_PRESENT';
export type RecoveryAction='RETRY'|'RESTART'|'RESUME'|'RECONCILE'|'REWORK'|'RECORD_AND_CONTINUE'|'INTEGRATION_RECOVERY';
export type WorktreeObservation='ACTIVE_BASE'|'ACTIVE_COMMIT'|'MISSING'|'DIRTY'|'DIVERGED'|'UNAVAILABLE'|'NOT_APPLICABLE';
export type IntegrationObservation='NOT_APPLIED'|'APPLIED_UNRECORDED'|'DIVERGED'|'UNAVAILABLE'|'NOT_APPLICABLE';

export type RecoverySignals={
  observedCause:RecoveryCause;
  projectId:string;
  sourceState:string;
  sourceVersion:number;
  workItemId?:string|null;
  attemptId?:string|null;
  jobId?:string|null;
  deliveryId?:string|null;
  worktreeId?:string|null;
  integrationCandidateId?:string|null;
  integrationAttemptId?:string|null;
  recoveryScopeKey?:string|null;
  jobStatus?:string|null;
  jobAttempts?:number;
  deliveryState?:string|null;
  deliveryPresent?:boolean;
  executionEvidenceRefs?:string[];
  commitRefs?:string[];
  findingRefs?:string[];
  worktreeObservation?:WorktreeObservation;
  integrationObservation?:IntegrationObservation;
  requiredAuthoritiesConclusive:boolean;
  noEffectVerified:boolean;
  retryExhausted?:boolean;
};

export type RecoveryClassification={
  policyVersion:typeof RECOVERY_POLICY_VERSION;
  cause:RecoveryCause;
  effectCertainty:EffectCertainty;
  evidenceFootprint:EvidenceFootprint[];
  selectedAction:RecoveryAction;
  reason:string;
  classificationFingerprint:string;
};

const transient=new Set<RecoveryCause>(['TIMEOUT_PRE_EFFECT','QUOTA_LIMIT','RATE_LIMIT','INFRA_TRANSIENT']);
const lostProcess=new Set<RecoveryCause>(['WORKER_DEAD_NO_OUTPUT','JOB_NOT_CONSUMED','WORKTREE_MISSING_NO_EVIDENCE','RETRY_EXHAUSTED']);
const unknownFirst=new Set<RecoveryCause>(['LEASE_LOST','HANDOFF_CRASH','NO_TERMINAL_CONFIRMATION','DIRTY_WORKTREE','OPERATION_UNRECORDED','MERGE_TIMEOUT','PUSH_TIMEOUT']);
const sorted=(values:string[])=>[...new Set(values)].sort();
const fingerprint=(signals:RecoverySignals,certainty:EffectCertainty,footprint:EvidenceFootprint[],action:RecoveryAction)=>createHash('sha256').update(JSON.stringify({
  policy:RECOVERY_POLICY_VERSION,cause:signals.observedCause,certainty,footprint:sorted(footprint),action,
  resource:signals.workItemId??signals.integrationCandidateId,attempt:signals.attemptId??signals.integrationAttemptId,
  job:signals.jobId,delivery:signals.deliveryId,worktree:signals.worktreeId,sourceState:signals.sourceState,
  sourceVersion:signals.sourceVersion,evidence:sorted([...(signals.executionEvidenceRefs??[]),...(signals.commitRefs??[])]),findings:sorted(signals.findingRefs??[]),
  worktreeObservation:signals.worktreeObservation,integrationObservation:signals.integrationObservation,
  recoveryScopeKey:signals.recoveryScopeKey??null
})).digest('hex');

const classified=(signals:RecoverySignals,certainty:EffectCertainty,footprint:EvidenceFootprint[],action:RecoveryAction,reason:string):RecoveryClassification=>({
  policyVersion:RECOVERY_POLICY_VERSION,cause:signals.observedCause,effectCertainty:certainty,evidenceFootprint:sorted(footprint) as EvidenceFootprint[],selectedAction:action,reason,
  classificationFingerprint:fingerprint(signals,certainty,footprint,action)
});

/** Pure RECOVERY_POLICY:v1 classifier. It accepts only observations assembled
 * by server-side collectors and never performs an effect. */
export class RecoveryClassifier {
  classify(signals:RecoverySignals):RecoveryClassification {
    const footprint:EvidenceFootprint[]=[];
    if(signals.deliveryPresent)footprint.push('DELIVERY_PRESENT');
    if((signals.executionEvidenceRefs??[]).length)footprint.push('EXECUTION_EVIDENCE');
    if((signals.commitRefs??[]).length||signals.worktreeObservation==='ACTIVE_COMMIT')footprint.push('COMMIT_PRESENT');
    if((signals.findingRefs??[]).length)footprint.push('QA_FINDING');
    if(signals.worktreeObservation==='DIRTY')footprint.push('DIRTY_WORKTREE');
    if(signals.observedCause==='MERGE_TIMEOUT')footprint.push('MERGE_EFFECT_POSSIBLE');
    if(signals.observedCause==='PUSH_TIMEOUT')footprint.push('PUSH_EFFECT_POSSIBLE');
    if(signals.integrationCandidateId&&unknownFirst.has(signals.observedCause)&&!footprint.length)footprint.push('MERGE_EFFECT_POSSIBLE');

    // Unknown-effect causes must first produce a durable observation-only
    // decision, even if the collector already obtained a quick read. The
    // executor repeats that read after the decision commit and converges.
    if(unknownFirst.has(signals.observedCause)){
      return classified(signals,'EFFECT_UNKNOWN',footprint.length?footprint:['DELIVERY_PRESENT'],'RECONCILE','O resultado do efeito não possui confirmação terminal; reconciliar fontes autoritativas antes de repetir.');
    }

    if(signals.integrationObservation==='APPLIED_UNRECORDED'){
      footprint.push('INTEGRATION_EFFECT_PRESENT');
      return classified(signals,'EFFECT_PRESENT',footprint,'RECORD_AND_CONTINUE','A fonte Git confirmou o efeito remoto sem o registro local; registrar e continuar sem reaplicar.');
    }
    if(signals.integrationObservation==='DIVERGED'||signals.observedCause==='GIT_DIVERGED'||signals.observedCause==='INTEGRATION_DEFECT'){
      footprint.push('INTEGRATION_EFFECT_PRESENT');
      return classified(signals,'EFFECT_PRESENT',footprint,'INTEGRATION_RECOVERY','Git ou a integração confirmou divergência/defeito; retry genérico é proibido.');
    }
    if((signals.findingRefs??[]).length){
      return classified(signals,'EFFECT_PRESENT',footprint,'REWORK','Findings pertinentes e produto existente exigem correção com lineage preservado.');
    }
    if((signals.commitRefs??[]).length||signals.worktreeObservation==='ACTIVE_COMMIT'){
      return classified(signals,'EFFECT_PRESENT',footprint,'RESUME','Commit auditável existente deve ser preservado e retomado no próximo passo seguro.');
    }
    if((signals.executionEvidenceRefs??[]).length){
      return classified(signals,'EFFECT_PRESENT',footprint,'RESUME','Evidência de execução existente deve ser preservada; a execução não pode ser repetida.');
    }

    // Absence is accepted only when every required authority was conclusive.
    // A RESERVED delivery is merely retained in the footprint as a signal.
    if(!signals.requiredAuthoritiesConclusive||!signals.noEffectVerified){
      return classified(signals,'EFFECT_UNKNOWN',footprint.length?footprint:['DELIVERY_PRESENT'],'RECONCILE','Uma fonte autoritativa está indisponível ou inconclusiva; ausência de evidência não prova ausência de efeito.');
    }

    const absent:EvidenceFootprint[]=footprint.filter(item=>item==='DELIVERY_PRESENT');absent.push('NO_EFFECT');
    if(signals.retryExhausted||signals.observedCause==='RETRY_EXHAUSTED'){
      return classified({...signals,observedCause:'RETRY_EXHAUSTED'},'NO_EFFECT',absent,'RESTART','A política persistida de retry foi esgotada sem efeito; iniciar nova attempt pela AUT-01.');
    }
    if(transient.has(signals.observedCause)){
      return classified(signals,'NO_EFFECT',absent,'RETRY','Causa transitória comprovadamente sem efeito; reutilizar job e reservation existentes dentro do limite.');
    }
    if(lostProcess.has(signals.observedCause)||signals.observedCause==='DELIVERY_PRESENT'){
      return classified(signals,'NO_EFFECT',absent,'RESTART','Processo terminal não retomável e ausência de efeito comprovada; nova attempt deve passar pela AUT-01.');
    }
    return classified(signals,'EFFECT_UNKNOWN',footprint.length?footprint:['DELIVERY_PRESENT'],'RECONCILE','A política não possui prova suficiente para repetição segura; reconciliar antes de decidir.');
  }
}
