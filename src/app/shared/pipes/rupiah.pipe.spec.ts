import { RupiahPipe } from './rupiah.pipe';

describe('RupiahPipe', () => {
  const pipe = new RupiahPipe();

  it('formats zero', () => {
    expect(pipe.transform(0)).toBe('Rp. 0,00');
  });

  it('uses dot thousands separators and comma decimals', () => {
    expect(pipe.transform(5_000_000)).toBe('Rp. 5.000.000,00');
  });

  it('formats fractional amounts', () => {
    expect(pipe.transform(1234.5)).toBe('Rp. 1.234,50');
  });

  it('formats negative amounts', () => {
    expect(pipe.transform(-1_500_000)).toBe('Rp. -1.500.000,00');
  });

  it('formats large amounts', () => {
    expect(pipe.transform(1_234_567_890.12)).toBe('Rp. 1.234.567.890,12');
  });

  it('falls back to zero for null/undefined/NaN', () => {
    expect(pipe.transform(null)).toBe('Rp. 0,00');
    expect(pipe.transform(undefined)).toBe('Rp. 0,00');
    expect(pipe.transform(Number.NaN)).toBe('Rp. 0,00');
  });
});
