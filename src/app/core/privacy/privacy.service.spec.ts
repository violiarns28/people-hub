import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogService } from '../audit/audit-log.service';
import { maskAmount, maskDate, maskEmail, maskLike } from './mask';
import { AUTO_REMASK_MS, PrivacyService } from './privacy.service';

describe('mask helpers', () => {
  it('masks an email but keeps the first letters and tld', () => {
    const masked = maskEmail('jane.doe@peoplehub.dev');
    expect(masked.startsWith('j')).toBe(true);
    expect(masked.endsWith('.dev')).toBe(true);
    expect(masked).not.toContain('jane');
    expect(masked).not.toContain('peoplehub');
    expect(masked).toHaveLength('jane.doe@peoplehub.dev'.length);
    expect(masked).toBe(
      'j\u2022\u2022\u2022.\u2022\u2022\u2022@p\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022.dev',
    );
  });

  it('maskLike keeps punctuation and length for any amount', () => {
    expect(maskLike('Rp. 4.700.000,00')).toBe(
      'Rp. \u2022.\u2022\u2022\u2022.\u2022\u2022\u2022,\u2022\u2022',
    );
    for (const v of [
      'Rp. 100.000,00',
      'Rp. 4.700.000,00',
      'Rp. 15.000.000,00',
      'Rp. 1.234.567.890,00',
    ]) {
      expect(maskLike(v)).toHaveLength(v.length);
      expect(maskLike(v)).not.toMatch(/\d/);
    }
    expect(maskLike('15 May 1990')).toBe(
      '\u2022\u2022 \u2022\u2022\u2022 \u2022\u2022\u2022\u2022',
    );
  });

  it('email mask length always equals the real length', () => {
    for (const e of [
      'a@b.co',
      'jane.doe@peoplehub.dev',
      'a.very.long.name.indeed@sub.example.co.id',
    ]) {
      expect(maskEmail(e)).toHaveLength(e.length);
      expect(maskEmail(e).includes('@')).toBe(true);
    }
    expect(maskEmail('nope')).toHaveLength(4);
  });

  it('masks malformed emails fully', () => {
    expect(maskEmail('nope')).not.toContain('nope');
  });

  it('returns fixed-width amount and date masks', () => {
    expect(maskAmount()).toMatch(/^Rp\. /);
    expect(maskAmount()).not.toMatch(/\d/);
    expect(maskDate()).not.toMatch(/\d/);
    expect(maskAmount()).toHaveLength('Rp. 15.000.000,00'.length);
    expect(maskDate()).toHaveLength('15 May 1990'.length);
    expect(maskDate(18)).toHaveLength(18);
  });
});

describe('PrivacyService', () => {
  let privacy: PrivacyService;
  let audit: AuditLogService;

  beforeEach(() => {
    vi.useFakeTimers();
    privacy = TestBed.inject(PrivacyService);
    audit = TestBed.inject(AuditLogService);
  });

  afterEach(() => vi.useRealTimers());

  it('masks everything by default', () => {
    expect(privacy.isRevealed('jane', 'email')).toBe(false);
  });

  it('reveals one field and audits it', () => {
    privacy.toggle('jane', 'email');
    expect(privacy.isRevealed('jane', 'email')).toBe(true);
    expect(privacy.isRevealed('jane', 'basicSalary')).toBe(false);
    expect(audit.forSubject('jane')[0]).toMatchObject({ action: 'reveal', field: 'email' });
  });

  it('hides again on a second toggle', () => {
    privacy.toggle('jane', 'email');
    privacy.toggle('jane', 'email');
    expect(privacy.isRevealed('jane', 'email')).toBe(false);
    expect(audit.forSubject('jane')[0].action).toBe('hide');
  });

  it('re-masks automatically after the timeout', () => {
    privacy.toggle('jane', 'email');
    vi.advanceTimersByTime(AUTO_REMASK_MS + 1);
    expect(privacy.isRevealed('jane', 'email')).toBe(false);
  });

  it('reveal all covers every subject and re-masks automatically', () => {
    privacy.toggleAll();
    expect(privacy.isRevealed('anyone', 'basicSalary')).toBe(true);
    vi.advanceTimersByTime(AUTO_REMASK_MS + 1);
    expect(privacy.revealAll()).toBe(false);
  });

  it('clear() re-masks everything at once', () => {
    privacy.toggle('jane', 'email');
    privacy.toggleAll();
    privacy.clear();
    expect(privacy.isRevealed('jane', 'email')).toBe(false);
    expect(privacy.revealAll()).toBe(false);
  });
});
