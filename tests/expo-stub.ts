type Listener = (event: any) => void;

const listeners = new Map<string, Set<Listener>>();

export const __nativeMock = {
  showCalls: [] as any[],
  transitionCalls: [] as any[],
  queueConfigCalls: [] as any[],
  dismissCalls: [] as any[],
  dismissAllCount: 0,
  supported: true,
  reset() {
    this.showCalls = [];
    this.transitionCalls = [];
    this.queueConfigCalls = [];
    this.dismissCalls = [];
    this.dismissAllCount = 0;
    listeners.clear();
    this.supported = true;
  },
  emit(eventName: string, event: any) {
    const eventListeners = listeners.get(eventName);
    if (!eventListeners) {
      return;
    }
    for (const listener of eventListeners) {
      listener(event);
    }
  },
};

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
    addListener: (eventName: string, listener: Listener) => {
      let eventListeners = listeners.get(eventName);
      if (!eventListeners) {
        eventListeners = new Set();
        listeners.set(eventName, eventListeners);
      }
      eventListeners.add(listener);
      return {
        remove: () => {
          eventListeners?.delete(listener);
        },
      };
    },
    removeListener: () => {},
    removeAllListeners: () => {},
    emit: () => {},
    listenerCount: () => 0,
    show: (payload: any) => {
      __nativeMock.showCalls.push(payload);
    },
    transition: (payload: any) => {
      __nativeMock.transitionCalls.push(payload);
    },
    setQueueConfig: (payload: any) => {
      __nativeMock.queueConfigCalls.push(payload);
    },
    dismiss: (id?: string) => {
      __nativeMock.dismissCalls.push(id);
    },
    dismissAll: () => {
      __nativeMock.dismissAllCount += 1;
    },
    isSupported: () => __nativeMock.supported,
  } as T;
}
