// scr/utils/text.ts
// 统一的任务标题清理工具，在 parser / 其它场景复用
export function cleanTaskText(text: string): string {
  // 1. 去掉 "- [ ]" / "- [x]" 前缀
  let result = text.replace(/^\s*-\s*\[[ xX-]\]\s*/, '').trim();

  // 2. 去掉所有行内 #tag
  result = result.replace(/#[\p{L}\p{N}_-]+/gu, '');

  // 3. 拆分 (  或空格，取第一个非空片段
  let main = result.split(/[\s(]/).find(s => s && s.trim());

  // 4. 去掉最前面的 emoji
  main = main?.replace(/^\p{Extended_Pictographic}\uFE0F?/u, '').trim();

  return main ? main.trim() : '';
}