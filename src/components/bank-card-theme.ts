import { Colors } from '../../constants/colors';

export type CardPattern = 'contour' | 'ribbon' | 'orbit' | 'facets';

export interface BankCardTheme {
  accent: string;
  base: string;
  raised: string;
  deep: string;
  highlight: string;
  pattern: CardPattern;
  offset: number;
}

function mix(color: string, target: string, amount: number): string {
  const channels = [1, 3, 5].map((position) => {
    const from = parseInt(color.slice(position, position + 2), 16);
    const to = parseInt(target.slice(position, position + 2), 16);
    return Math.round(from + (to - from) * amount).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

/** The bank identity chooses the engraving; its saved color chooses the finish. */
export function createBankCardTheme(
  colorCode?: string | null,
  identity = 'vestro',
): BankCardTheme {
  const accent = /^#[0-9a-f]{6}$/i.test(colorCode?.trim() ?? '')
    ? colorCode!.trim()
    : Colors.backgroundDark;
  const normalized = identity.trim().toLowerCase().replace(/\s+/g, ' ');
  let seed = 0;
  for (const character of normalized) {
    seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
  }

  const patterns: CardPattern[] = ['contour', 'ribbon', 'orbit', 'facets'];
  return {
    accent,
    base: mix(accent, '#0c111b', 0.8),
    raised: mix(accent, '#0c111b', 0.66),
    deep: mix(accent, '#080b12', 0.9),
    highlight: mix(accent, '#ffffff', 0.35),
    pattern: patterns[seed % patterns.length],
    offset: seed % 37,
  };
}

export function bankCardHeight(kind: 'standard' | 'credit', fontScale = 1): number {
  const base = kind === 'credit' ? 244 : 212;
  const textHeight = kind === 'credit' ? 170 : 140;
  return Math.round(base + Math.max(0, fontScale - 1) * textHeight);
}
