// 接龙拼音工具：带调拼音 -> 忽略声调的匹配键（ü 保留为 v，避免 lǜ 和 lú 混在一起）
function stripTone(syllable) {
  return String(syllable || '')
    .replace(/ü/g, 'v')
    .replace(/[ǖǘǚǜ]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function pinyinParts(pinyin) {
  return String(pinyin || '').trim().split(/\s+/).filter(Boolean);
}

function edgeKeys(pinyin) {
  const parts = pinyinParts(pinyin);
  return { firstKey: stripTone(parts[0]), lastKey: stripTone(parts[parts.length - 1]) };
}

function hasToneMark(syllable) {
  return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(String(syllable || ''));
}

module.exports = { stripTone, pinyinParts, edgeKeys, hasToneMark };
