import { pool } from './db.js';
import { reconcileArtifactIntents } from './artifacts.js';
import { agentExecutionService } from './agent-execution-service.js';
const recovered = await reconcileArtifactIntents();
const recoveredDispatches = await agentExecutionService.recoverDispatchedAttempts();
console.log(JSON.stringify({ recovered, recovered_dispatches: recoveredDispatches }));
await pool.end();
