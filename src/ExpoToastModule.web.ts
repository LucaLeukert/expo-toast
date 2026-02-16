import { NativeModule, registerWebModule } from 'expo';

import type {
  ExpoToastModuleEvents,
  NativeToastPayload,
  NativeToastQueueConfig,
  NativeToastTransitionPayload,
  ToastId,
} from './ExpoToast.types';

class ExpoToastWebModule extends NativeModule<ExpoToastModuleEvents> {
  show(_payload: NativeToastPayload): void {}

  transition(_payload: NativeToastTransitionPayload): void {}

  setQueueConfig(_payload: NativeToastQueueConfig): void {}

  dismiss(_id?: ToastId): void {}

  dismissAll(): void {}

  isSupported(): boolean {
    return false;
  }
}

export default registerWebModule(ExpoToastWebModule, 'ExpoToast');
