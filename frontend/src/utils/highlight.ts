/**
 * Splits {@link text} into consecutive segments, flagging which ones match {@link query}
 * (case-insensitive substring). Lets the UI emphasise the matched portion without pulling
 * in a highlighting dependency. Returns the whole text as a single unmatched segment when
 * the query is empty.
 */
export interface HighlightSegment {
  text: string;
  matched: boolean;
}

export function getHighlightSegments(option: string, query: string): HighlightSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [{ text: option, matched: false }];
  }

  const segments: HighlightSegment[] = [];
  const haystack = option.toLowerCase(); // normalise option to match case-insensitively against the query
  let cursor = 0; // current position in the option string as we scan through it

  // Walk through every position in `option` where the query letters appear consecutively.
  // Each iteration slices the option into two parts:
  //   1. the letters before the query match (not typed by the user) — unmatched
  //   2. the letters that match the query — matched
  // The update expression (index = haystack.indexOf(needle, cursor)) moves the search
  // forward so we don't re-examine letters we've already processed.
  for (
    let index = haystack.indexOf(needle);
    index !== -1;
    index = haystack.indexOf(needle, cursor)
  ) {
    if (index > cursor) {
      // letters in the option that come before this query match
      segments.push({ text: option.slice(cursor, index), matched: false });
    }
    // letters in the option that match what the user typed
    segments.push({ text: option.slice(index, index + needle.length), matched: true });
    cursor = index + needle.length; // move past the matched letters
  }

  // letters in the option that follow the last query match (or all letters if nothing matched)
  if (cursor < option.length) {
    segments.push({ text: option.slice(cursor), matched: false });
  }

  return segments;
}
