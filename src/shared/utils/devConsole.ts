// src/shared/utils/devConsole.ts
// 控制“开发模式：toast 同时输出 console.error stack”
let enabled = false;

export function setDevConsoleStackEnabled(v: boolean): void {
  enabled = !!v;
}

export function isDevConsoleStackEnabled(): boolean {
  return enabled;
}
