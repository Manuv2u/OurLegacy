import type { Locale } from '@/i18n';
import type { Kin, Sex } from './kinship';

const pick = (sex: Sex, male: string, female: string, neutral: string) => (sex === 'male' ? male : sex === 'female' ? female : neutral);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const greats = (count: number) => (count <= 0 ? '' : count <= 3 ? 'great-'.repeat(count) : `${count}×-great-`);

const ordinalEn = (n: number) => {
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
};
const removedEn = (r: number) => (r === 1 ? ' once removed' : r === 2 ? ' twice removed' : ` ${r}× removed`);

export function kinLabelEn(k: Kin): string {
  switch (k.rel) {
    case 'ancestor': {
      if (k.n === 1) return cap(`${k.adoptive ? 'adoptive ' : ''}${pick(k.sex, 'father', 'mother', 'parent')}`);
      return cap(`${greats(k.n - 2)}${pick(k.sex, 'grandfather', 'grandmother', 'grandparent')}`);
    }
    case 'descendant': {
      if (k.n === 1) return cap(`${k.adoptive ? 'adoptive ' : ''}${pick(k.sex, 'son', 'daughter', 'child')}`);
      return cap(`${greats(k.n - 2)}${pick(k.sex, 'grandson', 'granddaughter', 'grandchild')}`);
    }
    case 'partner':
      return pick(k.sex, 'Husband', 'Wife', 'Partner');
    case 'sibling':
      return `${k.half ? 'Half-' : ''}${k.half ? pick(k.sex, 'brother', 'sister', 'sibling') : pick(k.sex, 'Brother', 'Sister', 'Sibling')}`;
    case 'auntUncle': {
      const base = pick(k.sex, 'uncle', 'aunt', k.n === 1 ? "parent's sibling" : "grandparent's sibling");
      return cap(k.sex === 'neutral' ? base : `${greats(k.n - 1)}${base}`);
    }
    case 'nephewNiece': {
      if (k.sex === 'neutral') return k.n === 1 ? "Sibling's child" : "Sibling's grandchild";
      return cap(`${k.n === 1 ? '' : `${greats(k.n - 2)}grand`}${pick(k.sex, 'nephew', 'niece', '')}`);
    }
    case 'cousin':
      return `${ordinalEn(k.degree)} cousin${k.removed ? removedEn(k.removed) : ''}`;
    case 'inLaw': {
      const [m, f, n] = k.of === 'parent' ? ['Father', 'Mother', 'Parent'] : k.of === 'child' ? ['Son', 'Daughter', 'Child'] : ['Brother', 'Sister', 'Sibling'];
      return `${pick(k.sex, m, f, n)}-in-law`;
    }
    case 'step':
      return pick(k.sex, 'Stepfather', 'Stepmother', 'Step-parent');
  }
}

const nth = (n: number) => `${n}ನೇ ತಲೆಮಾರಿನ`;

