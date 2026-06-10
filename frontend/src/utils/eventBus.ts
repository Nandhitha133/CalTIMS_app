type Listener = (...args: any[]) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(eventName: string, listener: Listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(listener);
  }

  off(eventName: string, listener: Listener) {
    this.listeners.get(eventName)?.delete(listener);
  }

  emit(eventName: string, ...args: any[]) {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return;
    listeners.forEach((listener) => listener(...args));
  }
}

export const appEventBus = new EventBus();
