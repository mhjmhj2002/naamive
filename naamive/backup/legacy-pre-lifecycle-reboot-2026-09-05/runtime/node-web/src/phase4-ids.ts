import { createHash } from 'node:crypto';

export const stableUuidFromText = (prefix: string, value: string) => {
  const hash = createHash('sha256').update(`${prefix}:${value}`).digest('hex');
  const base = hash.slice(0, 32).split('');
  base[12] = '4';
  base[16] = ((parseInt(base[16], 16) & 0x3) | 0x8).toString(16);
  return `${base.slice(0, 8).join('')}-${base.slice(8, 12).join('')}-${base.slice(12, 16).join('')}-${base.slice(16, 20).join('')}-${base.slice(20, 32).join('')}`;
};