export function kinLabelKn(k: Kin): string {
  switch (k.rel) {
    case 'ancestor': {
      if (k.n === 1) return `${k.adoptive ? 'ದತ್ತು ' : ''}${pick(k.sex, 'ತಂದೆ', 'ತಾಯಿ', 'ಪೋಷಕರು')}`;
      if (k.n === 2) return pick(k.sex, 'ಅಜ್ಜ', 'ಅಜ್ಜಿ', 'ಅಜ್ಜ-ಅಜ್ಜಿ');
      if (k.n === 3) return pick(k.sex, 'ಮುತ್ತಜ್ಜ', 'ಮುತ್ತಜ್ಜಿ', 'ಮುತ್ತಜ್ಜ-ಮುತ್ತಜ್ಜಿ');
      return `${nth(k.n)} ಪೂರ್ವಜ`;
    }
    case 'descendant': {
      if (k.n === 1) return `${k.adoptive ? 'ದತ್ತು ' : ''}${pick(k.sex, 'ಮಗ', 'ಮಗಳು', 'ಮಗು')}`;
      if (k.n === 2) return pick(k.sex, 'ಮೊಮ್ಮಗ', 'ಮೊಮ್ಮಗಳು', 'ಮೊಮ್ಮಗು');
      if (k.n === 3) return pick(k.sex, 'ಮರಿಮಗ', 'ಮರಿಮಗಳು', 'ಮರಿಮಗು');
      return `${nth(k.n)} ವಂಶಸ್ಥ`;
    }
    case 'partner':
      return pick(k.sex, 'ಗಂಡ', 'ಹೆಂಡತಿ', 'ಸಂಗಾತಿ');
    case 'sibling': {
      const base =
        k.sex === 'male' ? (k.elder === true ? 'ಅಣ್ಣ' : k.elder === false ? 'ತಮ್ಮ' : 'ಸಹೋದರ') : k.sex === 'female' ? (k.elder === true ? 'ಅಕ್ಕ' : k.elder === false ? 'ತಂಗಿ' : 'ಸಹೋದರಿ') : 'ಒಡಹುಟ್ಟಿದವರು';
      return k.half ? `ಮಲ-${base}` : base;
    }
    case 'auntUncle': {
      if (k.n > 1) return pick(k.sex, 'ಪೂರ್ವಜರ ಸಹೋದರ', 'ಪೂರ್ವಜರ ಸಹೋದರಿ', 'ಪೂರ್ವಜರ ಒಡಹುಟ್ಟಿದವರು');
      if (k.sex === 'male') {
        if (k.side === 'paternal') return k.elder === true ? 'ದೊಡ್ಡಪ್ಪ' : k.elder === false ? 'ಚಿಕ್ಕಪ್ಪ' : 'ಅಪ್ಪನ ಸಹೋದರ';
        if (k.side === 'maternal') return 'ಮಾವ';
        return 'ಪೋಷಕರ ಸಹೋದರ';
      }
      if (k.sex === 'female') {
        if (k.side === 'paternal') return 'ಅತ್ತೆ';
        if (k.side === 'maternal') return k.elder === true ? 'ದೊಡ್ಡಮ್ಮ' : k.elder === false ? 'ಚಿಕ್ಕಮ್ಮ' : 'ತಾಯಿಯ ಸಹೋದರಿ';
        return 'ಪೋಷಕರ ಸಹೋದರಿ';
      }
      return 'ಪೋಷಕರ ಒಡಹುಟ್ಟಿದವರು';
    }
    case 'nephewNiece':
      return k.n > 1 ? 'ಒಡಹುಟ್ಟಿದವರ ವಂಶಸ್ಥ' : pick(k.sex, 'ಒಡಹುಟ್ಟಿದವರ ಮಗ', 'ಒಡಹುಟ್ಟಿದವರ ಮಗಳು', 'ಒಡಹುಟ್ಟಿದವರ ಮಗು');
    case 'cousin':
      return `${k.degree === 1 ? '' : `${k.degree}ನೇ `}ಸೋದರ ಸಂಬಂಧಿ${k.removed ? ` (${k.removed} ತಲೆಮಾರು ವ್ಯತ್ಯಾಸ)` : ''}`;
    case 'inLaw':
      return k.of === 'parent' ? pick(k.sex, 'ಮಾವ', 'ಅತ್ತೆ', 'ಅತ್ತೆ-ಮಾವ') : k.of === 'child' ? pick(k.sex, 'ಅಳಿಯ', 'ಸೊಸೆ', 'ಅಳಿಯ/ಸೊಸೆ') : pick(k.sex, 'ಭಾವ', 'ನಾದಿನಿ', 'ಸಂಬಂಧಿ');
    case 'step':
      return pick(k.sex, 'ಮಲತಂದೆ', 'ಮಲತಾಯಿ', 'ಮಲ-ಪೋಷಕರು');
  }
}

export const kinLabel = (k: Kin, locale: Locale): string => (locale === 'kn' ? kinLabelKn(k) : kinLabelEn(k));
