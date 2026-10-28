import { describe, expect, it } from 'vitest';
import { hasKannada, hasLatin, kannadaToLatin, latinToKannada } from '@/utils/transliterate';

describe('Latin → Kannada', () => {
  const cases: [string, string][] = [
    ['jayamma', 'ಜಯಮ್ಮ'],
    ['Manu', 'ಮನು'],
    ['Murali', 'ಮುರಲಿ'],
    ['Preethi', 'ಪ್ರೀತಿ'],
    ['Priya', 'ಪ್ರಿಯ'],
    ['Suresh', 'ಸುರೇಶ್'],
    ['Lakshmi', 'ಲಕ್ಷ್ಮಿ'],
    ['Virupaksha', 'ವಿರುಪಕ್ಷ'],
    ['shashikala', 'ಶಶಿಕಲ'],
    ['shanmukka', 'ಶನ್ಮುಕ್ಕ'],
    ['Manjunatha', 'ಮಂಜುನತ'],
    ['Ganga', 'ಗಂಗ'],
    ['Gopal', 'ಗೋಪಲ್'],
    ['Rao', 'ರಾವ್'],
  ];
  it.each(cases)('%s → %s', (latin, kannada) => {
    expect(latinToKannada(latin)).toBe(kannada);
  });
  it('keeps spaces and punctuation, and spells single-letter initials', () => {
    expect(latinToKannada('Manu V')).toBe('ಮನು ವಿ');
    expect(latinToKannada('Preethi L R')).toBe('ಪ್ರೀತಿ ಎಲ್ ಆರ್');
    expect(latinToKannada('A. Kumar')).toContain('. ');
  });
  it('is case-insensitive for ordinary letters and leaves Kannada untouched', () => {
    expect(latinToKannada('JAYAMMA')).toBe(latinToKannada('jayamma'));
    expect(latinToKannada('ಸುರೇಶ್')).toBe('ಸುರೇಶ್');
  });
});

describe('Kannada → Latin', () => {
  it('romanises names and capitalises words', () => {
    expect(kannadaToLatin('ಸುರೇಶ್')).toBe('Suresh');
    expect(kannadaToLatin('ಜಯಮ್ಮ')).toBe('Jayamma');
    expect(kannadaToLatin('ಬಸವರಾಜಪ್ಪ')).toBe('Basavarajappa');
    expect(kannadaToLatin('ಲಕ್ಷ್ಮಿ')).toBe('Lakshmi');
    expect(kannadaToLatin('ಮಂಜುನಾಥ')).toBe('Manjunatha');
    expect(kannadaToLatin('ರಾವ್ ಕುಟುಂಬ')).toBe('Rav Kutumba');
  });
  it('round-trips common names closely enough to recognise', () => {
    for (const name of ['Suresh', 'Lakshmi', 'Manu', 'Jayamma']) expect(kannadaToLatin(latinToKannada(name)).toLowerCase()).toBe(name.toLowerCase());
  });
});

describe('script detection', () => {
  it('detects scripts', () => {
    expect(hasKannada('ಸುರೇಶ್')).toBe(true);
    expect(hasKannada('Suresh')).toBe(false);
    expect(hasLatin('Suresh')).toBe(true);
    expect(hasLatin('ಸುರೇಶ್')).toBe(false);
  });
});
