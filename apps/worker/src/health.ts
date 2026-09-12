export type WorkerHealth = { status: 'ready'; service: 'worker' };

export function workerHealth(): WorkerHealth {
  return { status: 'ready', service: 'worker' };
}

if (import.meta.url === new URL(process.argv[1]!, 'file:').href) {
  process.stdout.write(`${JSON.stringify(workerHealth())}\n`);
}
