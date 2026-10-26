import {
  highlightParts,
  htmlToText,
  normalizeSearchResults,
  resultSummary,
  snippetAroundMatch,
} from './scriptureSearch';

const JOHN_HTML = '<p class="p"><span data-number="16" data-sid="JHN 3:16" class="v">16</span><span class="wj">For God so loved the world, that he gave his only born</span> <span class="wj">Son, that whoever believes in him should not perish, but have eternal life. </span> </p>';

describe('htmlToText', () => {
  it('drops verse numbers and tags', () => {
    expect(htmlToText(JOHN_HTML)).toBe(
      'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.'
    );
  });
});

describe('normalizeSearchResults', () => {
  it('keeps the reference and plain text for a keyword search', () => {
    const normalized = normalizeSearchResults({
      total: 667,
      verses: [{
        id: 'JHN.12.25',
        bibleId: 'bible',
        reference: 'John 12:25',
        text: 'He who loves his life will lose it.',
      }],
    });
    expect(normalized.total).toBe(667);
    expect(normalized.results[0]).toEqual({
      id: 'JHN.12.25',
      bibleId: 'bible',
      reference: 'John 12:25',
      text: 'He who loves his life will lose it.',
    });
  });

  it('turns a reference lookup into readable text', () => {
    const normalized = normalizeSearchResults({
      passages: [{
        id: 'JHN.3.16',
        bibleId: 'bible',
        reference: 'John 3:16',
        content: JOHN_HTML,
      }],
    });
    expect(normalized.results[0].reference).toBe('John 3:16');
    expect(normalized.results[0].text.startsWith('For God so loved')).toBe(true);
    expect(normalized.results[0].text.includes('<')).toBe(false);
  });
});

describe('highlightParts', () => {
  it('marks the matched word without swallowing the rest of the verse', () => {
    const parts = highlightParts('He who loves his life', 'love');
    expect(parts.map((part) => part.text).join('')).toBe('He who loves his life');
    expect(parts.find((part) => part.match).text).toBe('loves');
  });
});

describe('snippetAroundMatch', () => {
  it('keeps a short verse whole', () => {
    expect(snippetAroundMatch('He who loves his life will lose it.', 'love'))
      .toBe('He who loves his life will lose it.');
  });

  it('shows the matching stretch of a long passage', () => {
    const text = `BEGINNING ${'aaa '.repeat(80)}the shepherd leads the flock home. ${'zzz '.repeat(80)}ENDING`;
    const snippet = snippetAroundMatch(text, 'shepherd');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.includes('the shepherd leads the flock home.')).toBe(true);
    expect(snippet.includes('BEGINNING')).toBe(false);
    expect(snippet.includes('ENDING')).toBe(false);
  });
});

describe('resultSummary', () => {
  it('says when the list is only the first page of matches', () => {
    expect(resultSummary(20, 667)).toBe('Showing 20 of 667 matches');
    expect(resultSummary(1, 1)).toBe('1 match');
  });
});
