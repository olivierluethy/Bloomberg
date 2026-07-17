/**
 * Subsequence fuzzy matching for the command palette.
 *
 * Deliberately local and dependency-free: the palette must feel instant on every
 * keystroke, and the free-tier search endpoints are rate-limited (and the mock
 * returns random symbols). Matching a local catalog keeps it honest and free.
 *
 * Scoring favors, in order: exact hits, prefix hits, matches that start on a
 * word boundary, and runs of consecutive characters — so "eur" ranks EUR/USD
 * above a scattered match, and "aapl" puts AAPL first.
 */

export interface FuzzyMatch {
  score: number;
  /** Indices of `text` that matched, for highlight rendering. */
  indices: number[];
}

const SEPARATORS = new Set([" ", "-", "/", "_", ".", "^", "="]);

/**
 * Returns null when `query` is not a subsequence of `text`. An empty query
 * matches everything with a zero score, which lets callers show a default list.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indices: [] };

  const haystack = text.toLowerCase();

  // Fast paths: whole-string and prefix hits outrank any scattered match.
  if (haystack === q) {
    return { score: 1000, indices: range(0, q.length) };
  }
  if (haystack.startsWith(q)) {
    return { score: 900 - text.length, indices: range(0, q.length) };
  }

  const contiguous = haystack.indexOf(q);
  if (contiguous > -1) {
    const boundary = contiguous === 0 || SEPARATORS.has(haystack[contiguous - 1] ?? "");
    return {
      score: (boundary ? 700 : 500) - contiguous - text.length,
      indices: range(contiguous, contiguous + q.length),
    };
  }

  const indices: number[] = [];
  let score = 0;
  let qi = 0;
  let streak = 0;

  for (let hi = 0; hi < haystack.length && qi < q.length; hi++) {
    if (haystack[hi] !== q[qi]) {
      streak = 0;
      continue;
    }
    const atBoundary = hi === 0 || SEPARATORS.has(haystack[hi - 1] ?? "");
    score += 10 + streak * 5 + (atBoundary ? 15 : 0);
    indices.push(hi);
    streak++;
    qi++;
  }

  if (qi < q.length) return null; // not a subsequence
  return { score: score - text.length, indices };
}

/**
 * Best match across several fields (e.g. symbol and company name). Highlight
 * indices refer to whichever field won, so callers pass `field` back when
 * rendering.
 */
export function fuzzyMatchFields<F extends string>(
  fields: Record<F, string>,
  query: string,
  weights: Partial<Record<F, number>> = {},
): (FuzzyMatch & { field: F }) | null {
  let best: (FuzzyMatch & { field: F }) | null = null;

  for (const key of Object.keys(fields) as F[]) {
    const value = fields[key];
    if (!value) continue;
    const match = fuzzyMatch(value, query);
    if (!match) continue;
    const scaled = { ...match, score: match.score * (weights[key] ?? 1), field: key };
    if (!best || scaled.score > best.score) best = scaled;
  }

  return best;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}
