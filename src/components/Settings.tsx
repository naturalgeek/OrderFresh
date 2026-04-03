import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { listTools } from '../services/knuspr.ts';

export function Settings() {
  const { config, updateConfig } = useApp();

  const [rkEmail, setRkEmail] = useState(config.rkEmail);
  const [rkPassword, setRkPassword] = useState(config.rkPassword);
  const [showRkPassword, setShowRkPassword] = useState(false);
  const [rkSaved, setRkSaved] = useState(false);

  const [knusprEmail, setKnusprEmail] = useState(config.knusprEmail);
  const [knusprPassword, setKnusprPassword] = useState(config.knusprPassword);
  const [knusprPrompt, setKnusprPrompt] = useState(config.knusprPrompt);
  const [showKnusprPassword, setShowKnusprPassword] = useState(false);
  const [knusprSaved, setKnusprSaved] = useState(false);
  const [knusprTools, setKnusprTools] = useState<string | null>(null);
  const [knusprTesting, setKnusprTesting] = useState(false);

  const [openaiApiKey, setOpenaiApiKey] = useState(config.openaiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [openaiSaved, setOpenaiSaved] = useState(false);

  useEffect(() => {
    setRkEmail(config.rkEmail);
    setRkPassword(config.rkPassword);
  }, [config.rkEmail, config.rkPassword]);

  useEffect(() => {
    setKnusprEmail(config.knusprEmail);
    setKnusprPassword(config.knusprPassword);
    setKnusprPrompt(config.knusprPrompt);
  }, [config.knusprEmail, config.knusprPassword, config.knusprPrompt]);

  useEffect(() => {
    setOpenaiApiKey(config.openaiApiKey);
  }, [config.openaiApiKey]);

  const handleRkSave = async () => {
    await updateConfig({ ...config, rkEmail, rkPassword });
    setRkSaved(true);
    setTimeout(() => setRkSaved(false), 2000);
  };

  const handleKnusprSave = async () => {
    await updateConfig({ ...config, knusprEmail, knusprPassword, knusprPrompt });
    setKnusprSaved(true);
    setTimeout(() => setKnusprSaved(false), 2000);
  };

  const handleOpenaiSave = async () => {
    await updateConfig({ ...config, openaiApiKey });
    setOpenaiSaved(true);
    setTimeout(() => setOpenaiSaved(false), 2000);
  };

  const handleKnusprTest = async () => {
    setKnusprTesting(true);
    setKnusprTools(null);
    try {
      const tools = await listTools(knusprEmail, knusprPassword);
      const cartTools = tools.filter(t =>
        t.name.toLowerCase().includes('cart') ||
        t.name.toLowerCase().includes('basket') ||
        t.name.toLowerCase().includes('search')
      );
      const header = `Found ${tools.length} tools total. Relevant: ${cartTools.length}\n\n`;
      const section = cartTools.map(t => `${t.name}: ${t.description || '(no description)'}`).join('\n\n');
      setKnusprTools(header + section);
    } catch (err) {
      setKnusprTools(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setKnusprTesting(false);
    }
  };

  const rkChanged = rkEmail !== config.rkEmail || rkPassword !== config.rkPassword;
  const knusprChanged = knusprEmail !== config.knusprEmail || knusprPassword !== config.knusprPassword || knusprPrompt !== config.knusprPrompt;
  const openaiChanged = openaiApiKey !== config.openaiApiKey;

  const maskedKey = openaiApiKey
    ? openaiApiKey.substring(0, 7) + '...' + openaiApiKey.substring(openaiApiKey.length - 4)
    : '';

  return (
    <div className="settings-container">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>RecipeKeeper Account</h3>
        <p className="settings-description">
          Enter your RecipeKeeper credentials to fetch your shopping lists.
          Credentials are stored locally in your browser.
        </p>

        <div className="api-key-input">
          <label htmlFor="rkEmail">Email</label>
          <div className="input-group">
            <input
              id="rkEmail"
              type="email"
              value={rkEmail}
              onChange={(e) => setRkEmail(e.target.value)}
              placeholder="your@email.com"
              className="api-key-field"
            />
          </div>
        </div>

        <div className="api-key-input">
          <label htmlFor="rkPassword">Password</label>
          <div className="input-group">
            <input
              id="rkPassword"
              type={showRkPassword ? 'text' : 'password'}
              value={rkPassword}
              onChange={(e) => setRkPassword(e.target.value)}
              placeholder="Password"
              className="api-key-field"
            />
            <button
              className="toggle-visibility"
              onClick={() => setShowRkPassword(!showRkPassword)}
              type="button"
            >
              {showRkPassword ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}
            </button>
          </div>
        </div>

        <button
          className="save-btn"
          onClick={handleRkSave}
          disabled={!rkChanged}
        >
          {rkSaved ? 'Saved!' : 'Save RecipeKeeper Settings'}
        </button>
      </div>

      <div className="settings-section">
        <h3>Knuspr Grocery Ordering</h3>
        <p className="settings-description">
          Enter your Knuspr account credentials to order items from your shopping list.
          Credentials are stored locally in your browser.
        </p>

        <div className="api-key-input">
          <label htmlFor="knusprEmail">Email</label>
          <div className="input-group">
            <input
              id="knusprEmail"
              type="email"
              value={knusprEmail}
              onChange={(e) => setKnusprEmail(e.target.value)}
              placeholder="your@email.com"
              className="api-key-field"
            />
          </div>
        </div>

        <div className="api-key-input">
          <label htmlFor="knusprPassword">Password</label>
          <div className="input-group">
            <input
              id="knusprPassword"
              type={showKnusprPassword ? 'text' : 'password'}
              value={knusprPassword}
              onChange={(e) => setKnusprPassword(e.target.value)}
              placeholder="Password"
              className="api-key-field"
            />
            <button
              className="toggle-visibility"
              onClick={() => setShowKnusprPassword(!showKnusprPassword)}
              type="button"
            >
              {showKnusprPassword ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}
            </button>
          </div>
        </div>

        <div className="dietary-input">
          <label htmlFor="knusprPrompt">Search Prompt (Optional)</label>
          <textarea
            id="knusprPrompt"
            value={knusprPrompt}
            onChange={(e) => setKnusprPrompt(e.target.value)}
            placeholder="e.g., prefer organic, cheapest option, brand X..."
            className="dietary-field"
            rows={2}
          />
          <p className="settings-hint">
            This text is prepended to every product search to customize results.
          </p>
        </div>

        <button
          className="save-btn"
          onClick={handleKnusprSave}
          disabled={!knusprChanged}
        >
          {knusprSaved ? 'Saved!' : 'Save Knuspr Settings'}
        </button>

        {knusprEmail && knusprPassword && (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              className="save-btn"
              onClick={handleKnusprTest}
              disabled={knusprTesting}
              style={{ background: '#666' }}
            >
              {knusprTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        )}

        {knusprTools && (
          <pre className="tools-output">
            {knusprTools}
          </pre>
        )}
      </div>

      <div className="settings-section">
        <h3>OpenAI API Key</h3>
        <p className="settings-description">
          Required for extracting shopping lists from images and URLs using AI.
          Your key is stored locally and only sent to OpenAI.
        </p>

        <div className="api-key-input">
          <label htmlFor="openaiApiKey">API Key</label>
          <div className="input-group">
            <input
              id="openaiApiKey"
              type={showApiKey ? 'text' : 'password'}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              className="api-key-field"
            />
            <button
              className="toggle-visibility"
              onClick={() => setShowApiKey(!showApiKey)}
              type="button"
            >
              {showApiKey ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}
            </button>
          </div>
          {config.openaiApiKey && !showApiKey && (
            <p className="current-key">Current: {maskedKey}</p>
          )}
        </div>

        <button
          className="save-btn"
          onClick={handleOpenaiSave}
          disabled={!openaiChanged}
        >
          {openaiSaved ? 'Saved!' : 'Save API Key'}
        </button>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <p>
          OrderFresh connects your RecipeKeeper shopping lists with Knuspr grocery
          delivery. You can also create quick shopping lists from recipe URLs or
          photos using AI.
        </p>
        <p className="disclaimer">
          <strong>Privacy:</strong> All credentials are stored locally in your browser.
          They are only sent to their respective services (RecipeKeeper, Knuspr, OpenAI).
        </p>
      </div>
    </div>
  );
}
