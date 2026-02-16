import { AccessibilityInfo, Platform } from 'react-native';

import type {
  ToastActionPressEvent,
  ToastConfig,
  ToastDismissEvent,
  ToastDropPolicy,
  ToastDuration,
  ToastId,
  ToastImportance,
  ToastMessageOptions,
  ToastMotionPreference,
  ToastOptions,
  ToastPosition,
  ToastPromiseMessages,
  ToastPromiseOptions,
  ToastShowEvent,
  ToastSize,
  ToastTransitionOptions,
  ToastVariant,
} from './ExpoToast.types';
import ExpoToastModule from './ExpoToastModule';

const SHORT_MS = 2000;
const DEFAULT_MS = 3000;
const LONG_MS = 4500;
const INFINITE_MS = -1;
const DEFAULT_MAX_VISIBLE = 3;
const DEFAULT_MAX_QUEUE = 50;

type ActiveToastState = {
  variant: ToastVariant;
  title: string | null;
  message: string;
  position: ToastPosition;
  dedupeKey: string | null;
  accessibilityLabel: string | null;
  announce: boolean;
  importance: ToastImportance;
  motion: ToastMotionPreference;
};

type ListenerEntry = {
  onShow?: (event: ToastShowEvent) => void;
  onDismiss?: (event: ToastDismissEvent) => void;
  onAction?: (event: ToastActionPressEvent) => void;
};

type DedupeEntry = {
  id: ToastId;
  timestamp: number;
};

type ToastRuntimeConfig = {
  duration?: ToastDuration;
  position: ToastPosition;
  size: ToastSize;
  haptics: boolean;
  announce: boolean;
  importance: ToastImportance;
  motion: ToastMotionPreference;
  dedupeWindowMs: number;
  maxVisible: number;
  maxQueue: number;
  dropPolicy: ToastDropPolicy;
};

let hasWarnedUnsupported = false;
let idCounter = 0;
let listenersInitialized = false;
let runtimeInitialized = false;
let reducedMotionEnabled = false;
let queueConfigSignature = '';

const callbacks = new Map<ToastId, ListenerEntry>();
const activeToasts = new Map<ToastId, ActiveToastState>();
const recentDedupe = new Map<string, DedupeEntry>();

const config: ToastRuntimeConfig = {
  duration: undefined,
  position: 'top',
  size: 'fit-content',
  haptics: true,
  announce: true,
  importance: 'normal',
  motion: 'system',
  dedupeWindowMs: 0,
  maxVisible: DEFAULT_MAX_VISIBLE,
  maxQueue: DEFAULT_MAX_QUEUE,
  dropPolicy: 'oldest',
};

export function parseIOSMajorVersion(version: string | number): number {
  if (typeof version === 'number') {
    return Math.trunc(version);
  }

  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : 0;
}

export function runtimeSupportsToastFor(os: string, version: string | number): boolean {
  return os === 'ios' && parseIOSMajorVersion(version) >= 26;
}

function runtimeSupportsToast(): boolean {
  return runtimeSupportsToastFor(Platform.OS, Platform.Version);
}

function warnUnsupportedOnce(): void {
  if (!__DEV__ || hasWarnedUnsupported) {
    return;
  }
  hasWarnedUnsupported = true;
  console.warn(
    '[expo-toast] Unsupported platform. Toast calls are no-op unless running on iOS 26+.',
  );
}

function normalizeQueueLimit(
  value: number | undefined,
  fallback: number,
  minValue: number,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minValue, Math.round(value));
}

function queueSignature(): string {
  return `${config.maxVisible}:${config.maxQueue}:${config.dropPolicy}`;
}

function ensureRuntime(): void {
  if (runtimeInitialized) {
    return;
  }
  runtimeInitialized = true;

  const isReduceMotionAvailable =
    AccessibilityInfo &&
    typeof AccessibilityInfo.isReduceMotionEnabled === 'function' &&
    typeof AccessibilityInfo.addEventListener === 'function';

  if (!isReduceMotionAvailable) {
    return;
  }

  void AccessibilityInfo.isReduceMotionEnabled()
    .then((value) => {
      reducedMotionEnabled = Boolean(value);
    })
    .catch(() => {});

  AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
    reducedMotionEnabled = Boolean(value);
  });
}

