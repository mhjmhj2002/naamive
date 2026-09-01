/* Utilitário exclusivo de testes de integração: sem bypass. Ele persiste a
 * mesma sessão opaca e os mesmos grants que o servidor valida em produção. */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { pool } from './db.js';
import type { GrantInput } from './auth.js';

export const testAuthenticatedHeaders=async(projectId:string,grants:GrantInput[])=>{
  const principalId=randomUUID(),username=`test-auth-${randomUUID().slice(0,12)}`,raw=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');
  await pool.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`,[principalId,username]);
  await pool.query(`INSERT INTO auth_sessions(id,principal_id,session_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+interval '1 hour')`,[randomUUID(),principalId,createHash('sha256').update(raw).digest('hex'),createHash('sha256').update(csrf).digest('hex')]);
  for(const grant of grants)await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id,resource_type,resource_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[randomUUID(),principalId,grant.role_code,grant.action_code,Object.hasOwn(grant,'project_id')?grant.project_id:projectId,grant.resource_type??null,grant.resource_id??null,grant.expires_at??null]);
  return {headers:{cookie:`naamive_session=${raw}`,'x-csrf-token':csrf,origin:process.env.NAAMIVE_WEB_ORIGIN??'http://127.0.0.1:3000'},cleanup:async()=>{try{await pool.query(`DELETE FROM auth_sessions WHERE principal_id=$1`,[principalId]);await pool.query(`DELETE FROM auth_role_grants WHERE principal_id=$1`,[principalId]);await pool.query(`DELETE FROM auth_principals WHERE id=$1`,[principalId]);}catch{/* o teste já encerrou o pool; nenhum dado de produção é tocado. */}}};
};
