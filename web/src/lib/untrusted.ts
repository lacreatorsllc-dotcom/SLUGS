// Text other people write (usernames, display names, agent and token names) is data:
// SLUGS shows it and copies it, and never treats it as instructions or builds a Baum
// request out of it. Baum requests carry wallets and codes, which are checked formats.
//
// Before showing or copying such text, this takes out what can hide or disguise it:
// control characters, zero-width and invisible characters, and bidi overrides that
// can make an address or a name read differently from what it is. It also keeps it
// to one line and a sane length, so a "name" can't carry a page of instructions.

// C0/C1 controls, soft hyphen, Arabic letter mark, Hangul fillers, Mongolian vowel
// separator, zero-width and direction marks, bidi embeddings, overrides and isolates,
// word joiner and invisible operators, BOM, interlinear annotation marks.
// eslint-disable-next-line no-control-regex -- removing control characters is the point
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2069\u3164\ufeff\ufff9-\ufffb]/g

/** Plain, single-line text of at most `max` characters; '' for anything that isn't a string. */
export function plainText(value: unknown, max = 64): string {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/g, ' ').replace(HIDDEN, '').replace(/ {2,}/g, ' ').trim()
  const chars = [...text]
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : text
}

/** Like plainText, but null when nothing is left. */
export const plainOrNull = (value: unknown, max = 64) => plainText(value, max) || null
