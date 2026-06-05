import { addSynonym } from './generated/synonyms/synonyms';

/**
 * Sample data used to pre-populate the in-memory backend on startup.
 *
 * Each entry is a group of related words. Consecutive words are linked as a chain,
 * so the backend's transitive rule merges every word in a group into one cluster.
 */
const SEED_GROUPS: readonly string[][] = [
  ['Clean', 'Wash', 'Rinse', 'Scrub'],
  ['Car', 'Auto', 'Vehicle', 'Automobile'],
  ['Big', 'Large', 'Huge', 'Enormous', 'Gigantic', 'Massive', 'Colossal'],
  ['Small', 'Tiny'],
  ['Happy', 'Joyful', 'Glad', 'Cheerful', 'Content'],
  ['Sad', 'Unhappy', 'Gloomy', 'Miserable'],
  ['Fast', 'Quick', 'Rapid', 'Swift', 'Speedy'],
  ['Slow', 'Sluggish', 'Leisurely'],
  ['Smart', 'Intelligent', 'Clever', 'Bright', 'Brilliant'],
  ['Laugh', 'Chuckle', 'Giggle', 'LOL', 'ROFL', 'LMAO'],
  ['Soon', 'Shortly', 'ASAP'],
  ['Goodbye', 'Farewell', 'Bye', 'TTYL'],
  ['Begin', 'Start'],
  ['End', 'Finish', 'Conclude', 'Terminate'],
  ['Strong', 'Powerful', 'Mighty', 'Sturdy'],
  ['Weak', 'Feeble'],
  ['Information', 'Info', 'Intel', 'Data', 'FYI'],
  ['Beautiful', 'Gorgeous', 'Stunning', 'Lovely', 'Pretty', 'Attractive'],
  ['Angry', 'Furious', 'Irate', 'Enraged'],
  ['Maybe', 'Perhaps'],
];

// Module-level guard so React StrictMode's double-invoke (and HMR reloads) don't
// re-trigger seeding within the same browser session.
let seeded = false;

/**
 * Sends an addSynonym request for every consecutive pair in each seed group.
 * Adding an existing link is a no-op on the backend, so this is safe to run
 * repeatedly. Best-effort: failures are logged but never block the app from loading.
 */
export async function seedSynonyms(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const requests = SEED_GROUPS.flatMap((group) =>
    group.slice(1).map((word, index) => ({ wordA: group[index], wordB: word })),
  );

  try {
    await Promise.all(requests.map((request) => addSynonym(request)));
  } catch (error) {
    console.warn('Failed to seed sample synonyms', error);
    seeded = false;
  }
}

