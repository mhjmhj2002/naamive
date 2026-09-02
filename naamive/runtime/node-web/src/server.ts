import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ApiError, applyReviewAdjustments, archiveProject, bindRepository, createProject, listProjects, projectDetail, projectTimeline, retryProductDiscovery, saveIntake, startProductDiscovery, submitIntake } from './service.js';
import { checkAgentReadiness, AgentReadinessError, AgentConfigurationError } from './agent.js';
import { pool, withTransaction } from './db.js';
import { putArtifact } from './artifacts.js';
import { randomUUID } from 'node:crypto';
import { transitionTarget } from './workflow.js';
import { log } from './log.js';
import { approveModulePlan, archiveIntegration, authorizeRework, authorizeWorkItem, completeDefinition, createCandidate, decideArchitecture, decideModule, decideReworkGate, materializationBaselineOptions, materializeModule, mergeWorkItemToPhase, phase3Detail, reconcileDevelopmentWorktree, reconcileIntegrationAttempt, resolveExternalBlocker, restartDevelopmentOrchestration, revalidateCandidate, retryDevelopmentWorkItem, retryIntegration, startDevelopment, startIntegration, startModuleRevision, submitQa, supersedeCandidate, validateCandidate } from './phase3.js';
import { requestPlanAdjustment, retryModulePlan } from './module-planning.js';
import { AgentRuntimeAdminError, listRuntimeCatalogue, publishAgentExecutionPolicy, publishAssurancePolicy, registerRuntime, validateRuntime } from './agent-execution-admin.js';
import { agentExecutionService } from './agent-execution-service.js';
import { decideTechnologyBaseline, submitTechnologyBaseline } from './baseline-gate.js';
import { startTechnologyBaselineRevision } from './baseline-revision.js';
import { createTechnologyBaselineRevision, listTechnologyCatalogItems, listTechnologyCategories, listTechnologyProfiles, requestTechnologyInventory, technologyBaseline, technologyCatalogRevision, technologyProfile, technologySelectionContext } from './technology-api.js';
import { developmentRuntime, reconcileDevelopmentRuntime } from './development-runtime.js';
import { reconcileEligibilityScheduler } from './eligibility-scheduler.js';
import { runtimeHealth, startRuntimeProcess } from './runtime-process.js';
import { AssuranceError, assuranceProjection, cancelAcceptance, createAssistanceProposal, createIndependentReview, decideReview, recordHumanGate, reconcileAcceptance, transitionBlock } from './assurance.js';
import { catalogGateProjection, decideCatalogGate, publishedGateCatalog } from './gate-catalog.js';
import { authenticate, authorize, authorizeCatalogGate, bootstrapFirstAdministrator, createHumanPrincipal, createServicePrincipal, enforceCsrf, login, logout, revokePrincipal, rotateServiceCredential, type AuthenticatedPrincipal } from './auth.js';
import { buildStateActionProjection } from './state-action-projection.js';
import { reconcileCauseAwareRecovery, requestIntegrationRecovery, requestWorkItemRecovery } from './recovery.js';
import { decideProductCommitmentGate, productCommitmentProjection } from './product-commitment.js';
import { activateV4DiscoveryAfterRegistration, reconcileMacroLifecycle } from './macro-lifecycle.js';
import { reconcileAutomaticAssuranceIntegration } from './automatic-assurance-integration.js';
import { cancelResource, decideDeliveryAcceptance, deliveryLifecycleProjection, markExternalEffectInFlight, markExternalEffectUnknown, materializeDeliveryPackage, openDeliveryAcceptanceGate, pauseResource, persistDeliveryPreparationOutputs, prepareDeliveryPackage, recordTechnicalAcceptance, reconcileDeliveryLifecycle, resumeResource } from './delivery-lifecycle.js';
const settings = config(); const staticRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const bootstrapCss = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css');
const projectionRefreshScript = join(staticRoot, 'projection-refresh.js');
const actionPayloadScript = join(staticRoot, 'action-payload.js');
const json = async (request: IncomingMessage) => JSON.parse(await new Promise<string>((resolve, reject) => { let body=''; request.on('data', (chunk) => body += chunk); request.on('end', () => resolve(body || '{}')); request.on('error', reject); }));
const respond = (response: ServerResponse, status: number, body: object) => { response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': settings.webOrigin }); response.end(JSON.stringify(body)); };
const uuidParameter=(value:string|null,code:string)=>{if(value!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new ApiError(422,code);return value;};
const assertAssuranceScope = async (projectId: string, resource: 'acceptance'|'review'|'block', id: string) => {
  const sql = resource === 'acceptance'
    ? `SELECT 1 FROM work_acceptances WHERE id=$1 AND project_id=$2`
    : resource === 'review'
      ? `SELECT 1 FROM assurance_reviews r JOIN work_acceptances a ON a.id=r.acceptance_id WHERE r.id=$1 AND a.project_id=$2`
      : `SELECT 1 FROM work_blocks WHERE id=$1 AND project_id=$2`;
  if (!(await pool.query(sql, [id, projectId])).rowCount) throw new ApiError(404, 'ASSURANCE_RESOURCE_NOT_FOUND');
};
const decide = async (projectId: string, body: Record<string, unknown>, actor: AuthenticatedPrincipal) => withTransaction(async (client) => {
  const gate = await client.query(`SELECT * FROM gates WHERE project_id=$1 AND status='OPEN' FOR UPDATE`, [projectId]);
  if(!gate.rowCount){
    const replay=(await client.query(`SELECT * FROM gates WHERE id=$1 AND project_id=$2 FOR UPDATE`,[body.gate_id,projectId])).rows[0];
    if(!replay||replay.kind!=='REGISTER_PROJECT'||replay.status!=='APPROVED'||body.decision!=='APPROVED'||Number(body.version)!==replay.version)throw new ApiError(409,'GATE_NOT_OPEN');
    const automaticDiscovery=await activateV4DiscoveryAfterRegistration(client,projectId,replay.revision_id);
    const state=(await client.query(`SELECT state FROM projects WHERE id=$1`,[projectId])).rows[0]?.state;
    return {project_id:projectId,state:automaticDiscovery?.state??state};
  }
  const row=gate.rows[0];
  if (body.gate_id !== row.id) throw new ApiError(409, 'GATE_VERSION_CONFLICT');
  if (Number(body.version) !== row.version) throw new ApiError(409, 'GATE_VERSION_CONFLICT');
  const approved = body.decision === 'APPROVED', feedback=typeof body.feedback === 'string' ? body.feedback.trim() : '';
  if (!approved && !feedback) throw new ApiError(422, 'GATE_FEEDBACK_REQUIRED');
  if (!approved && body.decision !== 'REJECTED') throw new ApiError(422, 'GATE_DECISION_INVALID');
  const correlation=randomUUID(); const product=row.kind==='PRODUCT_COMMITMENT'; await putArtifact(client, projectId, product?'product-commitment-decision':'gate-decision', JSON.stringify({ schema_version:1,decision: body.decision, feedback, version: row.version, evidence:row.evidence }), undefined, row.id);
  const target = await transitionTarget(client, projectId, product ? (approved?'PRODUCT_COMMITMENT_APPROVED':'PRODUCT_COMMITMENT_ADJUSTMENTS_REQUESTED') : (approved ? 'REGISTER_PROJECT_APPROVED' : 'REGISTER_PROJECT_REJECTED'));
  await client.query(`UPDATE gates SET status=$2,decided_at=now() WHERE id=$1`, [row.id, approved ? 'APPROVED' : 'REJECTED']); await client.query(`UPDATE projects SET state=$2 WHERE id=$1`, [projectId, target]);
  const automaticDiscovery=!product&&approved?await activateV4DiscoveryAfterRegistration(client,projectId,row.revision_id):null;
  const workflow=(await client.query(`SELECT workflow_code,workflow_version FROM projects WHERE id=$1`,[projectId])).rows[0]; const prepare=product&&approved&&target==='TECHNOLOGY_SELECTION_PREPARING'&&workflow.workflow_code==='PROJECT_DISCOVERY'&&workflow.workflow_version===3;
  if(product&&(!approved||prepare)){const operationId=randomUUID(),jobId=randomUUID(),approvedKind=prepare?'PREPARE_TECHNOLOGY_SELECTION_CONTEXT':'PRODUCT_DISCOVERY';await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version) VALUES($1,$2,$3,'QUEUED',$4,$5,$6,$7,$8)`,[operationId,projectId,approvedKind,prepare?`selection-context:${row.id}:${row.version}`:`rework:${row.id}:${row.version}`,correlation,row.revision_id,prepare?workflow.workflow_code:null,prepare?workflow.workflow_version:null]);await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)`,[jobId,operationId,projectId,row.revision_id,prepare?'PREPARE_TECHNOLOGY_SELECTION_CONTEXT':'DEFINE_PRODUCT_REQUIREMENTS',prepare?`selection-context:${operationId}`:`rework-requirements:${operationId}`]);}
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,$2,$3,$4,$5)`, [projectId, product?(approved?'PRODUCT_COMMITMENT_APPROVED':'PRODUCT_COMMITMENT_ADJUSTMENTS_REQUESTED'):(approved ? 'PROJECT_REGISTERED' : 'GATE_REJECTED'), correlation, { gate_id: row.id,feedback,automatic_discovery_intent_id:automaticDiscovery?.intentId??null }, actor.id]); return { project_id: projectId, state: automaticDiscovery?.state??target };
});
export const createApiServer = () => createServer(async (request, response) => { try {
  const url = new URL(request.url ?? '/', settings.webOrigin);
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'access-control-allow-origin': settings.webOrigin, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key,x-csrf-token,last-event-id,authorization' }); return response.end(); }
  if (request.method === 'POST' && url.pathname === '/api/auth/bootstrap') {
    if(String(request.headers.origin??'')!==settings.webOrigin) throw new ApiError(403,'AUTH_CSRF_ORIGIN_INVALID');
    return respond(response,201,await bootstrapFirstAdministrator(String(request.headers['x-naamive-bootstrap-secret']??''),await json(request)));
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    if(String(request.headers.origin??'')!==settings.webOrigin) throw new ApiError(403,'AUTH_CSRF_ORIGIN_INVALID');
    return respond(response,200,await login(await json(request),response));
  }
  const publicRoute=request.method==='GET'&&['/','/projection-refresh.js','/action-payload.js','/assets/bootstrap.min.css','/health/runtime'].includes(url.pathname);
  let principal:AuthenticatedPrincipal|undefined;
  if(!publicRoute) {
    principal=await authenticate(request);
    await enforceCsrf(request,principal,settings.webOrigin);
  }
  const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(intake|submit|decision|events|start-discovery|retry-discovery|apply-review-adjustments|archive))?$/);
  const phase3Match = url.pathname.match(/^\/api\/projects\/([^/]+)\/modules(?:\/([^/]+)(?:\/(decision|work-items|definition|architecture|plan|revision|plan-adjustment|retry-plan))?)?$/);
  const workItemMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/work-items\/([^/]+)\/(development|restart-development|retry-development|qa|rework|rework-decision|merge|reconcile|recovery|resolve-external-blocker)$/);
  const developmentRuntimeMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/work-items\/([^/]+)\/development-runtime$/);
  const candidateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/integration-candidates\/([^/]+)\/(validate|revalidate|supersede|integrate|retry|reconcile|recovery|escalate|archive)$/);
  const deliveryMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/delivery(?:\/(prepare|projection|pause|cancel|packages\/([^/]+)\/(outputs|materialize|technical-acceptance|gate)|gates\/([^/]+)\/decision|pauses\/([^/]+)\/resume|external-effects\/([^/]+)\/(start|unknown)))?$/);
  const moduleLifecycleMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/modules\/([^/]+)\/lifecycle\/(pause|cancel)$/);
  const baselineMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baselines\/([^/]+)\/(submit|decision)$/);
  const baselineRevisionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/revisions\/([^/]+)\/start-revision$/);
  const technologyCatalogRevisionMatch = url.pathname.match(/^\/api\/technology\/catalog-revisions\/([^/]+)$/);
  const technologyProfileMatch = url.pathname.match(/^\/api\/technology\/profiles\/([^/]+)$/);
  const technologyBaselineRootMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline$/);
  const technologySelectionContextMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/selection-context$/);
  const technologyInventoryMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/inventory$/);
  const technologyBaselineRevisionsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/revisions$/);
  const technologyBaselineDecisionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/decision$/);
  const materializationBaselineMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/materialization-options$/);
  const runtimeValidateMatch = url.pathname.match(/^\/api\/admin\/ai-runtimes\/([^/]+)\/validate$/);
  const assuranceMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assurance$/);
  const assuranceModuleMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/modules\/([^/]+)\/assurance$/);
  const assuranceWorkItemMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/work-items\/([^/]+)\/assurance$/);
  const assuranceEventsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assurance\/events$/);
  const assuranceReviewMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assurance\/acceptances\/([^/]+)\/reviews$/);
  const assuranceDecisionMatch = url.pathname.match(/^\/api\/projects\/[^/]+\/assurance\/reviews\/([^/]+)\/decision$/);
  const assuranceBlockMatch = url.pathname.match(/^\/api\/projects\/[^/]+\/assurance\/blocks\/([^/]+)$/);
  const assuranceProposalMatch = url.pathname.match(/^\/api\/projects\/[^/]+\/assurance\/blocks\/([^/]+)\/proposals$/);
  const assuranceGateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assurance\/gates$/);
  const assuranceCancelMatch = url.pathname.match(/^\/api\/projects\/[^/]+\/assurance\/acceptances\/([^/]+)\/cancel$/);
  const assuranceReconcileMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assurance\/acceptances\/([^/]+)\/reconcile$/);
  const catalogGateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/catalog-gates$/);
  const catalogGateDecisionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/catalog-gates\/([^/]+)\/decision$/);
  const productCommitmentMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/product-commitments$/);
  const stateActionProjectionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/projection$/);
  const authAdminPrincipalMatch=url.pathname.match(/^\/api\/admin\/auth\/principals\/([0-9a-f-]{36})\/revoke$/);
  const authAdminServiceMatch=url.pathname.match(/^\/api\/admin\/auth\/service-principals\/([0-9a-f-]{36})\/rotate$/);
  if (request.method==='POST' && url.pathname==='/api/auth/logout') { await logout(principal!,response); return respond(response,204,{}); }
  if (request.method==='GET' && url.pathname==='/api/auth/me') return respond(response,200,{principal:{id:principal!.id,type:principal!.type,username:principal!.username}});
  if (request.method==='POST' && url.pathname==='/api/admin/auth/principals') { await authorize(principal!,{action:'ADMIN_CONFIG',roles:['CONFIGURATION_ADMIN']}); return respond(response,201,await createHumanPrincipal(await json(request),principal!)); }
  if (request.method==='POST' && url.pathname==='/api/admin/auth/service-principals') { await authorize(principal!,{action:'ADMIN_CONFIG',roles:['CONFIGURATION_ADMIN']}); return respond(response,201,await createServicePrincipal(await json(request))); }
  if (authAdminPrincipalMatch && request.method==='POST') { await authorize(principal!,{action:'ADMIN_CONFIG',roles:['CONFIGURATION_ADMIN']}); return respond(response,200,await revokePrincipal(authAdminPrincipalMatch[1],principal!)); }
  if (authAdminServiceMatch && request.method==='POST') { await authorize(principal!,{action:'ADMIN_CONFIG',roles:['CONFIGURATION_ADMIN']}); return respond(response,200,await rotateServiceCredential(authAdminServiceMatch[1],principal!)); }
  if (request.method==='POST' && url.pathname==='/api/internal/worker/authorize') { const body=await json(request); await authorize(principal!,{action:'WORKER_EXECUTE',projectId:typeof body.project_id==='string'?body.project_id:undefined,resourceType:typeof body.resource_type==='string'?body.resource_type:undefined,resourceId:typeof body.resource_id==='string'?body.resource_id:undefined,roles:['WORKER_SERVICE']}); return respond(response,204,{}); }
  if (!publicRoute && url.pathname==='/api/projects') await authorize(principal!,{action:request.method==='GET'?'LIST_PROJECTS':'CREATE_PROJECT',roles:['OPERATOR']});
  const scopedProject=/^\/api\/projects\/([^/]+)/.exec(url.pathname)?.[1];
  if(scopedProject && !catalogGateDecisionMatch && !deliveryMatch && !moduleLifecycleMatch && !stateActionProjectionMatch) {
    const assurancePath=url.pathname.includes('/assurance/');
    if(assurancePath && request.method==='POST') {
      const action=url.pathname.includes('/reviews/')&&url.pathname.endsWith('/decision')?'ASSURANCE_REVIEW':url.pathname.endsWith('/gates')?'ASSURANCE_GATE':'ASSURANCE_ON_CALL';
      const roles=action==='ASSURANCE_REVIEW'?['ASSURANCE_REVIEWER']:action==='ASSURANCE_GATE'?['TECH_LEAD','REPOSITORY_OWNER']:['ON_CALL_OWNER'];
      await authorize(principal!,{action,projectId:scopedProject,roles});
    } else await authorize(principal!,{action:request.method==='GET'?'READ_PROJECT':'OPERATE_PROJECT',projectId:scopedProject,roles:['OPERATOR']});
  }
  if(url.pathname.startsWith('/api/admin/')&&!url.pathname.startsWith('/api/admin/auth/')) await authorize(principal!,{action:'ADMIN_CONFIG',roles:['CONFIGURATION_ADMIN']});
  if (request.method === 'POST' && url.pathname === '/api/projects') return respond(response, 201, await createProject(await json(request),principal!));
  if (request.method === 'GET' && url.pathname === '/api/projects') return respond(response, 200, { items: await listProjects(url.searchParams.get('archived')==='true') });
  if (request.method === 'GET' && url.pathname === '/api/gate-catalog') return respond(response, 200, await publishedGateCatalog());
  if (deliveryMatch) {
    const projectId=deliveryMatch[1],action=deliveryMatch[2],packageId=deliveryMatch[3],packageAction=deliveryMatch[4],gateId=deliveryMatch[5],pauseId=deliveryMatch[6],effectId=deliveryMatch[7],effectAction=deliveryMatch[8];
    if(request.method==='GET'&&(!action||action==='projection')) { await authorize(principal!,{action:'READ_PROJECT',projectId,roles:['OPERATOR','ON_CALL_OWNER','BUSINESS_OWNER']}); return respond(response,200,await deliveryLifecycleProjection(projectId)); }
    const body=await json(request),key=request.headers['idempotency-key']?.toString()?.trim(); if(!key)throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');
    if(action==='pause'&&request.method==='POST'){const auth=await authorize(principal!,{action:'DELIVERY_PAUSE_RESUME',projectId,resourceType:'PROJECT',resourceId:projectId,roles:['ON_CALL_OWNER']});return respond(response,202,await pauseResource('PROJECT',projectId,projectId,{reason:String(body.reason??''),evidence:body.evidence,actor_id:principal!.id,authority_role:auth.role,idempotency_key:key}));}
    if(action==='cancel'&&request.method==='POST'){const auth=await authorize(principal!,{action:'DELIVERY_CANCEL',projectId,resourceType:'PROJECT',resourceId:projectId,roles:['BUSINESS_OWNER']});return respond(response,202,await cancelResource('PROJECT',projectId,projectId,{reason:String(body.reason??''),evidence:body.evidence,actor_id:principal!.id,authority_role:auth.role,idempotency_key:key}));}
    if(action==='prepare'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await prepareDeliveryPackage(projectId,key));}
    if(action?.startsWith('packages/')&&packageAction==='outputs'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await persistDeliveryPreparationOutputs(packageId,body));}
    if(action?.startsWith('packages/')&&packageAction==='materialize'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await materializeDeliveryPackage(packageId));}
    if(action?.startsWith('packages/')&&packageAction==='technical-acceptance'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await recordTechnicalAcceptance(packageId,{assurance_dispatch_snapshot_id:typeof body.assurance_dispatch_snapshot_id==='string'?body.assurance_dispatch_snapshot_id:undefined,work_acceptance_id:typeof body.work_acceptance_id==='string'?body.work_acceptance_id:undefined}));}
    if(action?.startsWith('packages/')&&packageAction==='gate'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await openDeliveryAcceptanceGate(packageId));}
    if(action?.startsWith('gates/')&&gateId&&request.method==='POST'){const auth=await authorize(principal!,{action:'DECIDE_CATALOG_GATE',projectId,resourceType:'PROJECT',resourceId:projectId,roles:['BUSINESS_OWNER']});if(body.decision!=='APPROVE'&&body.decision!=='REWORK')throw new ApiError(422,'GATE_DECISION_NOT_ALLOWED');return respond(response,202,await decideDeliveryAcceptance(projectId,gateId,{version:Number(body.version),decision:body.decision,reason:String(body.reason??''),evidence:body.evidence,actor_id:principal!.id,actor_role:auth.role,idempotency_key:key}));}
    if(action?.startsWith('pauses/')&&pauseId&&request.method==='POST'){const pause=(await pool.query(`SELECT resource_kind,resource_id FROM pause_records WHERE id=$1 AND project_id=$2`,[pauseId,projectId])).rows[0];if(!pause)throw new ApiError(404,'PAUSE_NOT_FOUND');const auth=await authorize(principal!,{action:'DELIVERY_PAUSE_RESUME',projectId,resourceType:pause.resource_kind,resourceId:pause.resource_id,roles:['ON_CALL_OWNER']});return respond(response,202,await resumeResource(pauseId,{expected_pause_version:Number(body.expected_pause_version),evidence:body.evidence,actor_id:principal!.id,authority_role:auth.role,idempotency_key:key}));}
    if(action?.startsWith('external-effects/')&&effectAction==='start'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await markExternalEffectInFlight({project_id:projectId,resource_kind:body.resource_kind==='MODULE'?'MODULE':'PROJECT',resource_id:String(body.resource_id??projectId),effect_key:key,target:body.target}));}
    if(action?.startsWith('external-effects/')&&effectAction==='unknown'&&request.method==='POST'){await authorize(principal!,{action:'DELIVERY_EXECUTE',projectId,roles:['AGENT_SERVICE','WORKER_SERVICE']});return respond(response,202,await markExternalEffectUnknown(effectId,body.evidence));}
  }
  if (moduleLifecycleMatch && request.method==='POST') {
    const [,projectId,moduleId,command]=moduleLifecycleMatch,body=await json(request),key=request.headers['idempotency-key']?.toString()?.trim();if(!key)throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');
    if(command==='pause'){const auth=await authorize(principal!,{action:'DELIVERY_PAUSE_RESUME',projectId,resourceType:'MODULE',resourceId:moduleId,roles:['ON_CALL_OWNER']});return respond(response,202,await pauseResource('MODULE',projectId,moduleId,{reason:String(body.reason??''),evidence:body.evidence,actor_id:principal!.id,authority_role:auth.role,idempotency_key:key}));}
    const auth=await authorize(principal!,{action:'DELIVERY_CANCEL',projectId,resourceType:'MODULE',resourceId:moduleId,roles:['BUSINESS_OWNER']});return respond(response,202,await cancelResource('MODULE',projectId,moduleId,{reason:String(body.reason??''),evidence:body.evidence,actor_id:principal!.id,authority_role:auth.role,idempotency_key:key,obligation_resolution:body.obligation_resolution}));
  }
  if (request.method === 'GET' && url.pathname === '/health/runtime') { const health=await runtimeHealth(); return respond(response,health.healthy?200:503,health); }
  if (developmentRuntimeMatch && request.method === 'GET') return respond(response,200,await developmentRuntime(developmentRuntimeMatch[1],developmentRuntimeMatch[2]));
  if (request.method === 'GET' && url.pathname === '/api/technology/categories') return respond(response, 200, await listTechnologyCategories());
  if (request.method === 'GET' && url.pathname === '/api/technology/catalog-items') return respond(response, 200, await listTechnologyCatalogItems(url.searchParams.get('category_id'), url.searchParams.get('status')));
  if (technologyCatalogRevisionMatch && request.method === 'GET') return respond(response, 200, await technologyCatalogRevision(technologyCatalogRevisionMatch[1]));
  if (request.method === 'GET' && url.pathname === '/api/technology/profiles') return respond(response, 200, await listTechnologyProfiles(url.searchParams.get('status')));
  if (technologyProfileMatch && request.method === 'GET') return respond(response, 200, await technologyProfile(technologyProfileMatch[1]));
  if (request.method === 'GET' && url.pathname === '/api/admin/ai-runtimes') return respond(response, 200, { items: await listRuntimeCatalogue() });
  const assuranceOptions=async(projectId:string)=>{const roles=(await pool.query(`SELECT role_code FROM auth_role_grants WHERE principal_id=$1 AND project_id=$2 AND status='ACTIVE' AND (expires_at IS NULL OR expires_at>clock_timestamp()) AND role_code IN ('ON_CALL_OWNER','ASSURANCE_REVIEWER','TECH_LEAD','REPOSITORY_OWNER') ORDER BY CASE role_code WHEN 'ON_CALL_OWNER' THEN 1 WHEN 'ASSURANCE_REVIEWER' THEN 2 WHEN 'TECH_LEAD' THEN 3 ELSE 4 END LIMIT 1`,[principal!.id,projectId])).rows[0];return {correlationId:uuidParameter(url.searchParams.get('correlation_id'),'ASSURANCE_CORRELATION_INVALID'),limit:Number(url.searchParams.get('limit')??100),actorRole:roles?.role_code??''};};
  if (catalogGateMatch && request.method === 'GET') { const projection:any=await catalogGateProjection(catalogGateMatch[1]); for(const gate of projection.gates.filter((item:any)=>item.status==='OPEN'))try{const grant=await authorizeCatalogGate(principal!,catalogGateMatch[1],gate.id);gate.allowed_actions=['DECIDE_GATE'];gate.authorized_role=grant.role;}catch{} return respond(response,200,projection); }
  if (productCommitmentMatch && request.method === 'GET') return respond(response,200,await productCommitmentProjection(productCommitmentMatch[1]));
  if (catalogGateDecisionMatch && request.method === 'POST') {
    const idempotencyKey=request.headers['idempotency-key']?.toString()?.trim();
    if(!idempotencyKey) throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');
    const authorization=await authorizeCatalogGate(principal!,catalogGateDecisionMatch[1],catalogGateDecisionMatch[2]); const body=await json(request);
    const input={version:Number(body.version),decision:String(body.decision??''),reason:String(body.reason??''),evidence:body.evidence,actor_id:principal!.id,actor_role:authorization.role,idempotency_key:idempotencyKey};
    const gateCode=(await pool.query(`SELECT gate_code FROM gate_records WHERE id=$1 AND project_id=$2`,[catalogGateDecisionMatch[2],catalogGateDecisionMatch[1]])).rows[0]?.gate_code;
    return respond(response,202,gateCode==='PRODUCT_COMMITMENT'?await decideProductCommitmentGate(catalogGateDecisionMatch[1],catalogGateDecisionMatch[2],input):await withTransaction(client=>decideCatalogGate(client,catalogGateDecisionMatch[1],catalogGateDecisionMatch[2],input)));
  }
  if (assuranceMatch && request.method === 'GET') return respond(response,200,await assuranceProjection(assuranceMatch[1],url.searchParams.get('cursor'),url.searchParams.get('state'),url.searchParams.get('category'),await assuranceOptions(assuranceMatch[1])));
  if (assuranceModuleMatch && request.method === 'GET') return respond(response,200,await assuranceProjection(assuranceModuleMatch[1],url.searchParams.get('cursor'),url.searchParams.get('state'),url.searchParams.get('category'),{...(await assuranceOptions(assuranceModuleMatch[1])),targetType:'module',targetId:uuidParameter(assuranceModuleMatch[2],'ASSURANCE_MODULE_ID_INVALID')}));
  if (assuranceWorkItemMatch && request.method === 'GET') return respond(response,200,await assuranceProjection(assuranceWorkItemMatch[1],url.searchParams.get('cursor'),url.searchParams.get('state'),url.searchParams.get('category'),{...(await assuranceOptions(assuranceWorkItemMatch[1])),targetType:'work_item',targetId:uuidParameter(assuranceWorkItemMatch[2],'ASSURANCE_WORK_ITEM_ID_INVALID')}));
  if (assuranceEventsMatch && request.method === 'GET') {
    /* assurance-sse/v1 has an event id cursor, ascending ordering and is fed
     * only by the already-redacted assurance audit projection. Reconnects are
     * read-only: replay never creates a decision or another dispatch. */
    response.writeHead(200, {'content-type':'text/event-stream','cache-control':'no-cache, no-transform','connection':'keep-alive','access-control-allow-origin':settings.webOrigin,'x-assurance-stream-version':'1'});
    const requested=Number(request.headers['last-event-id'] ?? url.searchParams.get('cursor') ?? 0);
    let cursor=Number.isSafeInteger(requested)&&requested>0?requested:0, closed=false, polling=false;
    const publish=async()=>{ if(polling||closed)return; polling=true; try {
      const projection=await assuranceProjection(assuranceEventsMatch[1],String(cursor),null,null,{limit:200});
      for(const item of projection.timeline){ if(closed)return; cursor=Number(item.id); response.write(`id: ${item.id}\nevent: assurance\ndata: ${JSON.stringify(item)}\n\n`); }
    } finally { polling=false; } };
    await publish(); const timer=setInterval(()=>void publish(),750), heartbeat=setInterval(()=>{if(!closed)response.write(': assurance-sse/v1\n\n');},15000);
    request.on('close',()=>{closed=true;clearInterval(timer);clearInterval(heartbeat);}); return;
  }
  if (assuranceReviewMatch && request.method === 'POST') { await assertAssuranceScope(assuranceReviewMatch[1],'acceptance',assuranceReviewMatch[2]); const body=await json(request); return respond(response,202,await createIndependentReview(assuranceReviewMatch[2],body.producer as any,body.candidate as any,body.review_package,typeof body.independence_gate_id==='string'?body.independence_gate_id:undefined)); }
  if (assuranceDecisionMatch && request.method === 'POST') { const projectId=url.pathname.split('/')[3]; await assertAssuranceScope(projectId,'review',assuranceDecisionMatch[1]); const body=await json(request); return respond(response,202,await decideReview(assuranceDecisionMatch[1],body.decision as any,body.evidence,request.headers['idempotency-key']?.toString()??randomUUID())); }
  if (assuranceBlockMatch && request.method === 'POST') { const projectId=url.pathname.split('/')[3]; await assertAssuranceScope(projectId,'block',assuranceBlockMatch[1]); const body=await json(request); return respond(response,202,await transitionBlock(assuranceBlockMatch[1],String(body.state??''),body.resolution,request.headers['idempotency-key']?.toString()??randomUUID())); }
  if (assuranceProposalMatch && request.method === 'POST') { const projectId=url.pathname.split('/')[3]; await assertAssuranceScope(projectId,'block',assuranceProposalMatch[1]); return respond(response,202,await createAssistanceProposal(assuranceProposalMatch[1],await json(request),principal!.id,request.headers['idempotency-key']?.toString()??randomUUID())); }
  if (assuranceGateMatch && request.method === 'POST') { const auth=await authorize(principal!,{action:'ASSURANCE_GATE',projectId:assuranceGateMatch[1],roles:['TECH_LEAD','REPOSITORY_OWNER']}); return respond(response,202,await recordHumanGate(assuranceGateMatch[1],await json(request),principal!.id,auth.role,request.headers['idempotency-key']?.toString()??randomUUID())); }
  if (assuranceCancelMatch && request.method === 'POST') { const projectId=url.pathname.split('/')[3]; await assertAssuranceScope(projectId,'acceptance',assuranceCancelMatch[1]); return respond(response,202,await cancelAcceptance(assuranceCancelMatch[1],await json(request),request.headers['idempotency-key']?.toString()??randomUUID())); }
  if (assuranceReconcileMatch && request.method === 'POST') { await assertAssuranceScope(assuranceReconcileMatch[1],'acceptance',assuranceReconcileMatch[2]); return respond(response,202,await reconcileAcceptance(assuranceReconcileMatch[2],await json(request),principal!.id,request.headers['idempotency-key']?.toString()??randomUUID())); }
  if (request.method === 'POST' && url.pathname === '/api/admin/ai-runtimes') return respond(response, 202, await registerRuntime(await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (request.method === 'POST' && url.pathname === '/api/admin/agent-execution-policies') return respond(response, 202, await publishAgentExecutionPolicy(await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (request.method === 'POST' && url.pathname === '/api/admin/assurance-policies') return respond(response, 202, await publishAssurancePolicy(await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (runtimeValidateMatch && request.method === 'POST') return respond(response, 200, await validateRuntime(runtimeValidateMatch[1]));
  if (request.method === 'POST' && url.pathname === '/api/agent/readiness') {
    try {
      if (agentExecutionService.isEnabled()) {
        const runtime = (await listRuntimeCatalogue()).find((item: any) => item.adapter_type === 'CODEX_CLI');
        if (runtime?.id) return respond(response, 200, await validateRuntime(runtime.id));
      }
      return respond(response, 200, await checkAgentReadiness(true));
    } catch(error) { const code=error instanceof AgentReadinessError||error instanceof AgentConfigurationError?error.code:'CODEX_PROCESS_FAILED'; return respond(response,503,{code,message:'O agente não está pronto. Corrija a configuração e teste novamente.'}); }
  }
  if (stateActionProjectionMatch && request.method === 'GET') {
    // STATE_ACTION_PROJECTION:v1 — canonical read-only projection for one
    // principal. Uses resolveCapability (never authorize) because this is a GET:
    // it must not write auth_audit_records nor probe capabilities via enforcement.
    // The READ_PROJECT capability check runs inside the same read-only snapshot
    // as the projection so both share a single snapshotNow.
    return respond(response,200,await buildStateActionProjection(stateActionProjectionMatch[1],principal!));
  }
  if (match && request.method === 'GET' && url.searchParams.get('phase3') === 'true') return respond(response, 200, await phase3Detail(match[1]));
  if (match && request.method === 'GET' && match[2] === undefined) return respond(response, 200, await projectDetail(match[1]));
  if (baselineMatch && request.method === 'POST' && baselineMatch[3] === 'submit') return respond(response, 202, await submitTechnologyBaseline(baselineMatch[1], baselineMatch[2], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (baselineMatch && request.method === 'POST' && baselineMatch[3] === 'decision') return respond(response, 202, await decideTechnologyBaseline(baselineMatch[1], baselineMatch[2], await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (technologyBaselineRootMatch && request.method === 'GET') return respond(response, 200, await technologyBaseline(technologyBaselineRootMatch[1]));
  if (technologySelectionContextMatch && request.method === 'GET') return respond(response, 200, await technologySelectionContext(technologySelectionContextMatch[1]));
  if (technologyInventoryMatch && request.method === 'POST') return respond(response, 202, await requestTechnologyInventory(technologyInventoryMatch[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (technologyBaselineRevisionsMatch && request.method === 'POST') return respond(response, 201, await createTechnologyBaselineRevision(technologyBaselineRevisionsMatch[1], await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (technologyBaselineDecisionMatch && request.method === 'POST') { const body = await json(request); const revisionId = typeof body.baseline_revision_id === 'string' ? body.baseline_revision_id : ''; if (!revisionId) throw new ApiError(422, 'TECHNOLOGY_BASELINE_REVISION_REQUIRED'); return respond(response, 202, await decideTechnologyBaseline(technologyBaselineDecisionMatch[1], revisionId, body, request.headers['idempotency-key']?.toString() ?? randomUUID())); }
  if (baselineRevisionMatch && request.method === 'POST') return respond(response, 202, await startTechnologyBaselineRevision(baselineRevisionMatch[1], baselineRevisionMatch[2], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (materializationBaselineMatch && request.method === 'GET') return respond(response, 200, await materializationBaselineOptions(materializationBaselineMatch[1]));
  if (phase3Match && request.method === 'POST' && !phase3Match[2]) return respond(response,202,await materializeModule(phase3Match[1],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'decision') return respond(response,202,await decideModule(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'definition') return respond(response,202,await completeDefinition(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'architecture') return respond(response,202,await decideArchitecture(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'plan') return respond(response,202,await approveModulePlan(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'plan-adjustment') return respond(response,202,await requestPlanAdjustment(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'retry-plan') {
    // F5-23 pendency 12: the retry endpoint REQUIRES the Idempotency-Key header — no
    // random-key fallback — and is exclusive to the authorized operator.
    const idempotencyKey=request.headers['idempotency-key']?.toString()?.trim();
    if(!idempotencyKey)throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');
    return respond(response,202,await retryModulePlan(phase3Match[1],phase3Match[2],await json(request),idempotencyKey,principal!.id));
  }
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'revision') return respond(response,202,await startModuleRevision(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'work-items') return respond(response,202,await authorizeWorkItem(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'development') return respond(response,202,await startDevelopment(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'restart-development') return respond(response,202,await restartDevelopmentOrchestration(workItemMatch[1],workItemMatch[2],request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'retry-development') { const idempotencyKey=request.headers['idempotency-key']?.toString()?.trim();if(!idempotencyKey)throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');return respond(response,202,await retryDevelopmentWorkItem(workItemMatch[1],workItemMatch[2],await json(request),idempotencyKey,principal!.id)); }
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'recovery') { const idempotencyKey=request.headers['idempotency-key']?.toString()?.trim();if(!idempotencyKey)throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');await json(request);return respond(response,202,await requestWorkItemRecovery(workItemMatch[1],workItemMatch[2],idempotencyKey)); }
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'resolve-external-blocker') return respond(response,202,await resolveExternalBlocker(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'qa') return respond(response,202,await submitQa(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'rework') return respond(response,202,await authorizeRework(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'rework-decision') return respond(response,202,await decideReworkGate(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'merge') return respond(response,202,await mergeWorkItemToPhase(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'reconcile') return respond(response,202,await reconcileDevelopmentWorktree(workItemMatch[1],workItemMatch[2],request.headers['idempotency-key']?.toString()??randomUUID()));
  if (request.method === 'POST' && /^\/api\/projects\/[^/]+\/integration-candidates$/.test(url.pathname)) return respond(response,202,await createCandidate(url.pathname.split('/')[3],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'validate') return respond(response,202,await validateCandidate(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'revalidate') return respond(response,202,await revalidateCandidate(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'supersede') return respond(response,202,await supersedeCandidate(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'integrate') return respond(response,202,await startIntegration(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'retry') return respond(response,202,await retryIntegration(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'reconcile') return respond(response,202,await reconcileIntegrationAttempt(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'recovery') { const idempotencyKey=request.headers['idempotency-key']?.toString()?.trim();if(!idempotencyKey)throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');await json(request);return respond(response,202,await requestIntegrationRecovery(candidateMatch[1],candidateMatch[2],idempotencyKey)); }
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'archive') return respond(response,202,await archiveIntegration(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (match && request.method === 'PUT' && match[2] === undefined) return respond(response, 200, await bindRepository(match[1], await json(request)));
  if (match && request.method === 'PUT' && match[2] === 'intake') return respond(response, 200, await saveIntake(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'submit') return respond(response, 202, await submitIntake(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'start-discovery') return respond(response, 202, await startProductDiscovery(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'retry-discovery') return respond(response, 202, await retryProductDiscovery(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'apply-review-adjustments') return respond(response, 202, await applyReviewAdjustments(match[1],await json(request),request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'archive') return respond(response, 200, await archiveProject(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'decision') return respond(response, 200, await decide(match[1], await json(request),principal!));
  if (match && request.method === 'GET' && match[2] === 'events') { response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'access-control-allow-origin': settings.webOrigin }); const requested=Number(url.searchParams.get('after') ?? request.headers['last-event-id'] ?? 0); let after=Number.isSafeInteger(requested)&&requested>0?requested:0,closed=false,polling=false; const publish=async()=>{if(polling||closed)return;polling=true;try{for(const item of await projectTimeline(match[1],after)){if(closed)return;after=Number(item.id);const data=JSON.stringify(item);/* Keep named lifecycle events for existing consumers and emit the same durable timeline item as a standard SSE message for generic projection invalidation. The standard message inherits the preceding durable event id. */response.write(`id: ${item.id}\nevent: ${item.event_type}\ndata: ${data}\n\ndata: ${data}\n\n`);}}finally{polling=false;}}; await publish(); const timer=setInterval(()=>void publish(),750),heartbeat=setInterval(()=>{if(!closed)response.write(': heartbeat\n\n');},15000); request.on('close', ()=>{closed=true;clearInterval(timer);clearInterval(heartbeat);}); return; }
  if (request.method === 'GET' && url.pathname === '/assets/bootstrap.min.css') { response.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'public, max-age=86400' }); return response.end(await readFile(bootstrapCss)); }
  if (request.method === 'GET' && url.pathname === '/projection-refresh.js') { response.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' }); return response.end(await readFile(projectionRefreshScript)); }
  if (request.method === 'GET' && url.pathname === '/action-payload.js') { response.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' }); return response.end(await readFile(actionPayloadScript)); }
  if (request.method === 'GET' && url.pathname === '/') { response.writeHead(200, {'content-type':'text/html','cache-control':'no-store'}); return response.end(await readFile(join(staticRoot, 'index.html'))); }
  respond(response, 404, { code: 'NOT_FOUND' });
} catch (error) { const requestId=randomUUID(); const known=error instanceof ApiError ? error : error instanceof AgentRuntimeAdminError ? new ApiError(error.status, error.code, error.message) : error instanceof AssuranceError ? new ApiError(error.status,error.code) : new ApiError(500, 'INTERNAL_ERROR');
  log('server',known.status>=500?'error':'warn',known.status>=500?'request_failed':'request_rejected',{request_id:requestId,method:request.method,route:new URL(request.url ?? '/',settings.webOrigin).pathname,status:known.status,code:known.code,error_kind:error instanceof Error?error.constructor.name:'UnknownError',database_code:typeof (error as { code?: unknown })?.code==='string'?(error as { code:string }).code:undefined,database_column:typeof (error as { column?: unknown })?.column==='string'?(error as { column:string }).column:undefined,database_message:typeof (error as { message?: unknown })?.message==='string'?(error as { message:string }).message.replace(/[^A-Za-z0-9_. -]/g,'').slice(0,160):undefined});
  respond(response, known.status, { code: known.code, message: known.message, request_id: requestId }); } });
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const stopRuntime=await startRuntimeProcess('SERVER'); const server = createApiServer(); server.listen(settings.port, settings.host, () => log('server','info','server_started',{url:`http://${settings.host}:${settings.port}`,artifact_store:'configured',repository_roots:settings.repositoryRoots.length}));
  // Server-side development reservation reconciliation runs OUTSIDE the worker
  // so a RESERVED delivery whose job is never consumed (or whose worker died)
  // is still reconciled to terminal/recoverable on a bounded schedule.
  const reconcileTimer=setInterval(()=>{ void Promise.all([reconcileDevelopmentRuntime(),reconcileCauseAwareRecovery(),reconcileEligibilityScheduler(),reconcileMacroLifecycle(),reconcileAutomaticAssuranceIntegration(),reconcileDeliveryLifecycle()]).catch((error)=>log('server','error','development_reconcile_failed',{error_kind:error instanceof Error?error.constructor.name:'UnknownError'})); },Math.max(settings.developmentReconcileIntervalSeconds,1)*1000);
  let stopping=false; const stop=async()=>{if(stopping)return;stopping=true;log('server','info','server_stopping');clearInterval(reconcileTimer);server.close();await stopRuntime();await pool.end();log('server','info','server_stopped');};
  process.once('SIGTERM',()=>void stop()); process.once('SIGINT',()=>void stop());
}
