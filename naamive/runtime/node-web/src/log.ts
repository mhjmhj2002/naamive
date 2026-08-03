export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Emits one sanitised, machine-readable record per operational event. */
export const log = (component:string, level:LogLevel, event:string, fields:Record<string,unknown>={}) => {
  const record={timestamp:new Date().toISOString(),service:'naamive-node-web',component,level,event,...fields};
  (level==='error'?console.error:level==='warn'?console.warn:console.info)(JSON.stringify(record));
};
