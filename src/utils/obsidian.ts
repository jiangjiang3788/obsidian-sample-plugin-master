// utils/obsidian.ts
import { DataStore } from '../data/store';

export function makeObsUri(itemId: string): string {
  const hashIndex = itemId.lastIndexOf('#');
  const filePath = hashIndex >= 0 ? itemId.substring(0, hashIndex) : itemId;
  const lineNo = hashIndex >= 0 ? itemId.substring(hashIndex + 1) : '';
  const vaultName = encodeURIComponent(DataStore.instance['app'].vault.getName());
  return `obsidian://advanced-uri?vault=${vaultName}&filepath=${encodeURIComponent(filePath)}${lineNo ? '&line=' + lineNo : ''}`;
}