import { pool } from './db.js';
import { reconcileArtifactIntents } from './artifacts.js';
const recovered = await reconcileArtifactIntents();
console.log(JSON.stringify({ recovered }));
await pool.end();
