import { pool } from './db.js';
import { reconcileArtifactIntents } from './artifacts.js';
import { agentExecutionService } from './agent-execution-service.js';
import { reconcileEligibilityScheduler } from './eligibility-scheduler.js';
const recovered = await reconcileArtifactIntents();
const recoveredDispatches = await agentExecutionService.recoverDispatchedAttempts();
const recoveredEligibility = await reconcileEligibilityScheduler();
console.log(JSON.stringify({ recovered, recovered_dispatches: recoveredDispatches, recovered_eligibility: recoveredEligibility.length }));
await pool.end();
