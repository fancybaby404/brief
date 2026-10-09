import type { Profile } from '../types';

/** Short bullet items from a free-text profile field (lines, semicolons, bullets; commas only for skill lists). */
export function listItems(text: string, max = 3, commas = false) {
  return text.split(commas ? /\n|;|•|,/ : /\n|;|•/).map(s => s.replace(/^[\s\-*·]+/, '').trim()).filter(Boolean).slice(0, max);
}

/** True once the user attached a resume or typed any career detail. */
export const hasProfileDetails = (p: Profile) => !!(p.resumeUri || p.experience.trim() || p.education.trim() || p.skills.trim() || p.goals.trim());
