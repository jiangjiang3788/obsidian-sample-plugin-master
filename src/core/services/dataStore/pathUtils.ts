export type FilePathInput = string | { path: string };

export function normalizeFilePathInput(input: FilePathInput): string {
  return typeof input === 'string'
    ? input
    : (input && typeof input.path === 'string' ? input.path : '');
}

export function pathBasename(path: string): string {
  return path.split('/').pop() || path;
}

export function pathParentName(path: string): string {
  const parts = path.split('/');
  if (parts.length <= 1) return '';
  return parts[parts.length - 2] || '';
}

export function basenameNoExt(filename: string): string {
  return filename.toLowerCase().endsWith('.md') ? filename.slice(0, -3) : filename;
}

export function itemBelongsToFileId(itemId: string | undefined, filePath: string): boolean {
  return Boolean(itemId && itemId.startsWith(filePath + '#'));
}
