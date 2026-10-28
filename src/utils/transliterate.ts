/**
 * Rule-based, offline transliteration between Latin (as Indian names are usually typed) and Kannada script.
 * It is a phonetic approximation, not a dictionary: users can always override a name per language in the profile.
 */

const KN_RANGE = /[ಀ-೿]/;
export const hasKannada = (s: string) => KN_RANGE.test(s);
export const hasLatin = (s: string) => /[A-Za-z]/.test(s);

// ---------- Latin -> Kannada ----------
const VOWELS: [string, string, string][] = [
  // [latin, independent, sign]
  ['aa', 'ಆ', 'ಾ'], ['ai', 'ಐ', 'ೈ'], ['au', 'ಔ', 'ೌ'], ['ee', 'ಈ', 'ೀ'], ['ii', 'ಈ', 'ೀ'], ['oo', 'ಊ', 'ೂ'], ['uu', 'ಊ', 'ೂ'],
  ['a', 'ಅ', ''], ['e', 'ಎ', 'ೆ'], ['i', 'ಇ', 'ಿ'], ['o', 'ಓ', 'ೋ'], ['u', 'ಉ', 'ು'],
];
const CONS: [string, string][] = [
  ['chh', 'ಛ'], ['ksh', 'ಕ್ಷ'], ['jn', 'ಜ್ಞ'], ['kh', 'ಖ'], ['gh', 'ಘ'], ['ch', 'ಚ'], ['jh', 'ಝ'], ['th', 'ತ'], ['dh', 'ಧ'], ['bh', 'ಭ'], ['ph', 'ಫ'], ['sh', 'ಶ'],
];
const SINGLE: Record<string, string> = {
  k: 'ಕ', g: 'ಗ', c: 'ಕ', j: 'ಜ', t: 'ತ', d: 'ದ', n: 'ನ', p: 'ಪ', f: 'ಫ', b: 'ಬ', m: 'ಮ', y: 'ಯ', r: 'ರ', l: 'ಲ', v: 'ವ', w: 'ವ', s: 'ಸ', h: 'ಹ', q: 'ಕ', x: 'ಕ್ಸ', z: 'ಜ',
};
const RETRO: Record<string, string> = { T: 'ಟ', D: 'ಡ', N: 'ಣ', L: 'ಳ', S: 'ಷ' };
const LETTER_NAMES: Record<string, string> = {
  A: 'ಎ', B: 'ಬಿ', C: 'ಸಿ', D: 'ಡಿ', E: 'ಇ', F: 'ಎಫ್', G: 'ಜಿ', H: 'ಎಚ್', I: 'ಐ', J: 'ಜೆ', K: 'ಕೆ', L: 'ಎಲ್', M: 'ಎಂ', N: 'ಎನ್', O: 'ಓ', P: 'ಪಿ', Q: 'ಕ್ಯೂ',
  R: 'ಆರ್', S: 'ಎಸ್', T: 'ಟಿ', U: 'ಯು', V: 'ವಿ', W: 'ಡಬ್ಲ್ಯೂ', X: 'ಎಕ್ಸ್', Y: 'ವೈ', Z: 'ಝೆಡ್',
};
const VIRAMA = '್';
const NASAL_BEFORE = /^(?:k|g|ch|j|t|d|T|D)/;

