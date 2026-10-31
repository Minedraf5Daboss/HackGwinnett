// The kinds of accessibility support (wheelchair access, ASL interpreter, ...) that passports
// and clinics refer to by id.

import { useEffect, useState } from 'react';
import { api } from './api.js';

/** All accommodation types, in display order. Null while loading. */
export function useAccommodations() {
  const [accommodations, setAccommodations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/accommodations')
      .then(setAccommodations)
      .catch((err) => setError(err.message));
  }, []);

  return { accommodations, error };
}

/** Group accommodations by category, keeping their order: [[category, [...]], ...]. */
export function byCategory(accommodations) {
  const groups = new Map();
  for (const accommodation of accommodations) {
    if (!groups.has(accommodation.category)) groups.set(accommodation.category, []);
    groups.get(accommodation.category).push(accommodation);
  }
  return [...groups];
}
