function collapseSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SNIPPET_LIMIT = 280;

function searchTerms(query) {
  return [...new Set(
    String(query || '')
      .trim()
      .split(/\s+/)
      .map((term) => term.replace(/[^a-z0-9]/gi, ''))
      .filter((term) => term.length >= 3)
  )];
}

function wordStart(source, index) {
  if (index <= 0) return 0;
  const space = source.lastIndexOf(' ', index - 1);
  return space === -1 ? 0 : space + 1;
}

function wordEnd(source, index) {
  if (index >= source.length) return source.length;
  const space = source.indexOf(' ', index);
  return space === -1 ? source.length : space;
}

// Verse numbers sit in spans with class "v". Drop them so the sentence reads straight through.
export function htmlToText(html) {
  const source = String(html || '');
  if (!source) return '';
  if (typeof DOMParser === 'undefined') {
    return collapseSpace(source.replace(/<[^>]+>/g, ' '));
  }
  const doc = new DOMParser().parseFromString(source, 'text/html');
  doc.querySelectorAll('[class~="v"]').forEach((node) => node.remove());
  return collapseSpace(doc.body.textContent || '');
}

export function normalizeSearchResults(data) {
  const passages = Array.isArray(data?.passages) ? data.passages : [];
  const verses = Array.isArray(data?.verses) ? data.verses : [];
  const rows = passages.length ? passages : verses;

  return {
    total: passages.length ? rows.length : (data?.total ?? rows.length),
    results: rows.map((row) => ({
      id: row.id,
      bibleId: row.bibleId,
      reference: row.reference || row.id,
      text: passages.length ? htmlToText(row.content) : collapseSpace(row.text),
    })).filter((row) => row.text),
  };
}

export function resultSummary(shown, total) {
  if (!shown) return '';
  if (total > shown) return `Showing ${shown} of ${total} matches`;
  return shown === 1 ? '1 match' : `${shown} matches`;
}

// Long passages stay whole in storage. The row shows the stretch that contains the match.
export function snippetAroundMatch(text, query) {
  const source = collapseSpace(text);
  if (source.length <= SNIPPET_LIMIT) return source;

  const terms = searchTerms(query);
  const found = terms.length
    ? new RegExp(terms.map(escapeRegExp).join('|'), 'i').exec(source)
    : null;

  if (!found) {
    return `${source.slice(0, wordEnd(source, SNIPPET_LIMIT)).trim()}…`;
  }

  const rawStart = Math.max(0, found.index - 70);
  const rawEnd = Math.min(source.length, found.index + found[0].length + 180);
  const start = rawStart === 0 ? 0 : wordStart(source, rawStart);
  const end = rawEnd === source.length ? source.length : wordEnd(source, rawEnd);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';
  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

export function highlightParts(text, query) {
  const source = String(text || '');
  const terms = searchTerms(query);
  if (!source || terms.length === 0) return [{ text: source, match: false }];

  const pattern = new RegExp(
    `([A-Za-z0-9']*(?:${terms.map(escapeRegExp).join('|')})[A-Za-z0-9']*)`,
    'ig'
  );
  return source.split(pattern).filter(Boolean).map((part) => ({
    text: part,
    match: terms.some((term) => part.toLowerCase().includes(term.toLowerCase())),
  }));
}
