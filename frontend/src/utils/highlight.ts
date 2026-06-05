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

export function getHighlightSegments(text: string, query: string): HighlightSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [{ text, matched: false }];
  }

  const segments: HighlightSegment[] = [];
  const haystack = text.toLowerCase();
  let cursor = 0;

  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, cursor)) {
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), matched: false });
    }
    segments.push({ text: text.slice(index, index + needle.length), matched: true });
    cursor = index + needle.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments;
}
