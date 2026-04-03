import { useState, useEffect } from 'react';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showDesktopToast, setShowDesktopToast] = useState(false);

  const isiOS = isIOS();
  const isAndroidDevice = isAndroid();
  const isMobileDevice = isMobile();

  useEffect(() => {
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    const desktopDismissed = localStorage.getItem('desktop-toast-dismissed');

    if ((isiOS || isAndroidDevice) && !isInStandaloneMode() && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }

    if (!isMobile() && !isInStandaloneMode() && !desktopDismissed) {
      const timer = setTimeout(() => setShowDesktopToast(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isiOS, isAndroidDevice]);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowFullPrompt(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  const handleDismissDesktopToast = () => {
    setShowDesktopToast(false);
    localStorage.setItem('desktop-toast-dismissed', 'true');
  };

  const handleShowInstructions = () => {
    setShowFullPrompt(true);
  };

  const handleCloseInstructions = () => {
    setShowFullPrompt(false);
  };

  if (!showBanner && !showDesktopToast) return null;

  return (
    <>
      {showDesktopToast && (
        <div className="desktop-ios-toast">
          <span className="toast-icon">&#x1F4F1;</span>
          <span className="toast-text">
            Available as a mobile app on iOS and Android! Open on your phone and add to Home Screen.
          </span>
          <button className="toast-close" onClick={handleDismissDesktopToast}>
            &times;
          </button>
        </div>
      )}

      {showBanner && !showFullPrompt && isMobileDevice && (
        <div className="install-banner">
          <span className="install-banner-text">
            Add to Home Screen for the best experience
          </span>
          <button className="install-banner-btn" onClick={handleShowInstructions}>
            How?
          </button>
          <button className="install-banner-close" onClick={handleDismiss}>
            &times;
          </button>
        </div>
      )}

      {showFullPrompt && isMobileDevice && (
        <div className="install-prompt-overlay">
          <div className="install-prompt">
            <div className="install-prompt-header">
              <h3>Add to Home Screen</h3>
              <button className="close-btn" onClick={handleCloseInstructions}>&times;</button>
            </div>

            {isiOS ? (
              <>
                <p>Install OrderFresh on your iPhone for quick access.</p>
                <div className="install-steps">
                  <div className="install-step">
                    <span className="step-number">1</span>
                    <span className="step-text">
                      Tap the <strong>Share</strong> button
                      <span className="share-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <polyline points="16 6 12 2 8 6"/>
                          <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                      </span>
                      at the bottom of Safari
                    </span>
                  </div>
                  <div className="install-step">
                    <span className="step-number">2</span>
                    <span className="step-text">
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                      <span className="add-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <line x1="12" y1="8" x2="12" y2="16"/>
                          <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                      </span>
                    </span>
                  </div>
                  <div className="install-step">
                    <span className="step-number">3</span>
                    <span className="step-text">
                      Tap <strong>"Add"</strong> in the top right corner
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>Install OrderFresh on your Android device for quick access.</p>
                <div className="install-steps">
                  <div className="install-step">
                    <span className="step-number">1</span>
                    <span className="step-text">
                      Tap the <strong>menu</strong> button
                      <span className="menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="19" r="2"/>
                        </svg>
                      </span>
                      in Chrome
                    </span>
                  </div>
                  <div className="install-step">
                    <span className="step-number">2</span>
                    <span className="step-text">
                      Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>
                    </span>
                  </div>
                  <div className="install-step">
                    <span className="step-number">3</span>
                    <span className="step-text">
                      Tap <strong>"Add"</strong> to confirm
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="install-prompt-actions">
              <button className="remind-btn" onClick={handleCloseInstructions}>
                Got it
              </button>
              <button className="got-it-btn" onClick={handleDismiss}>
                Don't show again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
