/** Same canonical content hash on the publishing computer and in Obsidian. */
import { DEV_BUILD_FILES, type DevBuildContents } from './DevBuildInstaller';

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('当前 Obsidian 不支持安全 SHA-256 校验，请升级 Obsidian');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function contentBuildId(files: DevBuildContents): Promise<string> {
  const encoder = new TextEncoder();
  const segments: Uint8Array[] = [encoder.encode('think-os-build-v1\0')];
  for (const file of DEV_BUILD_FILES) {
    const bytes = encoder.encode(files[file]);
    segments.push(encoder.encode(`${file}\0${bytes.length}\0`), bytes, encoder.encode('\0'));
  }
  const all = new Uint8Array(segments.reduce((sum, segment) => sum + segment.length, 0));
  let offset = 0;
  for (const segment of segments) { all.set(segment, offset); offset += segment.length; }
  return sha256Hex(all);
}
