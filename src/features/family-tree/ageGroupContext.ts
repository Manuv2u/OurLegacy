import { createContext, useContext } from 'react';
import type { AgeGroup } from './ageGroups';

/** Age groups inferred for the tree being shown; avatars fall back to birth dates when absent. */
export const AgeGroupContext = createContext<ReadonlyMap<string, AgeGroup> | null>(null);
export const useAgeGroup = (id: string | undefined): AgeGroup | undefined => useContext(AgeGroupContext)?.get(id ?? '');
