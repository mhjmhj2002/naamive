// The binding is authoritative: this helper deliberately knows neither field
// names nor command types.  Nested public structures are published through a
// payload_path by the server, never guessed by the browser.
export const buildActionPayload = (formData, fields) => {
  const payload = {};
  const setPath = (target, path, value) => {
    let cursor = target;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
  };
  for (const field of fields || []) {
    if (!field.send) continue;
    const path = Array.isArray(field.payload_path) && field.payload_path.length ? field.payload_path : [field.name];
    if (field.source === 'SERVER_BOUND') { setPath(payload, path, field.value); continue; }
    if (field.source !== 'HUMAN_INPUT') continue;
    const raw = String(formData.get(field.name) || '').trim();
    if (!raw) continue;
    const format = field.serialize_as || 'VALUE';
    const value = format === 'EVIDENCE' ? { summary: raw }
      : format === 'LINES' ? raw.split('\n').map(item => item.trim()).filter(Boolean)
        : field.schema?.type === 'integer' ? Number(raw) : raw;
    setPath(payload, path, value);
  }
  return payload;
};
