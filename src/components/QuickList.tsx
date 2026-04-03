import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { extractItemsFromUrl, extractItemsFromImage } from '../services/openai.ts';
import { searchProducts, addToCart } from '../services/knuspr.ts';
import type { QuickListItem } from '../types/index.ts';
import type { KnusprProduct } from '../services/knuspr.ts';

interface CartState {
  status: 'idle' | 'searching' | 'results' | 'adding' | 'added' | 'error';
  products: KnusprProduct[];
  error?: string;
}

export function QuickList() {
  const { config, quickItems, setQuickItems, addQuickItem, toggleQuickItem, removeQuickItem, clearQuickItems, setError } = useApp();

  const [recipeUrl, setRecipeUrl] = useState('');
  const [manualItem, setManualItem] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [cartStates, setCartStates] = useState<Record<string, CartState>>({});
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const knusprConfigured = !!(config.knusprEmail && config.knusprPassword);

  const handleFetchUrl = async () => {
    if (!recipeUrl.trim()) return;
    if (!config.openaiApiKey) {
      setError('Configure your OpenAI API key in Settings first');
      return;
    }

    setIsFetching(true);
    setError(null);
    try {
      const items = await extractItemsFromUrl(recipeUrl, config.openaiApiKey);
      const newItems: QuickListItem[] = items.map(name => ({
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        checked: false,
      }));
      setQuickItems([...quickItems, ...newItems]);
      setRecipeUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract items from URL');
    } finally {
      setIsFetching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (!config.openaiApiKey) {
      setError('Configure your OpenAI API key in Settings first');
      return;
    }

    setIsFetching(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const items = await extractItemsFromImage(dataUrl, config.openaiApiKey);
        const newItems: QuickListItem[] = items.map(name => ({
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          checked: false,
        }));
        setQuickItems([...quickItems, ...newItems]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to extract items from image');
      } finally {
        setIsFetching(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be uploaded again
    e.target.value = '';
  };

  const handleAddManualItem = () => {
    const trimmed = manualItem.trim();
    if (!trimmed) return;
    // Support multi-line paste
    const lines = trimmed.split('\n').map(l => l.replace(/^[-*\d.)\]]+\s*/, '').trim()).filter(Boolean);
    for (const line of lines) {
      addQuickItem(line);
    }
    setManualItem('');
  };

  const handleSearchProduct = useCallback(async (item: QuickListItem) => {
    if (!knusprConfigured) return;
    setCartStates(s => ({ ...s, [item.id]: { status: 'searching', products: [] } }));
    try {
      const products = await searchProducts(item.name, config.knusprEmail, config.knusprPassword, config.knusprPrompt);
      setCartStates(s => ({ ...s, [item.id]: { status: 'results', products } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setCartStates(s => ({ ...s, [item.id]: { status: 'error', products: [], error: msg } }));
    }
  }, [config.knusprEmail, config.knusprPassword, config.knusprPrompt, knusprConfigured]);

  const handleAddToCart = useCallback(async (product: KnusprProduct, item: QuickListItem) => {
    setCartStates(s => ({ ...s, [item.id]: { ...s[item.id], status: 'adding' } }));
    try {
      await addToCart([{ productId: product.id, quantity: 1 }], config.knusprEmail, config.knusprPassword);
      setCartStates(s => ({ ...s, [item.id]: { ...s[item.id], status: 'added' } }));
      setCartMessage(`Added "${product.name}" to cart`);
      setTimeout(() => setCartMessage(null), 3000);
      // Tick the item
      if (!item.checked) {
        toggleQuickItem(item.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add to cart';
      setCartStates(s => ({ ...s, [item.id]: { ...s[item.id], status: 'error', error: msg } }));
    }
  }, [config.knusprEmail, config.knusprPassword, toggleQuickItem]);

  const closePopup = useCallback((itemId: string) => {
    setCartStates(s => ({ ...s, [itemId]: { status: 'idle', products: [] } }));
  }, []);

  const unchecked = quickItems.filter(i => !i.checked);
  const checked = quickItems.filter(i => i.checked);

  return (
    <div className="quick-list-container">
      <div className="quick-list-input">
        <h3>Quick Shopping List</h3>
        <p className="paste-description">
          Create a shopping list from a recipe URL, photo, or add items manually. This list is session-only.
        </p>

        <div className="url-input-section">
          <label htmlFor="recipeUrl">Recipe URL:</label>
          <div className="url-input-group">
            <input
              id="recipeUrl"
              type="url"
              className="url-field"
              placeholder="https://example.com/recipe..."
              value={recipeUrl}
              onChange={(e) => setRecipeUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
            />
            <button
              className="fetch-btn"
              onClick={handleFetchUrl}
              disabled={isFetching || !recipeUrl.trim() || !config.openaiApiKey}
            >
              {isFetching ? 'Extracting...' : 'Extract'}
            </button>
          </div>
        </div>

        <div className="input-divider">
          <span>or upload a photo</span>
        </div>

        <div className="image-upload-section compact">
          <label className="image-upload-zone compact">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              disabled={isFetching}
            />
            <span className="upload-icon">&#x1F4F7;</span>
            <span>{isFetching ? 'Processing...' : 'Upload photo of recipe or shopping list'}</span>
          </label>
        </div>

        <div className="input-divider">
          <span>or add items manually</span>
        </div>

        <div className="manual-input-group">
          <input
            type="text"
            className="manual-item-field"
            placeholder="Type an item and press Enter..."
            value={manualItem}
            onChange={(e) => setManualItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
          />
          <button
            className="add-item-btn"
            onClick={handleAddManualItem}
            disabled={!manualItem.trim()}
          >
            Add
          </button>
        </div>

        {!config.openaiApiKey && (
          <p className="config-warning">Configure OpenAI API key in Settings for URL/image extraction</p>
        )}
      </div>

      {quickItems.length > 0 && (
        <div className="quick-list-items">
          <div className="quick-list-header">
            <span className="item-count">{unchecked.length} items{checked.length > 0 ? `, ${checked.length} done` : ''}</span>
            <button className="clear-btn-inline" onClick={clearQuickItems}>Clear All</button>
          </div>

          {cartMessage && <div className="cart-message">{cartMessage}</div>}

          <ul className="shopping-items">
            {unchecked.map(item => (
              <QuickItem
                key={item.id}
                item={item}
                cartState={cartStates[item.id]}
                knusprConfigured={knusprConfigured}
                onToggle={() => toggleQuickItem(item.id)}
                onRemove={() => removeQuickItem(item.id)}
                onSearch={() => handleSearchProduct(item)}
                onAddToCart={(product) => handleAddToCart(product, item)}
                onClosePopup={() => closePopup(item.id)}
              />
            ))}
            {checked.length > 0 && unchecked.length > 0 && (
              <li className="checked-separator">Completed</li>
            )}
            {checked.map(item => (
              <QuickItem
                key={item.id}
                item={item}
                cartState={cartStates[item.id]}
                knusprConfigured={knusprConfigured}
                onToggle={() => toggleQuickItem(item.id)}
                onRemove={() => removeQuickItem(item.id)}
                onSearch={() => handleSearchProduct(item)}
                onAddToCart={(product) => handleAddToCart(product, item)}
                onClosePopup={() => closePopup(item.id)}
              />
            ))}
          </ul>

          {!knusprConfigured && (
            <p className="config-warning">Configure Knuspr credentials in Settings to order items</p>
          )}
        </div>
      )}
    </div>
  );
}

interface QuickItemProps {
  item: QuickListItem;
  cartState?: CartState;
  knusprConfigured: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onSearch: () => void;
  onAddToCart: (product: KnusprProduct) => void;
  onClosePopup: () => void;
}

function QuickItem({ item, cartState, knusprConfigured, onToggle, onRemove, onSearch, onAddToCart, onClosePopup }: QuickItemProps) {
  return (
    <li className={`shopping-item ${item.checked ? 'checked' : ''}`}>
      <label className="item-checkbox">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
        />
        <span className={`item-name ${item.checked ? 'strikethrough' : ''}`}>{item.name}</span>
      </label>

      <div className="item-actions">
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
                        <span>Select product for: <strong>{item.name}</strong></span>
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
        <button className="remove-item-btn" onClick={onRemove} title="Remove item">&times;</button>
      </div>
    </li>
  );
}
