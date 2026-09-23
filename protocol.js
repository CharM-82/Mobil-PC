export function encode(type, payload = {}) {
  return JSON.stringify({ type, ...payload });
}

export function decode(data) {
  try {
    const message = JSON.parse(String(data));
    return message && typeof message.type === "string" ? message : null;
  } catch {
    return null;
  }
}

export function publicProject({ id, name }) {
  return { id, name };
}
