import { SCHEMA_VERSION, type FamilyTree, type Person, type Relationship } from '@/types/family';
import { newId, nowIso } from '@/utils/id';

type P = Pick<Person, 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'deathDate' | 'biography'> & { key: string };

const PEOPLE: P[] = [
  { key: 'venkatesh', firstName: 'Venkatesh', lastName: 'Rao', gender: 'male', birthDate: '1930', deathDate: '2005', biography: 'Grew up in a small town near Mysuru. A schoolteacher for thirty-one years who kept a garden of jasmine and always had time for a story.' },
  { key: 'lakshmi', firstName: 'Lakshmi', lastName: 'Rao', gender: 'female', birthDate: '1934', deathDate: '2012', biography: 'Known for her festival sweets and for teaching every grandchild to sing the same lullaby.' },
  { key: 'arthur', firstName: 'Arthur', lastName: 'Hartwell', gender: 'male', birthDate: '1929', deathDate: '2008', biography: 'A ship’s engineer who retired to a house by the harbour.' },
  { key: 'margaret', firstName: 'Margaret', lastName: 'Hartwell', gender: 'female', birthDate: '1932', biography: 'Still keeps the family recipe book and writes a letter to someone every Sunday.' },
  { key: 'suresh', firstName: 'Suresh', lastName: 'Rao', gender: 'male', birthDate: '1958', biography: 'An architect who met Eleanor while studying abroad.' },
  { key: 'eleanor', firstName: 'Eleanor', lastName: 'Hartwell', gender: 'female', birthDate: '1960', biography: 'Paediatrician and amateur violinist.' },
  { key: 'geetha', firstName: 'Geetha', lastName: 'Rao', gender: 'female', birthDate: '1961' },
  { key: 'peter', firstName: 'Peter', lastName: 'Fernandes', gender: 'male', birthDate: '1957' },
  { key: 'daniel', firstName: 'Daniel', lastName: 'Hartwell', gender: 'male', birthDate: '1963' },
  { key: 'sofia', firstName: 'Sofia', lastName: 'Alvarez', gender: 'female', birthDate: '1965' },
  { key: 'arjun', firstName: 'Arjun', lastName: 'Rao', gender: 'male', birthDate: '1986' },
  { key: 'maya', firstName: 'Maya', lastName: 'Rao', gender: 'female', birthDate: '1989' },
  { key: 'nisha', firstName: 'Nisha', lastName: 'Fernandes', gender: 'female', birthDate: '1990' },
  { key: 'lucas', firstName: 'Lucas', lastName: 'Hartwell', gender: 'male', birthDate: '1994' },
  { key: 'emma', firstName: 'Emma', lastName: 'Hartwell', gender: 'female', birthDate: '1997' },
  { key: 'priya', firstName: 'Priya', lastName: 'Nair', gender: 'female', birthDate: '1988' },
  { key: 'tom', firstName: 'Tom', lastName: 'Becker', gender: 'male', birthDate: '1987' },
  { key: 'aarav', firstName: 'Aarav', lastName: 'Rao', gender: 'male', birthDate: '2016' },
  { key: 'anaya', firstName: 'Anaya', lastName: 'Rao', gender: 'female', birthDate: '2019' },
  { key: 'leo', firstName: 'Leo', lastName: 'Becker', gender: 'male', birthDate: '2021' },
];

const PARTNERS: [string, string][] = [
  ['venkatesh', 'lakshmi'],
  ['arthur', 'margaret'],
  ['suresh', 'eleanor'],
  ['geetha', 'peter'],
  ['daniel', 'sofia'],
  ['arjun', 'priya'],
  ['maya', 'tom'],
];

/** [parents..., children...] */
const FAMILIES: [string[], string[], ('biological' | 'adoptive')?][] = [
  [['venkatesh', 'lakshmi'], ['suresh', 'geetha']],
  [['arthur', 'margaret'], ['eleanor', 'daniel']],
  [['suresh', 'eleanor'], ['arjun', 'maya']],
  [['geetha', 'peter'], ['nisha']],
  [['daniel', 'sofia'], ['lucas']],
  [['daniel', 'sofia'], ['emma'], 'adoptive'],
  [['arjun', 'priya'], ['aarav', 'anaya']],
  [['maya', 'tom'], ['leo']],
];

/** A fictional, multi-generation family used on the landing page and as "Explore a sample tree". */
export function createSampleTree(): FamilyTree {
  const now = nowIso();
  const ids = new Map<string, string>();
  const people: Person[] = PEOPLE.map(({ key, ...rest }) => {
    const id = newId('p');
    ids.set(key, id);
    return { ...rest, id, createdAt: now, updatedAt: now };
  });
  const relationships: Relationship[] = [];
  for (const [a, b] of PARTNERS) {
    relationships.push({ id: newId('r'), type: 'partner', sourceId: ids.get(a)!, targetId: ids.get(b)! });
  }
  for (const [parents, children, kind] of FAMILIES) {
    for (const child of children) {
      for (const parent of parents) {
        relationships.push({ id: newId('r'), type: 'parent-child', sourceId: ids.get(parent)!, targetId: ids.get(child)!, kind: kind ?? 'biological' });
      }
    }
  }
  return {
    id: newId('t'),
    name: 'The Rao–Hartwell Family (sample)',
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    people,
    relationships,
    layout: { direction: 'vertical' },
  };
}
