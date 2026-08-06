const queues = new Map<string, string[]>();

const loadQueue = (name: string) => {
  if (!queues.has(name)) {
    const raw = process.env[name]?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
    queues.set(name, raw);
  }
  return queues.get(name)!;
};

export const resetScenarioQueue = (name: string) => {
  queues.delete(name);
};

export const nextScenario = (name: string) => {
  const queue = loadQueue(name);
  return queue.shift();
};
