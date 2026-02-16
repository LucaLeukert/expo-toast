import { NativeModule, registerWebModule } from 'expo';

import type {
  ExpoToastModuleEvents,
  NativeToastPayload,
  NativeToastQueueConfig,
  NativeToastTransitionPayload,
  ToastId,
} from './ExpoToast.types';

/**
 * Web fallback module implementation.
 *
 * All methods are intentional no-ops so the public API can be called safely on
 * unsupported runtimes without conditional guards in app code.
 */
class ExpoToastWebModule extends NativeModule<ExpoToastModuleEvents> {
  /**
   * No-op on web.
   */
  show(_payload: NativeToastPayload): void {}

  /**
   * No-op on web.
   */
  transition(_payload: NativeToastTransitionPayload): void {}

  /**
   * No-op on web.
   */
  setQueueConfig(_payload: NativeToastQueueConfig): void {}

  /**
   * No-op on web.
   */
  dismiss(_id?: ToastId): void {}

  /**
   * No-op on web.
   */
  dismissAll(): void {}

  /**
   * Returns `false` on web because the native presenter is iOS-only in v1.
   */
  isSupported(): boolean {
    return false;
  }
}

/**
 * Registered web module instance used by Expo's module registry.
 */
export default registerWebModule(ExpoToastWebModule, 'ExpoToast');
