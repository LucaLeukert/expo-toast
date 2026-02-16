export class NativeModule<Events extends Record<string, (...args: any[]) => void>> {
  addListener<K extends keyof Events>(_eventName: K, _listener: Events[K]) {
    return { remove: () => {} };
  }

  removeListener() {}

  removeAllListeners() {}

  emit() {}

  listenerCount() {
    return 0;
  }
}

export function requireNativeModule<T>(): T {
  return {
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    removeAllListeners: () => {},
    emit: () => {},
    listenerCount: () => 0,
    show: () => {},
    dismiss: () => {},
    dismissAll: () => {},
    isSupported: () => false,
  } as T;
}
