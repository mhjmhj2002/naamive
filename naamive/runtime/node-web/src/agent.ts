import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from './config.js';

export type AgentResult = { result: 'READY_FOR_GATE' | 'REQUIRES_ADJUSTMENT'; evidence: Record<string, unknown> };
const controlled = (kind: string): AgentResult => {
  const modules=['Registro de solicitações','Acompanhamento operacional'];
  if(kind==='ANALYZE_PRODUCT_NEED') return {result:'READY_FOR_GATE',evidence:{problem:'Necessidade analisada',audience:'Operador',objectives:['Visibilidade'],risks:['Adoção'],hypotheses:['Uso diário'],gaps:[],questions:[],suggested_modules:modules}};
  if(kind==='DEFINE_PRODUCT_REQUIREMENTS') return {result:'READY_FOR_GATE',evidence:{scope:['Registro e acompanhamento'],out_of_scope:['Automação externa'],requirements:['Registrar solicitação'],success_criteria:['Acompanhamento disponível'],constraints:['Conforme intake'],dependencies:[],modules}};
  return {result:process.env.NAAMIVE_CONTROLLED_REVIEW_RESULT==='REQUIRES_ADJUSTMENT'?'REQUIRES_ADJUSTMENT':'READY_FOR_GATE',evidence:{findings:[],risks:['Validar adoção'],recommendation:'Pacote pronto para decisão'}};
};
export const executeAgent = async (kind:string, context:Record<string,unknown>):Promise<AgentResult> => {
  if(config().agentAdapter==='controlled') return controlled(kind);
  const cfg=config(); if(!cfg.codexWorkdir) throw new Error('CODEX_WORKDIR_NOT_CONFIGURED');
  const workdir=await mkdtemp(join(cfg.codexWorkdir, 'naamive-')); const contextPath=join(workdir,'context.json');
  try { await writeFile(contextPath,JSON.stringify({kind,context}));
    const stdout=await new Promise<string>((resolve,reject)=>{ const child=execFile(cfg.codexCommand,['exec','--json',`@${contextPath}`],{cwd:workdir,env:{PATH:process.env.PATH}},(error,out)=>error?reject(error):resolve(out)); const timer=setTimeout(()=>{child.kill('SIGTERM'); reject(new Error('CODEX_TIMEOUT'));},cfg.agentTimeoutSeconds*1000); child.once('exit',()=>clearTimeout(timer)); });
    const messages=stdout.split('\n').flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}}).reverse(); const value=messages.find((item): item is AgentResult=>Boolean(item&&typeof item==='object'&&(item.result==='READY_FOR_GATE'||item.result==='REQUIRES_ADJUSTMENT')&&item.evidence&&typeof item.evidence==='object'));
    if(!value) throw new Error('CODEX_INVALID_EVIDENCE');
    return value;
  } finally { await rm(workdir,{recursive:true,force:true}); }
};
