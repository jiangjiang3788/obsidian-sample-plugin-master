export function normalizeTagToken(value: unknown): string {
  return String(value ?? '').trim();
}

export function parseTagsInput(value: unknown): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const push = (token: unknown) => {
    const normalized = normalizeTagToken(token);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  };

  const visit = (input: unknown) => {
    if (input === undefined || input === null) return;

    if (Array.isArray(input)) {
      input.forEach(visit);
      return;
    }

    if (typeof input === 'string') {
      input
        .split(/[\s,，]+/u)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach(push);
      return;
    }

    push(input);
  };

  visit(value);
  return result;
}

export function formatTagsForField(value: unknown): string | undefined {
  const tags = parseTagsInput(value);
  return tags.length ? tags.map((tag) => tag.startsWith('#') ? tag : `#${tag}`).join(', ') : undefined;
}
