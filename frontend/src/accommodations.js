// The kinds of accessibility support (wheelchair access, ASL interpreter, ...) that passports
// and clinics refer to by id.

import {
  Accessibility,
  ArrowUpFromLine,
  Bath,
  BedSingle,
  BookOpenText,
  CalendarClock,
  Check,
  Clock,
  Dog,
  Ear,
  Hand,
  Languages,
  MessageSquareText,
  MessagesSquare,
  SquareParking,
  Type,
  Users,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from './api.js';

const ICONS = {
  'wheelchair-access': Accessibility,
  'roll-in-exam-table': BedSingle,
  'patient-lift': ArrowUpFromLine,
  'accessible-restroom': Bath,
  'accessible-parking': SquareParking,
  'asl-interpreter': Hand,
  'spoken-language-interpreter': Languages,
  'text-communication': MessageSquareText,
  'plain-language': BookOpenText,
  'low-sensory': VolumeX,
  'large-print-braille': Type,
  'hearing-loop': Ear,
  'extended-appointments': Clock,
  'support-person': Users,
  'service-animal': Dog,
};

const CATEGORY_ICONS = {
  Mobility: Accessibility,
  Communication: MessagesSquare,
  Sensory: Ear,
  'Scheduling & support': CalendarClock,
};

/** The icon for an accommodation id. New ids added to the data get a checkmark. */
export function accommodationIcon(id) {
  return ICONS[id] ?? Check;
}

export function categoryIcon(category) {
  return CATEGORY_ICONS[category] ?? Check;
}

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
