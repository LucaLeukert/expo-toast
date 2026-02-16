import { NativeModule, registerWebModule } from 'expo';

import type {
  ExpoToastModuleEvents,
  NativeToastPayload,
  NativeToastTransitionPayload,
  ToastId,
} from './ExpoToast.types';

class ExpoToastWebModule extends NativeModule<ExpoToastModuleEvents> {
  show(_payload: NativeToastPayload): void {}

  transition(_payload: NativeToastTransitionPayload): void {}

  dismiss(_id?: ToastId): void {}

  dismissAll(): void {}

  isSupported(): boolean {
    return false;
  }
}

export default registerWebModule(ExpoToastWebModule, 'ExpoToast');
