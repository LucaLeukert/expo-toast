import { describe, expect, it } from 'vitest';

import { normalizeDuration, parseIOSMajorVersion, runtimeSupportsToastFor } from '../src/toast';

describe('normalizeDuration', () => {
  it('maps duration tokens', () => {
    expect(normalizeDuration('short', 'info')).toBe(2000);
    expect(normalizeDuration('long', 'info')).toBe(4500);
    expect(normalizeDuration('infinite', 'info')).toBe(-1);
  });

  it('uses default durations by variant', () => {
    expect(normalizeDuration(undefined, 'info')).toBe(3000);
    expect(normalizeDuration(undefined, 'loading')).toBe(-1);
  });

  it('normalizes number durations', () => {
    expect(normalizeDuration(1234.7, 'info')).toBe(1235);
    expect(normalizeDuration(-10, 'info')).toBe(0);
  });
});

describe('runtime support', () => {
  it('parses iOS major versions', () => {
    expect(parseIOSMajorVersion('26.0')).toBe(26);
    expect(parseIOSMajorVersion('26.1.2')).toBe(26);
    expect(parseIOSMajorVersion(26)).toBe(26);
  });

  it('gates support to iOS 26+', () => {
    expect(runtimeSupportsToastFor('ios', '26.0')).toBe(true);
    expect(runtimeSupportsToastFor('ios', '25.9')).toBe(false);
    expect(runtimeSupportsToastFor('android', 34)).toBe(false);
  });
});
