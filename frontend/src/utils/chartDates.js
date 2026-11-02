export function parseProjectDate(value) {
  if (value instanceof Date) return value;
  const raw = String(value ?? "");
  const local = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(raw);
  return new Date(local ? `${local[1]}T${local[2]}-05:00` : raw);
}
