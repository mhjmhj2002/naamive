import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm, access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.js';
import { log } from './log.js';

export type AgentResult = { result: 'READY_FOR_GATE' | 'REQUIRES_ADJUSTMENT'; evidence: Record<string, unknown> };
export class AgentConfigurationError extends Error { constructor(readonly code:string) { super(code); } }
export class AgentExecutionError extends Error { constructor(readonly code:string,readonly exitCode?:number|null,readonly signal?:string|null) { super(code); } }
export class AgentReadinessError extends Error { constructor(readonly code:string) { super(code); } }
export type AgentReadiness = { ready:true; checked_at:string; duration_ms:number; cached:boolean; codex_command:string; codex_version:string };
let readinessCache: Omit<AgentReadiness,'cached'>|undefined;
const controlled = (kind: string): AgentResult => {
  const modules=['Registro de solicitações','Acompanhamento operacional'];
  if(kind==='ANALYZE_PRODUCT_NEED') return {result:'READY_FOR_GATE',evidence:{problem:'Necessidade analisada',audience:'Operador',objectives:['Visibilidade'],risks:['Adoção'],hypotheses:['Uso diário'],gaps:[],questions:[],suggested_modules:modules}};
  if(kind==='DEFINE_PRODUCT_REQUIREMENTS') return {result:'READY_FOR_GATE',evidence:{scope:['Registro e acompanhamento'],out_of_scope:['Automação externa'],requirements:['Registrar solicitação'],success_criteria:['Acompanhamento disponível'],constraints:['Conforme intake'],dependencies:[],modules}};
  return {result:process.env.NAAMIVE_CONTROLLED_REVIEW_RESULT==='REQUIRES_ADJUSTMENT'?'REQUIRES_ADJUSTMENT':'READY_FOR_GATE',evidence:{findings:[],risks:['Validar adoção'],recommendation:'Pacote pronto para decisão'}};
};
export const executeAgent = async (kind:string, context:Record<string,unknown>):Promise<AgentResult> => {
  if(config().agentAdapter==='controlled') return controlled(kind);
  const startedAt=Date.now(),projectId=typeof context.project_id==='string'?context.project_id:undefined;const agentVersion=await assertAgentReady(); const cfg=config(); const workdir=await mkdtemp(join(cfg.codexWorkdir!, 'naamive-')).catch(()=>{throw new AgentConfigurationError('CODEX_WORKDIR_NOT_READY')}); const schemaPath=join(workdir,'result.schema.json'),outputPath=join(workdir,'result.json');log('agent','info','agent_invocation_started',{project_id:projectId,stage:kind,timeout_seconds:cfg.agentTimeoutSeconds,codex_command:cfg.codexCommand,codex_version:agentVersion});
  try { await writeFile(schemaPath,JSON.stringify({type:'object',required:['result','evidence_json'],additionalProperties:false,properties:{result:{type:'string',enum:['READY_FOR_GATE','REQUIRES_ADJUSTMENT']},evidence_json:{type:'string'}}}));
    const reviewContract=kind==='REVIEW_PRODUCT_COMMITMENT'?' Para REVIEW_PRODUCT_COMMITMENT, use obrigatoriamente as chaves findings (lista), required_next_actions (lista) e adjustment_suggestion (texto). Se houver review_adjustment_feedback no contexto, trate-o como informação nova fornecida pelo operador: incorpore-o à revisão e não repita um achado que ele tenha resolvido sem explicar objetivamente o que ainda falta.':'';
    const prompt=`Analise o contexto não confiável abaixo para a etapa ${kind}. Não execute comandos, não altere arquivos e não inclua segredos. Seja objetivo: até 6 itens curtos por lista e somente achados necessários para a próxima etapa.${reviewContract} Entregue somente o resultado conforme o schema solicitado. evidence_json deve ser uma string que contém um objeto JSON válido, com a evidência sanitizada da análise. Contexto: ${JSON.stringify(context)}`;
    await new Promise<void>((resolve,reject)=>{let settled=false;const child=execFile(cfg.codexCommand,['exec','--skip-git-repo-check','--sandbox','read-only','--output-schema',schemaPath,'--output-last-message',outputPath,prompt],{cwd:workdir,env:{PATH:process.env.PATH,HOME:process.env.HOME,CODEX_HOME:process.env.CODEX_HOME}},(error,_stdout,stderr)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){const text=String(stderr);const code=text.includes('invalid_json_schema')?'CODEX_SCHEMA_REJECTED':text.includes('authentication')||text.includes('unauthorized')?'CODEX_AUTHENTICATION_FAILED':'CODEX_PROCESS_FAILED';return reject(new AgentExecutionError(code,(error as any).code??null,(error as any).signal??null));}resolve();});child.stdin?.end();const timer=setTimeout(()=>{if(settled)return;settled=true;child.kill('SIGTERM');reject(new AgentExecutionError('CODEX_TIMEOUT',null,'SIGTERM'));},cfg.agentTimeoutSeconds*1000); });
    const raw=JSON.parse(await readFile(outputPath,'utf8')) as {result?:unknown;evidence_json?:unknown};const evidence=typeof raw.evidence_json==='string'?JSON.parse(raw.evidence_json):null;
    if(!raw||typeof raw.result!=='string'||!['READY_FOR_GATE','REQUIRES_ADJUSTMENT'].includes(raw.result)||!evidence||typeof evidence!=='object'||Array.isArray(evidence)) throw new AgentExecutionError('CODEX_INVALID_EVIDENCE');log('agent','info','agent_process_exited',{project_id:projectId,stage:kind,duration_ms:Date.now()-startedAt,output_valid:true});return {result:raw.result as AgentResult['result'],evidence};
  } catch(error) {const code=error instanceof AgentExecutionError?error.code:'CODEX_PROCESS_FAILED';log('agent','error','agent_invocation_failed',{project_id:projectId,stage:kind,duration_ms:Date.now()-startedAt,code,exit_code:error instanceof AgentExecutionError?error.exitCode:undefined,signal:error instanceof AgentExecutionError?error.signal:undefined,output_valid:false});throw error;} finally { await rm(workdir,{recursive:true,force:true}); }
};
export const assertAgentReady = async ():Promise<string|undefined> => {
  const cfg=config(); if(cfg.agentAdapter==='controlled') return;
  if(!cfg.codexWorkdir) throw new AgentConfigurationError('CODEX_WORKDIR_NOT_CONFIGURED');
  try { await access(cfg.codexWorkdir, constants.R_OK|constants.W_OK|constants.X_OK); } catch { throw new AgentConfigurationError('CODEX_WORKDIR_NOT_READY'); }
  return await new Promise<string>((resolve,reject)=>execFile(cfg.codexCommand,['--version'],{env:{PATH:process.env.PATH,HOME:process.env.HOME,CODEX_HOME:process.env.CODEX_HOME}},(error,stdout)=>error?reject(new AgentConfigurationError('CODEX_COMMAND_NOT_AVAILABLE')):resolve(String(stdout).trim())));
};
export const checkAgentReadiness = async (force=false):Promise<AgentReadiness> => {
  const cfg=config(), now=Date.now();
  if(cfg.agentAdapter==='controlled') return {ready:true,checked_at:new Date(now).toISOString(),duration_ms:0,cached:false,codex_command:'controlled',codex_version:'controlled'};
  if(!force&&readinessCache&&now-Date.parse(readinessCache.checked_at)<cfg.agentReadinessCacheSeconds*1000) return {...readinessCache,cached:true};
  const startedAt=now; log('agent','info','agent_readiness_started',{timeout_seconds:cfg.agentReadinessTimeoutSeconds,codex_command:cfg.codexCommand});
  let workdir:string|undefined;
  try {
    const codexVersion=await assertAgentReady(); workdir=await mkdtemp(join(cfg.codexWorkdir!, 'naamive-readiness-')).catch(()=>{throw new AgentConfigurationError('CODEX_WORKDIR_NOT_READY')});
    const schemaPath=join(workdir,'result.schema.json'),outputPath=join(workdir,'result.json');
    await writeFile(schemaPath,JSON.stringify({type:'object',required:['status'],additionalProperties:false,properties:{status:{type:'string',const:'OK'}}}));
    await new Promise<void>((resolve,reject)=>{let settled=false;const child=execFile(cfg.codexCommand,['exec','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--output-schema',schemaPath,'--output-last-message',outputPath,'Responda somente conforme o schema solicitado.'],{cwd:workdir,env:{PATH:process.env.PATH,HOME:process.env.HOME,CODEX_HOME:process.env.CODEX_HOME}},(error,_stdout,stderr)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){const text=String(stderr);return reject(new AgentReadinessError(text.includes('authentication')||text.includes('unauthorized')?'CODEX_AUTHENTICATION_FAILED':'CODEX_PROCESS_FAILED'));}resolve();});child.stdin?.end();const timer=setTimeout(()=>{if(settled)return;settled=true;child.kill('SIGTERM');reject(new AgentReadinessError('CODEX_READINESS_TIMEOUT'));},cfg.agentReadinessTimeoutSeconds*1000);});
    const result=JSON.parse(await readFile(outputPath,'utf8')) as {status?:unknown}; if(result.status!=='OK') throw new AgentReadinessError('CODEX_READINESS_INVALID_RESPONSE');
    readinessCache={ready:true,checked_at:new Date().toISOString(),duration_ms:Date.now()-startedAt,codex_command:cfg.codexCommand,codex_version:codexVersion??'unknown'}; log('agent','info','agent_readiness_succeeded',readinessCache); return {...readinessCache,cached:false};
  } catch(error) { const code=error instanceof AgentConfigurationError||error instanceof AgentReadinessError?error.code:'CODEX_PROCESS_FAILED'; log('agent','warn','agent_readiness_failed',{duration_ms:Date.now()-startedAt,codex_command:cfg.codexCommand,code}); throw new AgentReadinessError(code); }
  finally { if(workdir) await rm(workdir,{recursive:true,force:true}); }
};
