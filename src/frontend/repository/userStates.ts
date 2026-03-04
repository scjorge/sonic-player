export const USER_STATES_KEY = 'user_states';

interface UserStatesMap {
  [screenKey: string]: any;
}

function loadStore(): UserStatesMap {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(USER_STATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as UserStatesMap;
    }
  } catch (e) {
    console.error('Erro ao ler user_states do localStorage', e);
  }
  return {};
}

function saveStore(store: UserStatesMap) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(USER_STATES_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Erro ao salvar user_states no localStorage', e);
  }
}

export function getUserState<T = any>(screenKey: string): T | undefined {
  const store = loadStore();
  const value = store[screenKey];
  if (value === undefined || value === null) return undefined;
  return value as T;
}

export function setUserState<T extends object = any>(screenKey: string, partialState: Partial<T>): void {
  const store = loadStore();
  const previous = (store[screenKey] && typeof store[screenKey] === 'object') ? store[screenKey] : {};
  store[screenKey] = { ...previous, ...partialState };
  saveStore(store);
}

const LAST_VIEW_KEY = '__last_view_mode';

export function getLastViewMode<T = string>(): T | undefined {
  const store = loadStore();
  const value = store[LAST_VIEW_KEY];
  if (!value) return undefined;
  return value as T;
}

export function setLastViewMode(viewMode: string): void {
  const store = loadStore();
  store[LAST_VIEW_KEY] = viewMode;
  saveStore(store);
}
