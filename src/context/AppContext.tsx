import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { AppConfig, ShoppingData, ShoppingListItem, QuickListItem } from '../types/index.ts';
import { getConfig, saveConfig } from '../services/storage.ts';
import { signIn, pullShoppingData, pushShoppingItemCheck } from '../services/recipekeeper.ts';

interface AppState {
  config: AppConfig;
  isLoading: boolean;
  error: string | null;
  // RecipeKeeper state
  rkToken: string | null;
  rkSyncing: boolean;
  rkSyncFailed: boolean;
  shoppingData: ShoppingData | null;
  selectedListId: string | null;
  // Quick list state
  quickItems: QuickListItem[];
}

interface AppContextType extends AppState {
  updateConfig: (config: AppConfig) => Promise<void>;
  setError: (error: string | null) => void;
  // RecipeKeeper actions
  syncRecipeKeeper: () => Promise<void>;
  toggleRkItem: (item: ShoppingListItem, checked: boolean) => Promise<void>;
  selectList: (listId: string | null) => void;
  // Quick list actions
  setQuickItems: (items: QuickListItem[]) => void;
  addQuickItem: (name: string) => void;
  toggleQuickItem: (id: string) => void;
  removeQuickItem: (id: string) => void;
  clearQuickItems: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    config: { rkEmail: '', rkPassword: '', knusprEmail: '', knusprPassword: '', knusprPrompt: '', openaiApiKey: '' },
    isLoading: true,
    error: null,
    rkToken: null,
    rkSyncing: false,
    rkSyncFailed: false,
    shoppingData: null,
    selectedListId: null,
    quickItems: [],
  });

  // Use refs for values needed in callbacks to avoid dependency churn
  const configRef = useRef(state.config);
  configRef.current = state.config;
  const rkTokenRef = useRef(state.rkToken);
  rkTokenRef.current = state.rkToken;

  useEffect(() => {
    const init = async () => {
      try {
        const config = await getConfig();
        setState(s => ({ ...s, config, isLoading: false }));
      } catch (error) {
        console.error('Failed to initialize:', error);
        setState(s => ({ ...s, isLoading: false, error: 'Failed to initialize app' }));
      }
    };
    init();
  }, []);

  const updateConfig = useCallback(async (config: AppConfig) => {
    await saveConfig(config);
    // Reset sync failed flag when config changes so user can retry
    setState(s => ({ ...s, config, rkSyncFailed: false }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(s => ({ ...s, error }));
  }, []);

  const syncRecipeKeeper = useCallback(async () => {
    const config = configRef.current;
    if (!config.rkEmail || !config.rkPassword) {
      setState(s => ({ ...s, error: 'Configure RecipeKeeper credentials in Settings first' }));
      return;
    }

    setState(s => ({ ...s, rkSyncing: true, error: null }));

    try {
      let token = rkTokenRef.current;
      if (!token) {
        token = await signIn(config.rkEmail, config.rkPassword);
        rkTokenRef.current = token;
        setState(s => ({ ...s, rkToken: token }));
      }

      try {
        const data = await pullShoppingData(token!);
        const listId = data.lists.length > 0
          ? data.lists.sort((a, b) => a.Position - b.Position)[0].Id
          : null;
        setState(s => ({
          ...s,
          shoppingData: data,
          selectedListId: s.selectedListId || listId,
          rkSyncing: false,
          rkSyncFailed: false,
        }));
      } catch (err) {
        if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
          token = await signIn(config.rkEmail, config.rkPassword);
          rkTokenRef.current = token;
          const data = await pullShoppingData(token);
          const listId = data.lists.length > 0
            ? data.lists.sort((a, b) => a.Position - b.Position)[0].Id
            : null;
          setState(s => ({
            ...s,
            rkToken: token,
            shoppingData: data,
            selectedListId: s.selectedListId || listId,
            rkSyncing: false,
            rkSyncFailed: false,
          }));
        } else {
          throw err;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setState(s => ({ ...s, rkSyncing: false, rkSyncFailed: true, error: msg }));
    }
  }, []); // stable reference - uses refs internally

  const toggleRkItem = useCallback(async (item: ShoppingListItem, checked: boolean) => {
    let token = rkTokenRef.current;
    const config = configRef.current;
    if (!token) return;

    // Optimistic update
    setState(s => {
      if (!s.shoppingData) return s;
      const items = s.shoppingData.items.map(i =>
        i.Id === item.Id
          ? { ...i, IsChecked: checked, CheckedDate: checked ? new Date().toISOString() : null }
          : i
      );
      return { ...s, shoppingData: { ...s.shoppingData, items } };
    });

    try {
      try {
        await pushShoppingItemCheck(token, item, checked);
      } catch (err) {
        if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
          token = await signIn(config.rkEmail, config.rkPassword);
          rkTokenRef.current = token;
          setState(s => ({ ...s, rkToken: token }));
          await pushShoppingItemCheck(token, item, checked);
        } else {
          throw err;
        }
      }
    } catch (err) {
      // Revert on failure
      setState(s => {
        if (!s.shoppingData) return s;
        const items = s.shoppingData.items.map(i =>
          i.Id === item.Id ? item : i
        );
        return {
          ...s,
          shoppingData: { ...s.shoppingData, items },
          error: err instanceof Error ? err.message : 'Failed to update item',
        };
      });
    }
  }, []); // stable reference - uses refs internally

  const selectList = useCallback((listId: string | null) => {
    setState(s => ({ ...s, selectedListId: listId }));
  }, []);

  // Quick list actions
  const setQuickItems = useCallback((items: QuickListItem[]) => {
    setState(s => ({ ...s, quickItems: items }));
  }, []);

  const addQuickItem = useCallback((name: string) => {
    const item: QuickListItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      checked: false,
    };
    setState(s => ({ ...s, quickItems: [...s.quickItems, item] }));
  }, []);

  const toggleQuickItem = useCallback((id: string) => {
    setState(s => ({
      ...s,
      quickItems: s.quickItems.map(i => i.id === id ? { ...i, checked: !i.checked } : i),
    }));
  }, []);

  const removeQuickItem = useCallback((id: string) => {
    setState(s => ({
      ...s,
      quickItems: s.quickItems.filter(i => i.id !== id),
    }));
  }, []);

  const clearQuickItems = useCallback(() => {
    setState(s => ({ ...s, quickItems: [] }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        updateConfig,
        setError,
        syncRecipeKeeper,
        toggleRkItem,
        selectList,
        setQuickItems,
        addQuickItem,
        toggleQuickItem,
        removeQuickItem,
        clearQuickItems,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
