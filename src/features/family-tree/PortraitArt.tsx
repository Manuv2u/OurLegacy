import type { AgeGroup } from './ageGroups';

/**
 * Default profile pictures: small black-and-white illustrated portraits shown inside the round avatar when a person
 * has no photo but a known gender. The style follows the person's age group (boy with cap, girl with braid, adults,
 * grandfather with moustache, grandmother with bun and glasses); variety inside a group is picked from the id so a
 * person always looks the same. Same ink colour as the app: no pink/blue coding.
 */
const INK = '#202820';
const SKIN = '#ffffff';

export type Variant = 'mAdult' | 'mBeard' | 'mGlasses' | 'mElder' | 'mBoy' | 'fLong' | 'fBob' | 'fElder' | 'fGirl';

const POOLS: Record<'male' | 'female', Record<AgeGroup, Variant[]>> = {
  male: { child: ['mBoy'], adult: ['mAdult', 'mBeard', 'mGlasses'], elder: ['mElder'] },
  female: { child: ['fGirl'], adult: ['fLong', 'fBob'], elder: ['fElder'] },
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function pickVariant(gender: 'male' | 'female', seed: string, group: AgeGroup = 'adult'): Variant {
  const options = POOLS[gender][group];
  return options[hash(seed) % options.length];
}

const stroke = { stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Face({ lashes, glasses, wrinkles }: { lashes?: boolean; glasses?: boolean; wrinkles?: boolean }) {
  return (
    <>
      <path d="M43 60 V73 C46 77 54 77 57 73 V60Z" fill={SKIN} {...stroke} strokeWidth={2.2} />
      <ellipse cx="50" cy="45" rx="17" ry="20" fill={SKIN} {...stroke} />
      <circle cx="38.5" cy="52" r="3" fill={INK} opacity=".09" />
      <circle cx="61.5" cy="52" r="3" fill={INK} opacity=".09" />
      <circle cx="43.5" cy="45" r="1.9" fill={INK} />
      <circle cx="56.5" cy="45" r="1.9" fill={INK} />
      {lashes && <path d="M40.6 43.6 L39 42.4 M59.4 43.6 L61 42.4" fill="none" {...stroke} strokeWidth={1.4} />}
      <path d="M40 39.8 Q43.5 37.8 47 39.8 M53 39.8 Q56.5 37.8 60 39.8" fill="none" {...stroke} strokeWidth={1.7} />
      <path d="M50 47 Q48.4 51 50.6 52" fill="none" {...stroke} strokeWidth={1.5} />
      <path d="M44.5 56 Q50 60.5 55.5 56" fill="none" {...stroke} strokeWidth={2} />
      {wrinkles && <path d="M37.6 44 L35.6 43 M37.6 46.4 L35.6 47.4 M62.4 44 L64.4 43 M62.4 46.4 L64.4 47.4 M42 52 Q41 56 43 59 M58 52 Q59 56 57 59" fill="none" {...stroke} strokeWidth={1.2} opacity=".55" />}
      {glasses && (
        <g fill="none" {...stroke} strokeWidth={1.8}>
          <circle cx="43.5" cy="45" r="6.2" />
          <circle cx="56.5" cy="45" r="6.2" />
          <path d="M49.7 44.5 H50.3 M37.3 44 L33.4 43 M62.7 44 L66.6 43" />
        </g>
      )}
    </>
  );
}

const Shoulders = () => <path d="M8 100 C10 80 28 72 50 72 C72 72 90 80 92 100Z" fill={INK} />;
const Ears = () => (
  <>
    <circle cx="33" cy="47" r="3.2" fill={SKIN} {...stroke} strokeWidth={2} />
    <circle cx="67" cy="47" r="3.2" fill={SKIN} {...stroke} strokeWidth={2} />
  </>
);
const ShortHair = () => <path d="M32 44 C29 24 40 14 51 14 C65 14 72 26 68 44 C66 35 60 29 50 30 C41 30 35 35 32 44Z" fill={INK} />;

function Art({ variant }: { variant: Variant }) {
  switch (variant) {
    case 'mAdult':
      return (
        <>
          <Shoulders />
          {/* polo collar */}
          <path d="M40 71 L50 82 L36.5 79Z M60 71 L50 82 L63.5 79Z" fill={SKIN} {...stroke} strokeWidth={1.5} />
          <path d="M50 82 V98" stroke={SKIN} strokeWidth="1.4" />
          <Ears />
          <Face />
          <path d="M32 44 C28 25 38 14 50 14 C64 13 72 25 68 44 C66 36 62 31 54 29 C46 33 37 31 32 44Z" fill={INK} />
        </>
      );
    case 'mBeard':
      return (<><Shoulders /><Ears /><Face /><ShortHair /><path d="M33 47 C33 68 42 73 50 73 C58 73 67 68 67 47 C65 55 59 57.5 50 57.5 C41 57.5 35 55 33 47Z" fill={INK} /><path d="M44.5 55.6 Q50 60 55.5 55.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></>);
    case 'mGlasses':
      return (<><Shoulders /><Ears /><Face glasses /><ShortHair /></>);
    case 'mElder':
      return (
        <>
          <Shoulders />
          <Ears />
          <Face wrinkles />
          <path d="M33 42 C30 38 31 30 36 27 C34 32 34 37 35 42Z M67 42 C70 38 69 30 64 27 C66 32 66 37 65 42Z" fill={INK} />
          <path d="M42.5 54 Q50 50.2 57.5 54 Q54 58.5 50 56 Q46 58.5 42.5 54Z" fill={INK} />
        </>
      );
    case 'mBoy':
      return (
        <>
          <Shoulders />
          <Ears />
          <Face />
          {/* backwards cap */}
          <path d="M66 29 C75 27 81 31 80 38 C77 39 71 39 66.5 36.5Z" fill={SKIN} {...stroke} strokeWidth={2} />
          <path d="M32.5 40 C31.5 21 41 13 51 13 C62 13 69.5 21 68.5 40 C61 33.5 41 33.5 32.5 40Z" fill={SKIN} {...stroke} />
          <path d="M51 14 V33" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="51" cy="13.5" r="1.8" fill={INK} />
        </>
      );
    case 'fLong':
      return (
        <>
          <path d="M27 52 C20 24 34 9 50 9 C66 9 80 24 73 52 C72 64 76 74 68 84 L32 84 C24 74 28 64 27 52Z" fill={INK} />
          <Shoulders />
          <Face lashes />
          <path d="M32.5 42 C34 28 44 22 53 25 C61 24 67.5 32 67.5 42 C63 34 57 31 51 33 C44 30 37 34 32.5 42Z" fill={INK} />
        </>
      );
    case 'fBob':
      return (
        <>
          <path d="M28 52 C23 24 37 12 50 12 C63 12 77 24 72 52 C72 60 71 63 67 62 L66 46 L34 46 L33 62 C29 63 28 60 28 52Z" fill={INK} />
          <Shoulders />
          <Face lashes />
          <path d="M32 41 C33 27 42 22 50 22 C58 22 67 27 68 41 C60 36 40 36 32 41Z" fill={INK} />
        </>
      );
    case 'fGirl':
      return (
        <>
          <path d="M30 52 C27 25 40 12 50 12 C60 12 73 25 70 52 L66 52 L34 52Z" fill={INK} />
          <Shoulders />
          <Face lashes />
          {/* centre parting */}
          <path d="M33 43 C35 30 45 26 50 28 C55 26 65 30 67 43 C60 37 55 34 50 35 C45 34 40 37 33 43Z" fill={INK} />
          {/* braid over the shoulder */}
          <path d="M67 52 C73 62 68 72 69 80 C70 86 67 91 70 96" fill="none" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M65.5 62 L72 64 M66 70 L72.5 72 M67 78 L72.5 80 M67.5 86 L72 88" stroke={SKIN} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case 'fElder':
      return (
        <>
          <circle cx="50" cy="11" r="8" fill={INK} />
          <Shoulders />
          <Ears />
          <Face glasses wrinkles />
          <path d="M32 43 C30 24 40 17 50 17 C60 17 70 24 68 43 C65 34 58 30 50 31 C42 30 35 34 32 43Z" fill={INK} />
        </>
      );
  }
}

interface Props {
  gender: 'male' | 'female';
  seed: string;
  group: AgeGroup;
}

export function PortraitArt({ gender, seed, group }: Props) {
  const variant = pickVariant(gender, seed, group);
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full" data-portrait={variant}>
      {/* children are drawn a little smaller, anchored to the bottom edge */}
      <g transform={group === 'child' ? 'translate(50 100) scale(.9) translate(-50 -100)' : undefined}>
        <Art variant={variant} />
      </g>
    </svg>
  );
}
