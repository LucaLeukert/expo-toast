import { NativeModule, requireNativeModule } from 'expo';

import type {
  ExpoToastModuleEvents,
  NativeToastPayload,
  NativeToastQueueConfig,
  NativeToastTransitionPayload,
  ToastId,
} from './ExpoToast.types';

/**
 * Typed native bridge surface exposed by the iOS module.
 *
 * This declaration mirrors the methods implemented in Swift and keeps payloads
 * type-safe for JS callers.
 */
declare class ExpoToastModule extends NativeModule<ExpoToastModuleEvents> {
  /**
   * Requests native presentation of a new toast.
   */
  show(payload: NativeToastPayload): void;
  /**
   * Requests native transition of an existing toast.
   */
  transition(payload: NativeToastTransitionPayload): void;
  /**
   * Updates native queue behavior for visible/pending toast limits.
   */
  setQueueConfig(payload: NativeToastQueueConfig): void;
  /**
   * Dismisses one toast when id is provided; dismisses all when omitted.
   */
  dismiss(id?: ToastId): void;
  /**
   * Dismisses all visible and queued toasts.
   */
  dismissAll(): void;
  /**
   * Returns whether native runtime support is currently available.
   */
  isSupported(): boolean;
}

/**
 * Concrete module shape used by the runtime, including typed event listeners.
 */
type ExpoToastModuleLike = ExpoToastModule & {
  addListener: <K extends keyof ExpoToastModuleEvents>(
    eventName: K,
    listener: ExpoToastModuleEvents[K],
  ) => { remove: () => void };
};

let moduleInstance: ExpoToastModuleLike;

try {
  moduleInstance = requireNativeModule<ExpoToastModuleLike>('ExpoToast');
} catch (error) {
  /**
   * Fall back to a no-op shim when the native module is unavailable.
   *
   * This keeps public APIs safe to call in unsupported environments or when a
   * dev build has not been rebuilt after installation.
   */
  if (__DEV__) {
    console.warn(
      '[expo-toast] Native module "ExpoToast" failed to load. Rebuild your iOS app/dev client so the native module is linked.',
      error,
    );
  }
  moduleInstance = {
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    removeAllListeners: () => {},
    emit: () => {},
    listenerCount: () => 0,
    show: () => {},
    transition: () => {},
    setQueueConfig: () => {},
    dismiss: () => {},
    dismissAll: () => {},
    isSupported: () => false,
  } as unknown as ExpoToastModuleLike;
}

/**
 * Runtime module instance used by the toast API.
 */
export default moduleInstance;
