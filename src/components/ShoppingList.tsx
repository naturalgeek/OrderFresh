import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { searchProducts, addToCart } from '../services/knuspr.ts';
import type { ShoppingListItem } from '../types/index.ts';
import type { KnusprProduct } from '../services/knuspr.ts';

interface CartState {
  status: 'idle' | 'searching' | 'results' | 'adding' | 'added' | 'error';
  products: KnusprProduct[];
  error?: string;
}

export function ShoppingList() {
  const {
    config, shoppingData, selectedListId, selectList,
    rkSyncing, rkSyncFailed, syncRecipeKeeper, toggleRkItem, error, setError,
  } = useApp();

  const [cartStates, setCartStates] = useState<Record<string, CartState>>({});
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const rkConfigured = !!(config.rkEmail && config.rkPassword);
  const knusprConfigured = !!(config.knusprEmail && config.knusprPassword);

  // Auto-sync on first load when credentials are configured (don't retry on failure)
  useEffect(() => {
    if (rkConfigured && !shoppingData && !rkSyncing && !rkSyncFailed) {
      syncRecipeKeeper();
    }
  }, [rkConfigured, shoppingData, rkSyncing, rkSyncFailed, syncRecipeKeeper]);

  const lists = shoppingData?.lists.sort((a, b) => a.Position - b.Position) || [];
  const selectedList = lists.find(l => l.Id === selectedListId);
  const items = shoppingData?.items
    .filter(i => i.ShoppingListId === selectedListId)
    .sort((a, b) => a.Position - b.Position) || [];

  const unchecked = items.filter(i => !i.IsChecked);
  const checked = items.filter(i => i.IsChecked);

  const handleSearchProduct = useCallback(async (item: ShoppingListItem) => {
    if (!knusprConfigured) return;
    setCartStates(s => ({ ...s, [item.Id]: { status: 'searching', products: [] } }));
    try {
      const products = await searchProducts(item.Name, config.knusprEmail, config.knusprPassword, config.knusprPrompt);
      setCartStates(s => ({ ...s, [item.Id]: { status: 'results', products } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setCartStates(s => ({ ...s, [item.Id]: { status: 'error', products: [], error: msg } }));
    }
  }, [config.knusprEmail, config.knusprPassword, config.knusprPrompt, knusprConfigured]);

  const handleAddToCart = useCallback(async (product: KnusprProduct, item: ShoppingListItem) => {
    setCartStates(s => ({ ...s, [item.Id]: { ...s[item.Id], status: 'adding' } }));
    try {
      await addToCart([{ productId: product.id, quantity: 1 }], config.knusprEmail, config.knusprPassword);
      setCartStates(s => ({ ...s, [item.Id]: { ...s[item.Id], status: 'added' } }));
      setCartMessage(`Added "${product.name}" to cart`);
      setTimeout(() => setCartMessage(null), 3000);
      // Tick the item in RecipeKeeper
      if (!item.IsChecked) {
        await toggleRkItem(item, true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add to cart';
      setCartStates(s => ({ ...s, [item.Id]: { ...s[item.Id], status: 'error', error: msg } }));
    }
  }, [config.knusprEmail, config.knusprPassword, toggleRkItem]);

  const closePopup = useCallback((itemId: string) => {
    setCartStates(s => ({ ...s, [itemId]: { status: 'idle', products: [] } }));
  }, []);

  if (!rkConfigured) {
    return (
      <div className="empty-state">
        <h3>Shopping List</h3>
        <p>Configure your RecipeKeeper credentials in Settings to fetch your shopping lists.</p>
      </div>
    );
  }

  return (
    <div className="shopping-list-container">
      <div className="shopping-header">
        <h3>Shopping List</h3>
        <div className="shopping-controls">
          {lists.length > 1 && (
            <select
              className="list-select"
              value={selectedListId || ''}
              onChange={(e) => selectList(e.target.value || null)}
            >
              {lists.map(l => (
                <option key={l.Id} value={l.Id}>{l.Name}</option>
              ))}
            </select>
          )}
          <button
            className="sync-btn"
            onClick={syncRecipeKeeper}
            disabled={rkSyncing}
          >
            {rkSyncing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error} <button className="dismiss-error" onClick={() => setError(null)}>&times;</button></div>}

      {selectedList && (
        <div className="list-title">
          <strong>{selectedList.Name}</strong>
          <span className="item-count">{unchecked.length} items{checked.length > 0 ? `, ${checked.length} done` : ''}</span>
        </div>
      )}

      {items.length === 0 && !rkSyncing && (
        <p className="empty-list">No items in this list.</p>
      )}

      {rkSyncing && items.length === 0 && (
        <div className="syncing-indicator">
          <div className="spinner"></div>
          <p>Syncing shopping lists...</p>
        </div>
      )}

      {cartMessage && <div className="cart-message">{cartMessage}</div>}

      <ul className="shopping-items">
        {unchecked.map(item => (
          <ShoppingItem
            key={item.Id}
            item={item}
            cartState={cartStates[item.Id]}
            knusprConfigured={knusprConfigured}
            onToggle={() => toggleRkItem(item, true)}
            onSearch={() => handleSearchProduct(item)}
            onAddToCart={(product) => handleAddToCart(product, item)}
            onClosePopup={() => closePopup(item.Id)}
          />
        ))}
        {checked.length > 0 && unchecked.length > 0 && (
          <li className="checked-separator">Completed</li>
        )}
        {checked.map(item => (
          <ShoppingItem
            key={item.Id}
            item={item}
            cartState={cartStates[item.Id]}
            knusprConfigured={knusprConfigured}
            onToggle={() => toggleRkItem(item, false)}
            onSearch={() => handleSearchProduct(item)}
            onAddToCart={(product) => handleAddToCart(product, item)}
            onClosePopup={() => closePopup(item.Id)}
          />
        ))}
      </ul>

      {!knusprConfigured && items.length > 0 && (
        <p className="config-warning">Configure Knuspr credentials in Settings to order items</p>
      )}
    </div>
  );
}

interface ShoppingItemProps {
  item: ShoppingListItem;
  cartState?: CartState;
  knusprConfigured: boolean;
  onToggle: () => void;
  onSearch: () => void;
  onAddToCart: (product: KnusprProduct) => void;
  onClosePopup: () => void;
}

function ShoppingItem({ item, cartState, knusprConfigured, onToggle, onSearch, onAddToCart, onClosePopup }: ShoppingItemProps) {
  return (
    <li className={`shopping-item ${item.IsChecked ? 'checked' : ''}`}>
      <label className="item-checkbox">
        <input
          type="checkbox"
          checked={item.IsChecked}
          onChange={onToggle}
        />
        <span className={`item-name ${item.IsChecked ? 'strikethrough' : ''}`}>{item.Name}</span>
      </label>

      {knusprConfigured && (
        <div className="item-cart">
          {(!cartState || cartState.status === 'idle') && (
            <button className="cart-search-btn" onClick={onSearch} title="Search on Knuspr">+</button>
          )}
          {cartState?.status === 'searching' && <span className="cart-spinner">...</span>}
          {cartState?.status === 'results' && (
            <div className="cart-results">
              {cartState.products.length === 0 ? (
                <span className="cart-no-results">No products found</span>
              ) : (
                <>
                  <div className="cart-results-backdrop" onClick={onClosePopup} />
                  <div className="cart-results-popup">
                    <div className="cart-popup-header">
                      <span>Select product for: <strong>{item.Name}</strong></span>
                      <button className="cart-popup-close" onClick={onClosePopup}>&times;</button>
                    </div>
                    <ul className="cart-product-list">
                      {cartState.products.slice(0, 5).map((p) => (
                        <li key={p.id} className="cart-product-item" onClick={() => onAddToCart(p)}>
                          {p.image && <img src={p.image} alt={p.name} className="cart-product-img" />}
                          <div className="cart-product-info">
                            <span className="cart-product-name">{p.name}</span>
                            <span className="cart-product-meta">
                              {p.unit && <span>{p.unit}</span>}
                              {p.price && <span className="cart-product-price">{p.price}</span>}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
          {cartState?.status === 'adding' && <span className="cart-spinner">Adding...</span>}
          {cartState?.status === 'added' && <span className="cart-added">Added</span>}
          {cartState?.status === 'error' && <span className="cart-error" title={cartState.error}>Failed</span>}
        </div>
      )}
    </li>
  );
}
