import { NativeModule, requireNativeModule } from 'expo';

import type {
  ExpoToastModuleEvents,
  NativeToastPayload,
  NativeToastTransitionPayload,
  ToastId,
} from './ExpoToast.types';

declare class ExpoToastModule extends NativeModule<ExpoToastModuleEvents> {
  show(payload: NativeToastPayload): void;
  transition(payload: NativeToastTransitionPayload): void;
  dismiss(id?: ToastId): void;
  dismissAll(): void;
  isSupported(): boolean;
}

type ExpoToastModuleLike = ExpoToastModule & {
  addListener: <K extends keyof ExpoToastModuleEvents>(
    eventName: K,
    listener: ExpoToastModuleEvents[K],
  ) => { remove: () => void };
};

let moduleInstance: ExpoToastModuleLike;

try {
  moduleInstance = requireNativeModule<ExpoToastModuleLike>('ExpoToast');
} catch {
  moduleInstance = {
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    removeAllListeners: () => {},
    emit: () => {},
    listenerCount: () => 0,
    show: () => {},
    transition: () => {},
    dismiss: () => {},
    dismissAll: () => {},
    isSupported: () => false,
  } as unknown as ExpoToastModuleLike;
}

export default moduleInstance;
