/**
 * CellKey 工具 - SSOT
 * cellKey 格式固定为 `${themeId}:${blockId}`
 */

export interface CellKeyParts {
  themeId: string;
  blockId: string;
}

/**
 * SSOT: 唯一允许解析 cellKey 的地方
 * cellKey 格式固定为 `${themeId}:${blockId}`
 */
export function parseCellKey(cellKey: string): CellKeyParts | null {
  if (!cellKey) return null;

  const idx = cellKey.indexOf(':');
  if (idx === -1) return null;

  const themeId = cellKey.slice(0, idx);
  const blockId = cellKey.slice(idx + 1);

  if (!themeId || !blockId) return null;

  return { themeId, blockId };
}

/**
 * 创建 cellKey
 * @param themeId 主题ID
 * @param blockId 区块ID
 * @returns cellKey 格式: `${themeId}:${blockId}`
 */
export function makeCellKey(themeId: string, blockId: string): string {
  return `${themeId}:${blockId}`;
}
