/**
 * CYBN PWA Engine — Service Worker lifecycle, install prompt management & offline indicators
 */

(function initPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          // Check for worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  if (typeof toast === 'function') {
                    toast('CYBN updated in background. Refresh for latest version.', 'default');
                  }
                }
              });
            }
          });
        })
        .catch((err) => {
          console.debug('[PWA] Service worker registration skipped:', err);
        });
    });
  }

  // 2. Install Prompt Handling
  let deferredPrompt = null;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

  function getInstallButtons() {
    return document.querySelectorAll('.js-pwa-install-btn, #pwa-install-btn, #mobile-pwa-install-btn');
  }

  function showInstallButtons() {
    if (isStandalone) return;
    getInstallButtons().forEach((btn) => {
      btn.classList.remove('hidden');
      btn.style.display = '';
    });
  }

  function hideInstallButtons() {
    getInstallButtons().forEach((btn) => {
      btn.classList.add('hidden');
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButtons();
    if (typeof toast === 'function') {
      toast('CYBN successfully installed!', 'success');
    }
  });

  // Handle install clicks
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-pwa-install-btn, #pwa-install-btn, #mobile-pwa-install-btn');
    if (!btn) return;
    e.preventDefault();

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        hideInstallButtons();
      }
      deferredPrompt = null;
    } else {
      // If browser didn't fire beforeinstallprompt (e.g. iOS Safari, or already installed)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        if (typeof showConfirmModal === 'function') {
          await showConfirmModal({
            title: 'Install CYBN on iOS',
            message: 'To install CYBN: Tap the Share button (⎋) at the bottom of Safari, then choose "Add to Home Screen" (+).',
            confirmText: 'Got it',
            cancelText: 'Close',
          });
        } else {
          alert('To install CYBN: Tap the Share button at the bottom of Safari, then choose "Add to Home Screen".');
        }
      } else {
        if (typeof toast === 'function') {
          toast('To install: click the Install icon (⊕) in your browser address bar.', 'default');
        }
      }
    }
  });

  // If not standalone and in a compatible browser, make sure button is discoverable
  if (!isStandalone) {
    // Allow users to see install button after small delay if supported
    setTimeout(() => {
      if (deferredPrompt) showInstallButtons();
    }, 1500);
  }
})();
