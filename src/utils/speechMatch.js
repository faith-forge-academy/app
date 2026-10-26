// Words Whisper often invents on silence. A whole-utterance match is dropped.
const SILENCE_HALLUCINATIONS = new Set([
  'thank you',
  'thank you for watching',
  'thanks for watching',
  'thanks for watching please subscribe',
  'please subscribe',
  'subtitles by',
  'subtitles by the amara org community',
  'music',
  'applause',
]);

// Short words that show up in both scripture and in silence hallucinations.
// A match has to include the following word as well.
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'or', 'but',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'as',
  'is', 'am', 'are', 'was', 'were', 'be', 'been',
  'it', 'its', 'he', 'she', 'we', 'you', 'your', 'they', 'them', 'his', 'her', 'their',
  'that', 'this', 'these', 'those',
  'not', 'so', 'if', 'than', 'then',
]);

export function normalizeWord(word) {
  return String(word ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function normalizeWords(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);
}

export function isSilenceHallucination(text) {
  const norm = normalizeWords(text).join(' ');
  if (!norm) return true;
  return SILENCE_HALLUCINATIONS.has(norm);
}

function withinOneEdit(a, b) {
  if (a === b) return true;
  const lenDiff = a.length - b.length;
  if (lenDiff > 1 || lenDiff < -1) return false;

  if (lenDiff === 0) {
    let edits = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        edits += 1;
        if (edits > 1) return false;
      }
    }
    return edits === 1;
  }

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      edits += 1;
      if (edits > 1) return false;
      i += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  return true;
}

// Longer words tolerate a single clipped or substituted character.
// Short words stay exact so "the" does not match "thee".
export function wordsClose(expected, spoken) {
  if (!expected || !spoken) return false;
  if (expected === spoken) return true;
  if (expected.length >= 5 && spoken.length >= 4) {
    return withinOneEdit(expected, spoken);
  }
  return false;
}

/**
 * Move the practice cursor forward through one transcript.
 * Transcript words that are not the next scripture word are skipped.
 * A function word only counts when the word after it matches too.
 * Returns the new index into scriptureNorms.
 */
export function advancePracticeCursor(scriptureNorms, startIndex, transcriptWords) {
  const spoken = [];
  for (const word of transcriptWords) {
    const norm = normalizeWord(word);
    if (norm) spoken.push(norm);
  }

  let pos = Math.max(0, startIndex);
  let i = 0;
  while (i < spoken.length && pos < scriptureNorms.length) {
    while (pos < scriptureNorms.length && !scriptureNorms[pos]) pos += 1;
    if (pos >= scriptureNorms.length) break;

    const expected = scriptureNorms[pos];
    const heard = spoken[i];
    const needsCompany = FUNCTION_WORDS.has(expected) && pos + 1 < scriptureNorms.length;

    if (needsCompany) {
      const heardNext = spoken[i + 1];
      if (heardNext && wordsClose(expected, heard) && wordsClose(scriptureNorms[pos + 1], heardNext)) {
        pos += 2;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (wordsClose(expected, heard)) {
      pos += 1;
      i += 1;
    } else {
      i += 1;
    }
  }

  while (pos < scriptureNorms.length && !scriptureNorms[pos]) pos += 1;
  return pos;
}

/**
 * Align a recitation to the verse.
 * type is 'equal', 'sub' (wrong word), 'del' (missing), or 'ins' (extra).
 */
export function diffWords(expectedWords, spokenWords) {
  const expected = expectedWords || [];
  const spoken = spokenWords || [];
  const n = expected.length;
  const m = spoken.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    const expectedNorm = normalizeWord(expected[i - 1]);
    for (let j = 1; j <= m; j++) {
      const same = expectedNorm === normalizeWord(spoken[j - 1]);
      const subCost = same ? 0 : 1;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      const sub = dp[i - 1][j - 1] + subCost;
      dp[i][j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
    }
  }

  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const same = i > 0 && j > 0
      && normalizeWord(expected[i - 1]) === normalizeWord(spoken[j - 1])
      && dp[i][j] === dp[i - 1][j - 1];
    if (same) {
      ops.push({ type: 'equal', expected: expected[i - 1], spoken: spoken[j - 1] });
      i -= 1;
      j -= 1;
      continue;
    }
    // Prefer "missing" over a substitution when both explain the same score,
    // so one skipped word does not mark the rest of the verse wrong.
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: 'del', expected: expected[i - 1] });
      i -= 1;
      continue;
    }
    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push({ type: 'ins', spoken: spoken[j - 1] });
      j -= 1;
      continue;
    }
    if (i > 0 && j > 0) {
      ops.push({ type: 'sub', expected: expected[i - 1], spoken: spoken[j - 1] });
      i -= 1;
      j -= 1;
      continue;
    }
    break;
  }

  ops.reverse();
  return ops;
}