function wordToKannada(w: string): string {
  if (w.length === 1 && LETTER_NAMES[w]) return LETTER_NAMES[w];
  let out = '';
  let open = false; // a consonant has been written and still lacks its vowel
  let i = 0;
  while (i < w.length) {
    const rest = w.slice(i);
    const lower = rest.toLowerCase();

    // a final "ao" is the surname ending Rao / Gowdao style: ರಾವ್
    if (open && /^ao$/.test(lower)) { out += 'ಾವ್'; open = false; i += 2; continue; }

    // vowels (longest first); a final "esh" reads as a long ē as in Suresh / Mahesh
    const v = VOWELS.find(([l]) => lower.startsWith(l));
    if (v) {
      const [latin, independent, baseSign] = v;
      const longE = latin === 'e' && /^esh$/.test(lower);
      if (open) out += longE ? 'ೇ' : baseSign;
      else out += longE ? 'ಏ' : independent;
      open = false;
      i += latin.length;
      continue;
    }

    // anusvara: n/m before a stop inside a word (Manju, Ganga, Sampath)
    if (!open && out && (lower[0] === 'n' && NASAL_BEFORE.test(rest.slice(1)))) { out += 'ಂ'; i += 1; continue; }
    if (!open && out && lower[0] === 'm' && /^[pb]/i.test(rest.slice(1))) { out += 'ಂ'; i += 1; continue; }

    // consonants
    let cons: string | undefined;
    let len = 1;
    const multi = CONS.find(([l]) => lower.startsWith(l));
    if (multi) { cons = multi[1]; len = multi[0].length; }
    else if (i > 0 && RETRO[rest[0]]) cons = RETRO[rest[0]];
    else if (lower[0] === 'c' && /^c[eiy]/i.test(rest)) cons = 'ಸ';
    else cons = SINGLE[lower[0]];

    if (!cons) { out += rest[0]; open = false; i += 1; continue; }
    out += open ? VIRAMA + cons : cons;
    open = true;
    i += len;
  }
  if (open) out += VIRAMA;
  return out;
}

export function latinToKannada(text: string): string {
  return text.split(/([^A-Za-z]+)/).map((part) => (/^[A-Za-z]+$/.test(part) ? wordToKannada(part) : part)).join('');
}

// ---------- Kannada -> Latin ----------
const K_CONS: Record<string, string> = {
  ಕ: 'k', ಖ: 'kh', ಗ: 'g', ಘ: 'gh', ಙ: 'ng', ಚ: 'ch', ಛ: 'chh', ಜ: 'j', ಝ: 'jh', ಞ: 'ny', ಟ: 't', ಠ: 'th', ಡ: 'd', ಢ: 'dh', ಣ: 'n', ತ: 't', ಥ: 'th', ದ: 'd', ಧ: 'dh', ನ: 'n',
  ಪ: 'p', ಫ: 'ph', ಬ: 'b', ಭ: 'bh', ಮ: 'm', ಯ: 'y', ರ: 'r', ಱ: 'r', ಲ: 'l', ವ: 'v', ಶ: 'sh', ಷ: 'sh', ಸ: 's', ಹ: 'h', ಳ: 'l', ೞ: 'zh',
};
const K_IND: Record<string, string> = { ಅ: 'a', ಆ: 'aa', ಇ: 'i', ಈ: 'ee', ಉ: 'u', ಊ: 'oo', ಋ: 'ru', ಎ: 'e', ಏ: 'e', ಐ: 'ai', ಒ: 'o', ಓ: 'o', ಔ: 'au' };
const K_SIGN: Record<string, string> = { 'ಾ': 'a', 'ಿ': 'i', 'ೀ': 'ee', 'ು': 'u', 'ೂ': 'oo', 'ೃ': 'ru', 'ೆ': 'e', 'ೇ': 'e', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'o', 'ೌ': 'au' };

function wordToLatin(w: string): string {
  const chars = [...w];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    if (K_CONS[c]) {
      out += K_CONS[c];
      if (next === VIRAMA) i += 1; // conjunct: no vowel
      else if (next && K_SIGN[next]) { out += K_SIGN[next]; i += 1; }
      else out += 'a';
    } else if (K_IND[c]) out += K_IND[c];
    else if (c === 'ಂ') out += next && /[ಪಫಬಭಮ]/.test(next) ? 'm' : 'n';
    else if (c === 'ಃ') out += 'h';
    else if (c === VIRAMA) continue;
    else out += c;
  }
  return out;
}

export function kannadaToLatin(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => (hasKannada(part) ? wordToLatin(part).replace(/^./, (ch) => ch.toUpperCase()) : part))
    .join('');
}
