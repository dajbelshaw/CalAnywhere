/**
 * Curated set of 128 emoji for Emoji ID generation.
 * Must stay in sync with backend/src/auth/emoji-alphabet.ts.
 *
 * Selection criteria:
 * - Renders consistently across iOS, Android, Windows, macOS
 * - No flags, skin-tone variants, ZWJ sequences, or gender modifiers
 * - No visually ambiguous pairs
 * - Visually distinct at small sizes (16px+)
 */

export const EMOJI_ALPHABET: readonly string[] = [
  // Animals (24)
  '\u{1F436}', '\u{1F431}', '\u{1F42D}', '\u{1F439}', '\u{1F430}', '\u{1F98A}', '\u{1F43B}', '\u{1F43C}',
  '\u{1F428}', '\u{1F42F}', '\u{1F981}', '\u{1F42E}', '\u{1F437}', '\u{1F438}', '\u{1F435}', '\u{1F414}',
  '\u{1F427}', '\u{1F426}', '\u{1F986}', '\u{1F985}', '\u{1F989}', '\u{1F987}', '\u{1F43A}', '\u{1F417}',

  // Sea & nature creatures (8)
  '\u{1F419}', '\u{1F991}', '\u{1F980}', '\u{1F421}', '\u{1F42C}', '\u{1F433}', '\u{1F98B}', '\u{1F422}',

  // Food & drink (24)
  '\u{1F34E}', '\u{1F34A}', '\u{1F34B}', '\u{1F347}', '\u{1F353}', '\u{1F352}', '\u{1F95D}', '\u{1F951}',
  '\u{1F355}', '\u{1F354}', '\u{1F32E}', '\u{1F35C}', '\u{1F363}', '\u{1F366}', '\u{1F382}', '\u{1F369}',
  '\u{1F36A}', '\u{1F950}', '\u{1F9C0}', '\u{1F95A}', '\u{1F33D}', '\u{1F955}', '\u{1F344}', '\u{1F9CA}',

  // Nature (16)
  '\u{1F338}', '\u{1F33B}', '\u{1F339}', '\u{1F33F}', '\u{1F340}', '\u{1F341}', '\u{1F342}', '\u{1F30A}',
  '\u{1F319}', '\u2B50', '\u{1F308}', '\u26A1', '\u{1F525}', '\u2744\uFE0F', '\u{1F30D}', '\u{1F30B}',

  // Objects (24)
  '\u26BD', '\u{1F3C0}', '\u{1F3BE}', '\u{1F3C6}', '\u{1F3AF}', '\u{1F3B2}', '\u{1F3AE}', '\u{1F3B8}',
  '\u{1F3BA}', '\u{1F941}', '\u{1F3A8}', '\u{1F4F7}', '\u{1F52D}', '\u{1F52C}', '\u{1F4A1}', '\u{1F511}',
  '\u2693', '\u{1F9F2}', '\u{1F48E}', '\u{1F3FA}', '\u{1F9E9}', '\u{1FA84}', '\u{1F3AA}', '\u{1F3A0}',

  // Travel & places (16)
  '\u{1F680}', '\u2708\uFE0F', '\u{1F682}', '\u26F5', '\u{1F681}', '\u{1F3E0}', '\u{1F3F0}', '\u26FA',
  '\u{1F5FA}\uFE0F', '\u{1F9ED}', '\u{1F3D4}\uFE0F', '\u{1F305}', '\u{1F3A1}', '\u{1F5FC}', '\u{1F3DF}\uFE0F', '\u{1F309}',

  // Symbols & misc (16)
  '\u{1F49C}', '\u{1F49B}', '\u{1F49A}', '\u{1F499}', '\u{1F9E1}', '\u2764\uFE0F', '\u{1F5A4}', '\u{1F90D}',
  '\u2600\uFE0F', '\u{1F300}', '\u{1F4AB}', '\u{1F320}', '\u{1F386}', '\u{1F387}', '\u2728', '\u{1FA90}',
] as const;

export const EMOJI_ID_LENGTH = 3;
