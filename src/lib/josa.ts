// 받침 유무로 조사를 고른다. 예: josa("감정서", "을", "를") → "감정서를"
export function josa(word: string, withBatchim: string, without: string): string {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withBatchim : without);
}
