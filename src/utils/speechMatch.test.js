import {
  advancePracticeCursor,
  diffWords,
  isSilenceHallucination,
  normalizeWords,
} from './speechMatch';

const VERSE = normalizeWords(
  'For God so loved the world that he gave his one and only Son'
);

describe('advancePracticeCursor', () => {
  it('advances through an exact recitation, including function words with their neighbor', () => {
    const next = advancePracticeCursor(VERSE, 0, VERSE);
    expect(next).toBe(VERSE.length);
  });

  it('skips words that are not the next scripture word', () => {
    const next = advancePracticeCursor(VERSE, 0, ['um', 'For', 'God', 'noise', 'so', 'loved']);
    expect(next).toBe(4);
  });

  it('does not advance on a lone function word', () => {
    const next = advancePracticeCursor(VERSE, 4, ['the']);
    expect(next).toBe(4);
  });

  it('advances a function word when the next word matches too', () => {
    const next = advancePracticeCursor(VERSE, 4, ['the', 'world']);
    expect(next).toBe(6);
  });

  it('accepts a one-character slip on a longer word', () => {
    const next = advancePracticeCursor(VERSE, 3, ['love']);
    expect(next).toBe(4);
  });

  it('does not fuzzy-match a short word', () => {
    const next = advancePracticeCursor(VERSE, 1, ['good', 'so']);
    expect(next).toBe(1);
  });

  it('does not jump ahead to a later copy of the next word', () => {
    const next = advancePracticeCursor(VERSE, 0, ['God', 'so', 'loved']);
    expect(next).toBe(0);
  });
});

describe('diffWords', () => {
  const expected = ['For', 'God', 'so', 'loved', 'the', 'world'];

  it('marks an identical recitation correct', () => {
    const diff = diffWords(expected, expected);
    expect(diff.every((token) => token.type === 'equal')).toBe(true);
    expect(diff).toHaveLength(expected.length);
  });

  it('keeps the words after a skipped word correct', () => {
    const diff = diffWords(expected, ['For', 'God', 'loved', 'the', 'world']);
    expect(diff.map((token) => token.type)).toEqual([
      'equal', 'equal', 'del', 'equal', 'equal', 'equal',
    ]);
    expect(diff[2].expected).toBe('so');
  });

  it('marks an extra word and a substitution', () => {
    const diff = diffWords(expected, ['For', 'Lord', 'so', 'loved', 'the', 'whole', 'world']);
    expect(diff.map((token) => token.type)).toEqual([
      'equal', 'sub', 'equal', 'equal', 'equal', 'ins', 'equal',
    ]);
    expect(diff[1]).toMatchObject({ expected: 'God', spoken: 'Lord' });
    expect(diff[5]).toMatchObject({ spoken: 'whole' });
  });

  it('ignores punctuation and case', () => {
    const diff = diffWords(['world,'], ['World']);
    expect(diff[0].type).toBe('equal');
  });
});

describe('isSilenceHallucination', () => {
  it('drops empty text and known silence phrases', () => {
    expect(isSilenceHallucination('')).toBe(true);
    expect(isSilenceHallucination('Thanks for watching.')).toBe(true);
  });

  it('keeps a real recitation', () => {
    expect(isSilenceHallucination('For God so loved')).toBe(false);
  });
});