function ensureListeners(): void {
  if (listenersInitialized) {
    return;
  }
  listenersInitialized = true;

  ExpoToastModule.addListener('onToastShow', (event) => {
    const entry = callbacks.get(event.id);
    entry?.onShow?.(event);
  });

  ExpoToastModule.addListener('onToastDismiss', (event) => {
    const entry = callbacks.get(event.id);
    entry?.onDismiss?.(event);
    callbacks.delete(event.id);

    const metadata = activeToasts.get(event.id);
    if (metadata?.dedupeKey) {
      const dedupeEntry = recentDedupe.get(metadata.dedupeKey);
      if (dedupeEntry?.id === event.id) {
        recentDedupe.set(metadata.dedupeKey, {
          id: event.id,
          timestamp: Date.now(),
        });
      }
    }

    activeToasts.delete(event.id);
  });

  ExpoToastModule.addListener('onToastActionPress', (event) => {
    const entry = callbacks.get(event.id);
    const metadata = activeToasts.get(event.id);
    if (!metadata) {
      return;
    }
    entry?.onAction?.({
      id: event.id,
      variant: metadata.variant,
      title: metadata.title,
      message: metadata.message,
      position: metadata.position,
    });
  });
}

function nextToastId(): ToastId {
  idCounter += 1;
  return `toast_${Date.now()}_${idCounter}`;
}

export function normalizeDuration(
  duration: ToastDuration | undefined,
  variant: ToastVariant,
): number {
  if (duration === undefined) {
    return variant === 'loading' ? INFINITE_MS : DEFAULT_MS;
  }
  if (typeof duration === 'number') {
    return Math.max(0, Math.round(duration));
  }
  if (duration === 'short') {
    return SHORT_MS;
  }
  if (duration === 'long') {
    return LONG_MS;
  }
  return INFINITE_MS;
}

function isReducedMotionPreference(motion: ToastMotionPreference): boolean {
  if (motion === 'minimal') {
    return true;
  }
  if (motion === 'full') {
    return false;
  }
  return reducedMotionEnabled;
}

function isSupportedRuntime(): boolean {
  if (!runtimeSupportsToast()) {
    return false;
  }
  return ExpoToastModule.isSupported();
}

function ensureQueueConfig(): void {
  const nextSignature = queueSignature();
  if (queueConfigSignature === nextSignature) {
    return;
  }
  queueConfigSignature = nextSignature;
  ExpoToastModule.setQueueConfig({
    maxVisible: config.maxVisible,
    maxQueue: config.maxQueue,
    dropPolicy: config.dropPolicy,
  });
}

function resolveAnnounce(importance: ToastImportance, announce: boolean | undefined): boolean {
  if (announce !== undefined) {
    return announce;
  }
  if (importance === 'low') {
    return false;
  }
  return config.announce;
}

function dedupeFor(
  message: string,
  dedupeKey: string | undefined,
  windowMs: number,
): ToastId | null {
  if (windowMs <= 0) {
    return null;
  }

  const key = dedupeKey ?? message;
  const existing = recentDedupe.get(key);
  if (!existing) {
    return null;
  }

  if (Date.now() - existing.timestamp <= windowMs) {
    return existing.id;
  }

  return null;
}

function show(options: ToastOptions): ToastId {
  ensureRuntime();

  const id = options.id ?? nextToastId();
  const variant = options.variant ?? 'info';

  if (!isSupportedRuntime()) {
    warnUnsupportedOnce();
    return id;
  }

  ensureListeners();
  ensureQueueConfig();

  const dedupeId = dedupeFor(options.message, options.dedupeKey, config.dedupeWindowMs);
  if (dedupeId) {
    return dedupeId;
  }

  const position = options.position ?? config.position;
  const size = options.size ?? config.size;
  const haptics = options.haptics ?? config.haptics;
  const duration = options.duration ?? config.duration;
  const importance = options.importance ?? config.importance;
  const announce = resolveAnnounce(importance, options.announce);
  const motion = options.motion ?? config.motion;
  const dedupeKey = options.dedupeKey ?? options.message;
  const title = options.title ?? null;
  const accessibilityLabel = options.accessibilityLabel ?? null;

  callbacks.set(id, {
    onShow: options.onShow,
    onDismiss: options.onDismiss,
    onAction: options.action?.onPress,
  });

  activeToasts.set(id, {
    variant,
    title,
    message: options.message,
    position,
    dedupeKey,
    accessibilityLabel,
    announce,
    importance,
    motion,
  });
  recentDedupe.set(dedupeKey, { id, timestamp: Date.now() });

  ExpoToastModule.show({
    id,
    variant,
    title,
    message: options.message,
    actionLabel: options.action?.label ?? null,
    durationMs: normalizeDuration(duration, variant),
    position,
    size,
    haptics,
    accessibilityLabel,
    announce,
    importance,
    reducedMotion: isReducedMotionPreference(motion),
  });

  return id;
}

