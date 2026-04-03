import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { ShoppingList } from './components/ShoppingList.tsx';
import { QuickList } from './components/QuickList.tsx';
import { Settings } from './components/Settings.tsx';
import { InstallPrompt } from './components/InstallPrompt.tsx';
import './App.css';

type Tab = 'shopping' | 'quick' | 'settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('shopping');
  const { isLoading, error, setError } = useApp();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <InstallPrompt />
      {error && (
        <div className="global-error">
          {error}
          <button className="dismiss-error" onClick={() => setError(null)}>&times;</button>
        </div>
      )}
      <header className="app-header">
        <h1>OrderFresh</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeTab === 'shopping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shopping')}
          >
            Shopping List
          </button>
          <button
            className={`nav-btn ${activeTab === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick')}
          >
            Quick List
          </button>
          <button
            className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'settings' ? (
          <Settings />
        ) : activeTab === 'quick' ? (
          <QuickList />
        ) : (
          <ShoppingList />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
