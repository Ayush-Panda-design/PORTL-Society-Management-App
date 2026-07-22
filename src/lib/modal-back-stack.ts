type DismissFn = () => void;

const stack: DismissFn[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Register a modal/sheet dismiss handler. Latest registration wins on Android back. */
export function pushModalDismiss(dismiss: DismissFn): () => void {
  stack.push(dismiss);
  notify();
  return () => {
    const index = stack.lastIndexOf(dismiss);
    if (index >= 0) stack.splice(index, 1);
    notify();
  };
}

/** Close the topmost registered modal. Returns true if one was closed. */
export function dismissTopModal(): boolean {
  const dismiss = stack[stack.length - 1];
  if (!dismiss) return false;
  dismiss();
  return true;
}

export function hasOpenModal(): boolean {
  return stack.length > 0;
}

export function subscribeModalStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
