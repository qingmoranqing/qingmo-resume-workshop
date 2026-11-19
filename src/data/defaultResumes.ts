import type { ResumeDoc } from '../types/resume';
import { TEMPLATE_LIBRARY } from './templateLibrary';

function pickTemplate(id: string, fallbackIdx: number): ResumeDoc {
  const found = TEMPLATE_LIBRARY.find((entry) => entry.id === id) || TEMPLATE_LIBRARY[fallbackIdx];
  return JSON.parse(JSON.stringify(found.doc)) as ResumeDoc;
}

/**
 * Clean universal starter resumes for first-time visitors (zero personal data).
 * Showcases two contrasting styles while all 12 cross-industry templates + custom role generator
 * remain 1-click accessible in the Template Gallery.
 */
export const DEFAULT_RESUMES: ResumeDoc[] = [
  {
    ...pickTemplate('tpl-tech-data', 0),
    id: 'starter-modern',
    name: '示例一 · 现代精致（通用职场）',
  },
  {
    ...pickTemplate('tpl-humanities-edu', 1),
    id: 'starter-humanities',
    name: '示例二 · 人文书卷（文科/教培）',
  },
];
