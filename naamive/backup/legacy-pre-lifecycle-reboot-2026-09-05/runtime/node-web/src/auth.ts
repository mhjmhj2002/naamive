import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type pg from 'pg';
import { pool, withTransaction } from './db.js';
import { config } from './config.js';
import { ApiError } from './service.js';

const scrypt=promisify(scryptCallback);
const sessionCookie='naamive_session';
const sessionHours=Number(process.env.NAAMIVE_AUTH_SESSION_HOURS??8);
const allowedRoles=new Set(['OPERATOR','BUSINESS_INTAKE_AUTHORITY','BUSINESS_OWNER','MODULE_PRODUCT_OWNER','TECH_LEAD','REPOSITORY_OWNER','ON_CALL_OWNER','ASSURANCE_REVIEWER','CONFIGURATION_ADMIN','WORKER_SERVICE','AGENT_SERVICE']);
const allowedActions=new Set(['CREATE_PROJECT','LIST_PROJECTS','READ_PROJECT','OPERATE_PROJECT','DECIDE_CATALOG_GATE','ASSURANCE_ON_CALL','ASSURANCE_REVIEW','ASSURANCE_GATE','DELIVERY_PAUSE_RESUME','DELIVERY_CANCEL','DELIVERY_EXECUTE','ADMIN_CONFIG','WORKER_EXECUTE','AGENT_EXECUTE']);
export type AuthenticatedPrincipal={id:string;type:'HUMAN'|'SERVICE';username:string;sessionId?:string};
export type Authorization={principal:AuthenticatedPrincipal;role:string;grantId:string};
export type GrantInput={role_code:string;action_code:string;project_id?:string|null;resource_type?:string|null;resource_id?:string|null;expires_at?:string|null};

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const opaque=()=>randomBytes(32).toString('base64url');
const validUsername=(value:unknown)=>typeof value==='string'&&/^[a-z][a-z0-9-]{2,63}$/.test(value);
const validSecret=(value:unknown)=>typeof value==='string'&&value.length>=16&&value.length<=1024;
const same=(left:string,right:string)=>{const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);};
const passwordHash=async(secret:string)=>{const salt=randomBytes(16).toString('base64url');const digest=await scrypt(secret,salt,64) as Buffer;return `scrypt$${salt}$${digest.toString('base64url')}`;};
const passwordMatches=async(secret:string,stored:string)=>{const [scheme,salt,digest]=stored.split('$');if(scheme!=='scrypt'||!salt||!digest)return false;const calculated=await scrypt(secret,salt,64) as Buffer;return same(calculated.toString('base64url'),digest);};
const cookieValue=(request:IncomingMessage,name:string)=>String(request.headers.cookie??'').split(';').map(value=>value.trim()).find(value=>value.startsWith(`${name}=`))?.slice(name.length+1);
const audit=async(input:{principal?:AuthenticatedPrincipal|null;action:string;projectId?:string|null;resourceType?:string|null;resourceId?:string|null;role?:string|null;grantId?:string|null;outcome:'ALLOWED'|'DENIED'|'AUTHENTICATED'|'LOGOUT'|'BOOTSTRAP'|'ROTATED'|'REVOKED';reason:string})=>{
  await pool.query(`INSERT INTO auth_audit_records(id,principal_id,principal_type,action_code,project_id,resource_type,resource_id,role_code,grant_id,outcome,reason_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[randomUUID(),input.principal?.id??null,input.principal?.type??null,input.action,input.projectId??null,input.resourceType??null,input.resourceId??null,input.role??null,input.grantId??null,input.outcome,input.reason]);
};
const deny=async(principal:AuthenticatedPrincipal|null,action:string,projectId:string|undefined,reason:string):Promise<never>=>{await audit({principal,action,projectId,outcome:'DENIED',reason});throw new ApiError(principal?403:401,reason);};

export const bootstrapConfigured=()=>{const secret=process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET;return typeof secret==='string'&&secret.length>=32;};
export const bootstrapFirstAdministrator=async(secret:string,body:Record<string,unknown>)=>{
  if(!bootstrapConfigured()||!same(secret,process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET!))throw new ApiError(403,'AUTH_BOOTSTRAP_UNAUTHORIZED');
  if(!validUsername(body.username)||!validSecret(body.password))throw new ApiError(422,'AUTH_BOOTSTRAP_INPUT_INVALID');
  return withTransaction(async client=>{
    const existing=await client.query(`SELECT 1 FROM auth_role_grants WHERE role_code='CONFIGURATION_ADMIN' AND status='ACTIVE' LIMIT 1 FOR UPDATE`);
    if(existing.rowCount)throw new ApiError(409,'AUTH_BOOTSTRAP_ALREADY_COMPLETED');
    const principalId=randomUUID(),credentialId=randomUUID(),password=await passwordHash(String(body.password));
    await client.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`,[principalId,body.username]);
    await client.query(`INSERT INTO auth_credentials(id,principal_id,credential_type,secret_hash) VALUES($1,$2,'PASSWORD',$3)`,[credentialId,principalId,password]);
    for(const grant of [{role:'CONFIGURATION_ADMIN',action:'ADMIN_CONFIG'},{role:'OPERATOR',action:'CREATE_PROJECT'},{role:'OPERATOR',action:'LIST_PROJECTS'}])await client.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code) VALUES($1,$2,$3,$4)`,[randomUUID(),principalId,grant.role,grant.action]);
    await client.query(`INSERT INTO auth_audit_records(id,principal_id,principal_type,action_code,outcome,reason_code) VALUES($1,$2,'HUMAN','ADMIN_CONFIG','BOOTSTRAP','FIRST_ADMIN_CREATED')`,[randomUUID(),principalId]);
    return {principal_id:principalId,username:body.username};
  });
};

const issueSession=async(principal:AuthenticatedPrincipal)=>{const raw=opaque(),csrf=opaque(),id=randomUUID(),expires=new Date(Date.now()+Math.max(sessionHours,1)*3600_000);await pool.query(`INSERT INTO auth_sessions(id,principal_id,session_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,$5)`,[id,principal.id,hash(raw),hash(csrf),expires]);return {raw,csrf,expires};};
const setSessionCookie=(response:ServerResponse,raw:string,expires:Date)=>response.setHeader('set-cookie',`${sessionCookie}=${raw}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.max(1,Math.floor((expires.getTime()-Date.now())/1000))}${process.env.NAAMIVE_SESSION_SECURE==='true'?'; Secure':''}`);
const clearSessionCookie=(response:ServerResponse)=>response.setHeader('set-cookie',`${sessionCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
export const login=async(body:Record<string,unknown>,response:ServerResponse)=>{
  if(!validUsername(body.username)||typeof body.password!=='string')throw new ApiError(401,'AUTH_LOGIN_INVALID');
  const row=(await pool.query(`SELECT p.id,p.principal_type,p.username,p.status,c.secret_hash FROM auth_principals p JOIN auth_credentials c ON c.principal_id=p.id AND c.credential_type='PASSWORD' AND c.status='ACTIVE' WHERE p.username=$1`,[body.username])).rows[0];
  if(!row||row.status!=='ACTIVE'||!await passwordMatches(body.password,row.secret_hash))throw new ApiError(401,'AUTH_LOGIN_INVALID');
  const principal:AuthenticatedPrincipal={id:row.id,type:row.principal_type,username:row.username};const session=await issueSession(principal);setSessionCookie(response,session.raw,session.expires);await audit({principal,action:'AUTH_LOGIN',outcome:'AUTHENTICATED',reason:'PASSWORD_VERIFIED'});return {principal:{id:principal.id,type:principal.type,username:principal.username},csrf_token:session.csrf,expires_at:session.expires.toISOString()};
};
/**
 * Re-establishes the browser-only CSRF context for an already authenticated
 * human session. The token is never persisted by the browser: it is generated
 * afresh, only its hash is stored, and it is returned over the authenticated
 * same-origin response. This deliberately does not inspect or grant roles.
 */
export const restoreSession=async(principal:AuthenticatedPrincipal)=>{
  if(principal.type!=='HUMAN'||!principal.sessionId)throw new ApiError(403,'AUTH_SESSION_HUMAN_REQUIRED');
  const csrf=opaque();
  const session=(await pool.query(`UPDATE auth_sessions SET csrf_hash=$2 WHERE id=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp() RETURNING expires_at`,[principal.sessionId,hash(csrf)])).rows[0];
  if(!session)throw new ApiError(401,'AUTH_SESSION_INVALID');
  return {principal:{id:principal.id,type:principal.type,username:principal.username},csrf_token:csrf,expires_at:new Date(session.expires_at).toISOString()};
};
export const authenticate=async(request:IncomingMessage):Promise<AuthenticatedPrincipal>=>{
  const authorization=String(request.headers.authorization??'');
  const service=authorization.match(/^Service\s+([0-9a-f-]{36}):([A-Za-z0-9_-]{16,})$/);
  if(service){const row=(await pool.query(`SELECT p.id,p.principal_type,p.username,p.status,c.secret_hash,c.expires_at FROM auth_principals p JOIN auth_credentials c ON c.principal_id=p.id AND c.credential_type='SERVICE_SECRET' AND c.status='ACTIVE' WHERE p.id=$1`,[service[1]])).rows[0];if(!row||row.principal_type!=='SERVICE'||row.status!=='ACTIVE'||(row.expires_at&&new Date(row.expires_at)<=new Date())||!await passwordMatches(service[2],row.secret_hash))return deny(null,'AUTH_SERVICE',undefined,'AUTH_INVALID_SERVICE_CREDENTIAL');return {id:row.id,type:'SERVICE',username:row.username};}
  const raw=cookieValue(request,sessionCookie);if(!raw)return deny(null,'AUTH_SESSION',undefined,'AUTH_SESSION_REQUIRED');
  const row=(await pool.query(`SELECT s.id,p.id AS principal_id,p.principal_type,p.username,p.status FROM auth_sessions s JOIN auth_principals p ON p.id=s.principal_id WHERE s.session_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()`,[hash(raw)])).rows[0];
  if(!row||row.status!=='ACTIVE')return deny(null,'AUTH_SESSION',undefined,'AUTH_SESSION_INVALID');return {id:row.principal_id,type:row.principal_type,username:row.username,sessionId:row.id};
};
export const enforceCsrf=async(request:IncomingMessage,principal:AuthenticatedPrincipal,origin:string)=>{
  if(principal.type==='SERVICE')return;
  if(request.method==='GET'||request.method==='HEAD'||request.method==='OPTIONS')return;
  if(String(request.headers.origin??'')!==origin)throw new ApiError(403,'AUTH_CSRF_ORIGIN_INVALID');
  const token=String(request.headers['x-csrf-token']??'');if(!token)throw new ApiError(403,'AUTH_CSRF_TOKEN_REQUIRED');
  const row=(await pool.query(`SELECT csrf_hash FROM auth_sessions WHERE id=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp()`,[principal.sessionId])).rows[0];if(!row||!same(hash(token),row.csrf_hash))throw new ApiError(403,'AUTH_CSRF_TOKEN_INVALID');
};
export const logout=async(principal:AuthenticatedPrincipal,response:ServerResponse)=>{if(principal.sessionId)await pool.query(`UPDATE auth_sessions SET revoked_at=clock_timestamp() WHERE id=$1 AND revoked_at IS NULL`,[principal.sessionId]);clearSessionCookie(response);await audit({principal,action:'AUTH_LOGOUT',outcome:'LOGOUT',reason:'SESSION_REVOKED'});};
export type AuthorizationRequirement={action:string;projectId?:string;resourceType?:string;resourceId?:string;roles?:string[]};
export type AuthorizationContext={lifecycle?:string|null;gate?:string|null;recovery?:string|null;stop?:boolean;fence?:boolean};
export type AuthorizationDenyReason='AUTH_ACTION_NOT_PUBLISHED'|'AUTH_HUMAN_SERVICE_ACTION_FORBIDDEN'|'AUTH_SERVICE_HUMAN_ACTION_FORBIDDEN'|'AUTH_GRANT_DENIED';
export type AuthorizationVerdict={allowed:true;role:string;grantId:string}|{allowed:false;reason:AuthorizationDenyReason};
export type CapabilityVerdict={allowed:boolean;reason?:AuthorizationDenyReason;role?:string;grantId?:string};
// Service-only action codes (HUMAN principals can never hold or execute these).
const serviceActions=new Set([...allowedActions].filter(action=>action.endsWith('_EXECUTE')));
// Human decision/administrative action codes (SERVICE principals can never hold or execute these).
const humanOnlyActions=new Set(['DECIDE_CATALOG_GATE','ASSURANCE_ON_CALL','ASSURANCE_REVIEW','ASSURANCE_GATE','DELIVERY_PAUSE_RESUME','DELIVERY_CANCEL','ADMIN_CONFIG']);
/**
 * Single shared grant-matching rule used by both command enforcement (authorize) and read-only
 * capability discovery (resolveCapability). Evaluates action publication, HUMAN-vs-SERVICE action
 * gating, and the active grant against the principal, roles, project/resource scope and expiration,
 * all against one caller-supplied snapshot instant. `context` is an optional extension point for
 * caller-supplied lifecycle/gate/recovery/stop/fence applicability; current command enforcement
 * passes none, so existing behavior is unchanged.
 */
export const matchAuthorization=async(principal:AuthenticatedPrincipal,requirement:AuthorizationRequirement,snapshotNow:Date,_context?:AuthorizationContext,queryable:Pick<pg.PoolClient,'query'>=pool):Promise<AuthorizationVerdict>=>{
  if(!allowedActions.has(requirement.action))return {allowed:false,reason:'AUTH_ACTION_NOT_PUBLISHED'};
  if(principal.type!=='SERVICE'&&serviceActions.has(requirement.action))return {allowed:false,reason:'AUTH_HUMAN_SERVICE_ACTION_FORBIDDEN'};
  if(principal.type==='SERVICE'&&humanOnlyActions.has(requirement.action))return {allowed:false,reason:'AUTH_SERVICE_HUMAN_ACTION_FORBIDDEN'};
  const roles=requirement.roles??[];
  const params:unknown[]=[principal.id,requirement.action,requirement.projectId??null,requirement.resourceType??null,requirement.resourceId??null,snapshotNow.toISOString()];
  if(roles.length)params.push(roles);
  const result=await queryable.query(`SELECT g.id,g.role_code FROM auth_role_grants g JOIN auth_principals p ON p.id=g.principal_id WHERE g.principal_id=$1 AND p.status='ACTIVE' AND g.status='ACTIVE' AND (g.expires_at IS NULL OR g.expires_at>$6) AND g.action_code=$2 AND (($3::text IS NULL AND g.project_id IS NULL) OR ($3::text IS NOT NULL AND g.project_id=$3)) AND (g.resource_type IS NULL OR (g.resource_type=$4 AND g.resource_id=$5)) ${roles.length?'AND g.role_code=ANY($7::text[])':''} ORDER BY g.created_at LIMIT 1`,params);
  if(!result.rowCount)return {allowed:false,reason:'AUTH_GRANT_DENIED'};
  return {allowed:true,role:result.rows[0].role_code,grantId:result.rows[0].id};
};
/**
 * READ-ONLY capability discovery. Never writes auth_audit_records and never enforces via authorize();
 * it resolves the exact same grant-matching rule as command enforcement (matchAuthorization) against a
 * caller-supplied snapshot instant so expiration is evaluated against one consistent time.
 */
export const resolveCapability=async(principal:AuthenticatedPrincipal,requirement:AuthorizationRequirement,snapshotNow:Date,queryable:Pick<pg.PoolClient,'query'>=pool):Promise<CapabilityVerdict>=>{
  const verdict=await matchAuthorization(principal,requirement,snapshotNow,undefined,queryable);
  if(!verdict.allowed)return {allowed:false,reason:verdict.reason};
  return {allowed:true,role:verdict.role,grantId:verdict.grantId};
};
export const authorize=async(principal:AuthenticatedPrincipal,input:AuthorizationRequirement):Promise<Authorization>=>{
  const verdict=await matchAuthorization(principal,input,new Date());
  if(!verdict.allowed)return deny(principal,input.action,input.projectId,verdict.reason);
  const value={principal,role:verdict.role,grantId:verdict.grantId};
  await audit({principal,action:input.action,projectId:input.projectId,resourceType:input.resourceType,resourceId:input.resourceId,role:value.role,grantId:value.grantId,outcome:'ALLOWED',reason:'GRANT_MATCHED'});
  return value;
};
export const authorizeCatalogGate=async(principal:AuthenticatedPrincipal,projectId:string,gateId:string)=>{const gate=(await pool.query(`SELECT scope_type,scope_id,authority_roles FROM gate_records WHERE id=$1 AND project_id=$2`,[gateId,projectId])).rows[0];if(!gate)throw new ApiError(404,'GATE_NOT_FOUND');return authorize(principal,{action:'DECIDE_CATALOG_GATE',projectId,resourceType:String(gate.scope_type),resourceId:String(gate.scope_id),roles:Array.isArray(gate.authority_roles)?gate.authority_roles.map(String):[]});};
const validateGrant=(value:unknown):GrantInput=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiError(422,'AUTH_GRANT_INVALID');const item=value as Record<string,unknown>;if(typeof item.role_code!=='string'||!allowedRoles.has(item.role_code)||typeof item.action_code!=='string'||!allowedActions.has(item.action_code))throw new ApiError(422,'AUTH_GRANT_INVALID');if((item.resource_type===undefined)!==(item.resource_id===undefined))throw new ApiError(422,'AUTH_GRANT_SCOPE_INVALID');return {role_code:item.role_code,action_code:item.action_code,project_id:typeof item.project_id==='string'?item.project_id:null,resource_type:typeof item.resource_type==='string'?item.resource_type:null,resource_id:typeof item.resource_id==='string'?item.resource_id:null,expires_at:typeof item.expires_at==='string'?item.expires_at:null};};
export const createHumanPrincipal=async(body:Record<string,unknown>,actor:AuthenticatedPrincipal)=>{if(!validUsername(body.username)||!validSecret(body.password)||!Array.isArray(body.grants))throw new ApiError(422,'AUTH_PRINCIPAL_INPUT_INVALID');const grants=body.grants.map(validateGrant);if(grants.some(grant=>grant.role_code==='WORKER_SERVICE'||grant.role_code==='AGENT_SERVICE'))throw new ApiError(422,'AUTH_HUMAN_SERVICE_ROLE_FORBIDDEN');return withTransaction(async client=>{const id=randomUUID();await client.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`,[id,body.username]);await client.query(`INSERT INTO auth_credentials(id,principal_id,credential_type,secret_hash) VALUES($1,$2,'PASSWORD',$3)`,[randomUUID(),id,await passwordHash(String(body.password))]);for(const grant of grants)await client.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id,resource_type,resource_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[randomUUID(),id,grant.role_code,grant.action_code,grant.project_id,grant.resource_type,grant.resource_id,grant.expires_at]);return {principal_id:id,username:body.username,type:'HUMAN'};});};
export const createServicePrincipal=async(body:Record<string,unknown>)=>{if(!validUsername(body.username)||!Array.isArray(body.grants))throw new ApiError(422,'AUTH_PRINCIPAL_INPUT_INVALID');const grants=body.grants.map(validateGrant);if(!grants.length||!grants.every(g=>g.role_code==='WORKER_SERVICE'||g.role_code==='AGENT_SERVICE'))throw new ApiError(422,'AUTH_SERVICE_GRANTS_INVALID');return withTransaction(async client=>{const id=randomUUID(),secret=opaque();await client.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'SERVICE',$2)`,[id,body.username]);await client.query(`INSERT INTO auth_credentials(id,principal_id,credential_type,secret_hash,expires_at) VALUES($1,$2,'SERVICE_SECRET',$3,$4)`,[randomUUID(),id,await passwordHash(secret),typeof body.expires_at==='string'?body.expires_at:null]);for(const grant of grants)await client.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id,resource_type,resource_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[randomUUID(),id,grant.role_code,grant.action_code,grant.project_id,grant.resource_type,grant.resource_id,grant.expires_at]);return {principal_id:id,username:body.username,type:'SERVICE',credential:secret};});};
export const revokePrincipal=async(id:string,actor:AuthenticatedPrincipal)=>withTransaction(async client=>{const result=await client.query(`UPDATE auth_principals SET status='REVOKED',revoked_at=clock_timestamp(),revoked_by=$2 WHERE id=$1 AND status='ACTIVE' RETURNING principal_type`,[id,actor.id]);if(!result.rowCount)throw new ApiError(404,'AUTH_PRINCIPAL_NOT_FOUND');await client.query(`UPDATE auth_credentials SET status='REVOKED',revoked_at=clock_timestamp(),revoked_by=$2 WHERE principal_id=$1 AND status='ACTIVE'`,[id,actor.id]);await client.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp(),revoked_by=$2 WHERE principal_id=$1 AND status='ACTIVE'`,[id,actor.id]);await client.query(`UPDATE auth_sessions SET revoked_at=clock_timestamp(),revoked_by=$2 WHERE principal_id=$1 AND revoked_at IS NULL`,[id,actor.id]);return {principal_id:id,status:'REVOKED'};});
export const rotateServiceCredential=async(id:string,actor:AuthenticatedPrincipal)=>withTransaction(async client=>{const principal=(await client.query(`SELECT id FROM auth_principals WHERE id=$1 AND principal_type='SERVICE' AND status='ACTIVE' FOR UPDATE`,[id])).rows[0];if(!principal)throw new ApiError(404,'AUTH_SERVICE_NOT_FOUND');const previous=(await client.query(`UPDATE auth_credentials SET status='REVOKED',revoked_at=clock_timestamp(),revoked_by=$2 WHERE principal_id=$1 AND credential_type='SERVICE_SECRET' AND status='ACTIVE' RETURNING id`,[id,actor.id])).rows[0];const secret=opaque();await client.query(`INSERT INTO auth_credentials(id,principal_id,credential_type,secret_hash,rotated_from_id) VALUES($1,$2,'SERVICE_SECRET',$3,$4)`,[randomUUID(),id,await passwordHash(secret),previous?.id??null]);return {principal_id:id,credential:secret};});
export const configuredWorkerService=async()=>{
  const id=process.env.NAAMIVE_WORKER_SERVICE_ID,secret=process.env.NAAMIVE_WORKER_SERVICE_SECRET;
  if(!id||!secret)throw new Error('NAAMIVE_WORKER_SERVICE_ID and NAAMIVE_WORKER_SERVICE_SECRET are required for worker authentication');
  const request={headers:{authorization:`Service ${id}:${secret}`}} as IncomingMessage;
  const principal=await authenticate(request);
  const grant=await pool.query(`SELECT 1 FROM auth_role_grants WHERE principal_id=$1 AND role_code='WORKER_SERVICE' AND action_code='WORKER_EXECUTE' AND status='ACTIVE' AND (expires_at IS NULL OR expires_at>clock_timestamp()) LIMIT 1`,[principal.id]);
  if(!grant.rowCount)throw new Error('NAAMIVE_WORKER_SERVICE has no active WORKER_EXECUTE grant');
  return principal;
};