function transition(id: ToastId, options: ToastTransitionOptions): ToastId {
  ensureRuntime();

  if (!isSupportedRuntime()) {
    warnUnsupportedOnce();
    return id;
  }

  ensureListeners();
  ensureQueueConfig();

  const current = callbacks.get(id) ?? {};
  callbacks.set(id, {
    onShow: current.onShow,
    onDismiss: options.onDismiss ?? current.onDismiss,
    onAction: options.action === null ? undefined : (options.action?.onPress ?? current.onAction),
  });

  const actionLabel =
    options.action === undefined
      ? undefined
      : options.action === null
        ? null
        : options.action.label;

  const metadata = activeToasts.get(id);
  const nextImportance = options.importance ?? metadata?.importance ?? config.importance;
  const nextAnnounce = resolveAnnounce(nextImportance, options.announce ?? metadata?.announce);
  const nextMotion = options.motion ?? metadata?.motion ?? config.motion;

  ExpoToastModule.transition({
    id,
    variant: options.variant,
    title: options.title ?? undefined,
    message: options.message,
    actionLabel,
    clearAction: options.action === null,
    durationMs:
      options.duration === undefined
        ? undefined
        : normalizeDuration(options.duration, options.variant ?? 'info'),
    size: options.size,
    haptics: options.haptics,
    accessibilityLabel: options.accessibilityLabel,
    announce: nextAnnounce,
    importance: nextImportance,
    reducedMotion: isReducedMotionPreference(nextMotion),
  });

  if (metadata) {
    activeToasts.set(id, {
      variant: options.variant ?? metadata.variant,
      title: options.title ?? metadata.title,
      message: options.message ?? metadata.message,
      position: metadata.position,
      dedupeKey: metadata.dedupeKey,
      accessibilityLabel: options.accessibilityLabel ?? metadata.accessibilityLabel,
      announce: nextAnnounce,
      importance: nextImportance,
      motion: nextMotion,
    });
  }

  return id;
}

function withVariant(
  variant: ToastVariant,
  message: string,
  options?: ToastMessageOptions,
): ToastId {
  return show({
    ...(options ?? {}),
    variant,
    message,
  });
}

function dismiss(id?: ToastId): void {
  ensureRuntime();

  if (!isSupportedRuntime()) {
    warnUnsupportedOnce();
    if (id) {
      callbacks.delete(id);
      activeToasts.delete(id);
    }
    return;
  }
  ExpoToastModule.dismiss(id);
}

function dismissAll(): void {
  ensureRuntime();

  if (!isSupportedRuntime()) {
    warnUnsupportedOnce();
    callbacks.clear();
    activeToasts.clear();
    return;
  }
  ExpoToastModule.dismissAll();
}

function isSupported(): boolean {
  ensureRuntime();
  return isSupportedRuntime();
}

function configure(next: ToastConfig): void {
  ensureRuntime();

  if (next.duration !== undefined) {
    config.duration = next.duration;
  }
  if (next.position !== undefined) {
    config.position = next.position;
  }
  if (next.size !== undefined) {
    config.size = next.size;
  }
  if (next.haptics !== undefined) {
    config.haptics = next.haptics;
  }
  if (next.announce !== undefined) {
    config.announce = next.announce;
  }
  if (next.importance !== undefined) {
    config.importance = next.importance;
  }
  if (next.motion !== undefined) {
    config.motion = next.motion;
  }
  if (next.dedupeWindowMs !== undefined && Number.isFinite(next.dedupeWindowMs)) {
    config.dedupeWindowMs = Math.max(0, Math.round(next.dedupeWindowMs));
  }
  if (next.maxVisible !== undefined) {
    config.maxVisible = normalizeQueueLimit(next.maxVisible, DEFAULT_MAX_VISIBLE, 1);
  }
  if (next.maxQueue !== undefined) {
    config.maxQueue = normalizeQueueLimit(next.maxQueue, DEFAULT_MAX_QUEUE, 0);
  }
  if (next.dropPolicy !== undefined) {
    config.dropPolicy = next.dropPolicy;
  }

  if (!isSupportedRuntime()) {
    return;
  }

  ensureQueueConfig();
}

function update(id: ToastId, options: ToastTransitionOptions): ToastId {
  return transition(id, options);
}

function promise<T>(
  work: Promise<T>,
  messages: ToastPromiseMessages<T>,
  options?: ToastPromiseOptions,
): Promise<T> {
  const id = withVariant('loading', messages.loading, options?.loading);

  return work
    .then((value) => {
      const successMessage =
        typeof messages.success === 'function' ? messages.success(value) : messages.success;
      transition(id, {
        ...(options?.success ?? {}),
        variant: 'success',
        message: successMessage,
      });
      return value;
    })
    .catch((error: unknown) => {
      const errorMessage =
        typeof messages.error === 'function' ? messages.error(error) : messages.error;
      transition(id, {
        ...(options?.error ?? {}),
        variant: 'error',
        message: errorMessage,
      });
      throw error;
    });
}

export const toast = {
  show,
  transition,
  update,
  success(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('success', message, options);
  },
  error(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('error', message, options);
  },
  info(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('info', message, options);
  },
  loading(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('loading', message, options);
  },
  promise,
  configure,
  dismiss,
  dismissAll,
  isSupported,
};
