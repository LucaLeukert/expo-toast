import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadToastModule() {
  vi.resetModules();
  const native = await import('./expo-stub');
  native.__nativeMock.reset();
  const rn = await import('./react-native-stub');
  rn.__setReduceMotionEnabled(false);
  const toastModule = await import('../src/toast');
  return {
    ...toastModule,
    native,
    rn,
  };
}

describe('normalizeDuration', () => {
  it('maps duration tokens', async () => {
    const { normalizeDuration } = await loadToastModule();
    expect(normalizeDuration('short', 'info')).toBe(2000);
    expect(normalizeDuration('long', 'info')).toBe(4500);
    expect(normalizeDuration('infinite', 'info')).toBe(-1);
  });

  it('uses default durations by variant', async () => {
    const { normalizeDuration } = await loadToastModule();
    expect(normalizeDuration(undefined, 'info')).toBe(3000);
    expect(normalizeDuration(undefined, 'loading')).toBe(-1);
  });

  it('normalizes number durations', async () => {
    const { normalizeDuration } = await loadToastModule();
    expect(normalizeDuration(1234.7, 'info')).toBe(1235);
    expect(normalizeDuration(-10, 'info')).toBe(0);
  });
});

describe('runtime support', () => {
  it('parses iOS major versions', async () => {
    const { parseIOSMajorVersion } = await loadToastModule();
    expect(parseIOSMajorVersion('26.0')).toBe(26);
    expect(parseIOSMajorVersion('26.1.2')).toBe(26);
    expect(parseIOSMajorVersion(26)).toBe(26);
  });

  it('gates support to iOS 26+', async () => {
    const { runtimeSupportsToastFor } = await loadToastModule();
    expect(runtimeSupportsToastFor('ios', '26.0')).toBe(true);
    expect(runtimeSupportsToastFor('ios', '25.9')).toBe(false);
    expect(runtimeSupportsToastFor('android', 34)).toBe(false);
  });
});

describe('toast api', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('applies global defaults and queue config', async () => {
    const { toast, native } = await loadToastModule();

    toast.configure({
      position: 'bottom',
      size: 'fill-width',
      maxVisible: 2,
      maxQueue: 8,
      dropPolicy: 'newest',
    });

    toast.info('Configured defaults');

    expect(native.__nativeMock.queueConfigCalls.at(-1)).toEqual({
      maxVisible: 2,
      maxQueue: 8,
      dropPolicy: 'newest',
    });

    expect(native.__nativeMock.showCalls).toHaveLength(1);
    expect(native.__nativeMock.showCalls[0].position).toBe('bottom');
    expect(native.__nativeMock.showCalls[0].size).toBe('fill-width');
  });

  it('supports update alias', async () => {
    const { toast, native } = await loadToastModule();

    const id = toast.loading('Working...');
    toast.update(id, { message: 'Done', variant: 'success', duration: 'short' });

    expect(native.__nativeMock.transitionCalls).toHaveLength(1);
    expect(native.__nativeMock.transitionCalls[0]).toMatchObject({
      id,
      variant: 'success',
      message: 'Done',
      durationMs: 2000,
    });
  });

  it('deduplicates repeated messages in configured window', async () => {
    const { toast, native } = await loadToastModule();

    toast.configure({ dedupeWindowMs: 1000 });

    const firstId = toast.info('Duplicate me');
    const secondId = toast.info('Duplicate me');

    expect(secondId).toBe(firstId);
    expect(native.__nativeMock.showCalls).toHaveLength(1);
  });

  it('provides action event payload to callbacks', async () => {
    const { toast, native } = await loadToastModule();

    const onAction = vi.fn();
    const id = toast.error('Request failed', {
      title: 'Network',
      position: 'bottom',
      action: {
        label: 'Retry',
        onPress: onAction,
      },
    });

    native.__nativeMock.emit('onToastActionPress', { id });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith({
      id,
      variant: 'error',
      title: 'Network',
      message: 'Request failed',
      position: 'bottom',
    });
  });

  it('uses motion preference to control reduced motion payload', async () => {
    const { toast, native, rn } = await loadToastModule();

    toast.configure({ motion: 'system' });
    rn.__setReduceMotionEnabled(true);
    toast.info('System reduced');

    toast.info('Forced full', { motion: 'full' });
    toast.info('Forced minimal', { motion: 'minimal' });

    expect(native.__nativeMock.showCalls[0].reducedMotion).toBe(true);
    expect(native.__nativeMock.showCalls[1].reducedMotion).toBe(false);
    expect(native.__nativeMock.showCalls[2].reducedMotion).toBe(true);
  });

  it('transitions with toast.promise on success and error', async () => {
    const { toast, native } = await loadToastModule();

    await expect(
      toast.promise(Promise.resolve('ok'), {
        loading: 'Loading',
        success: (value) => `Success ${value}`,
        error: 'Nope',
      }),
    ).resolves.toBe('ok');

    await expect(
      toast.promise(Promise.reject(new Error('boom')), {
        loading: 'Loading 2',
        success: 'Done',
        error: (error) => `Err ${(error as Error).message}`,
      }),
    ).rejects.toThrow('boom');

    expect(native.__nativeMock.showCalls).toHaveLength(2);
    expect(native.__nativeMock.transitionCalls).toHaveLength(2);
    expect(native.__nativeMock.transitionCalls[0]).toMatchObject({
      variant: 'success',
      message: 'Success ok',
    });
    expect(native.__nativeMock.transitionCalls[1]).toMatchObject({
      variant: 'error',
      message: 'Err boom',
    });
  });
});
