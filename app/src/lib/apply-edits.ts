import type { ClaudeEdit } from './chat-types';

export interface ApplyResult {
  newMdxx: string;
  applied: number;
  failed: ClaudeEdit[];
}

const SEPARATOR = '----------------------------------------';

export function applyEdits(mdxxSource: string, edits: ClaudeEdit[]): ApplyResult {
  // Split into sections on the first separator only (preserve section 3+)
  const firstSep = mdxxSource.indexOf(SEPARATOR);
  let section1: string;
  let section2: string;
  let rest: string;

  if (firstSep === -1) {
    section1 = mdxxSource;
    section2 = '';
    rest = '';
  } else {
    section1 = mdxxSource.slice(0, firstSep);
    const afterFirst = mdxxSource.slice(firstSep + SEPARATOR.length);
    const secondSep = afterFirst.indexOf(SEPARATOR);
    if (secondSep === -1) {
      section2 = afterFirst;
      rest = '';
    } else {
      section2 = afterFirst.slice(0, secondSep);
      rest = afterFirst.slice(secondSep); // includes the separator
    }
  }

  let applied = 0;
  const failed: ClaudeEdit[] = [];

  for (const edit of edits) {
    // Skip no-op edits where search and replace are identical
    if (edit.search !== '' && edit.search === edit.replace) {
      applied++;
      continue;
    }

    if (edit.section === 1) {
      if (edit.search === '') {
        section1 = section1.trimEnd() + '\n\n' + edit.replace + '\n';
        applied++;
      } else if (section1.includes(edit.search)) {
        section1 = section1.replace(edit.search, edit.replace);
        applied++;
      } else {
        failed.push(edit);
      }
    } else if (edit.section === 2) {
      if (edit.search === '') {
        section2 = section2.trimEnd() + '\n\n' + edit.replace + '\n';
        applied++;
      } else if (section2.includes(edit.search)) {
        section2 = section2.replace(edit.search, edit.replace);
        applied++;
      } else {
        failed.push(edit);
      }
    }
  }

  const newMdxx = `${section1.trimEnd()}\n\n${SEPARATOR}\n\n${section2.trimEnd()}${rest ? '\n\n' + rest.trimStart() : ''}`;
  return { newMdxx: newMdxx.trimEnd(), applied, failed };
}
