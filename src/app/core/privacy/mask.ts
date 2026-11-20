/** Pure helpers that hide sensitive values for display. Masking is a UI control, not a security boundary. */

export const MASK_CHAR = '•';

/**
 * Same length as the input. Keeps the first character of the local part, the first character
 * of the host and the tld; every other character becomes the mask character ('@' and '.' kept).
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) {
    return MASK_CHAR.repeat(email.length);
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  const hide = (text: string) => text.replace(/[^.]/gu, MASK_CHAR);

  return `${local[0]}${hide(local.slice(1))}@${host[0] ?? ''}${hide(host.slice(1))}${tld}`;
}

/** Same character count as `Rp. 15.000.000,00`, so revealing never changes the width. */
export function maskAmount(): string {
  const dots = (n: number) => MASK_CHAR.repeat(n);
  return `Rp. ${dots(2)}.${dots(3)}.${dots(3)},${dots(2)}`;
}

/**
 * Same character count as `15 May 1990` by default. Pass `length` to match a longer
 * format (for example a date with time); the shape is then a plain run of mask characters.
 */
export function maskDate(length?: number): string {
  if (length !== undefined && length > 0) {
    return MASK_CHAR.repeat(length);
  }
  return `${MASK_CHAR.repeat(2)} ${MASK_CHAR.repeat(3)} ${MASK_CHAR.repeat(4)}`;
}

/**
 * Replaces every letter and digit with the mask character and keeps punctuation and spaces,
 * except for a leading `Rp.` currency prefix, so the result has exactly the same length as the input (`Rp. 4.700.000,00` becomes
 * `Rp. •.•••.•••,••`).
 */
export function maskLike(value: string): string {
  const prefix = /^Rp\./.exec(value)?.[0] ?? '';
  return prefix + value.slice(prefix.length).replace(/[\p{L}\p{N}]/gu, MASK_CHAR);
}
