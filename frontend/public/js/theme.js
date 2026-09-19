// Theme manager for CYBN (Connect Your Brain Neurons)
// Handles dark/light mode detection, persistence, and synchronization across tabs and elements.

(function () {
  const THEME_KEY = 'cybn_theme';

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButtons(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.js-theme-toggle');
    buttons.forEach((btn) => {
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      btn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      const iconContainer = btn.querySelector('.js-theme-icon') || btn;
      if (theme === 'dark') {
        // Render Sun icon (to switch to light)
        iconContainer.innerHTML = `
          <svg class="h-4 w-4 text-spark transition-transform duration-300 rotate-0 hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>`;
      } else {
        // Render Moon icon (to switch to dark)
        iconContainer.innerHTML = `
          <svg class="h-4 w-4 text-dendrite transition-transform duration-300 rotate-0 hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>`;
      }
    });
  }

  // Initial immediate application to avoid FOUC
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Expose global controller
  window.cybnTheme = {
    get: () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    set: applyTheme,
    toggle: toggleTheme,
    updateButtons: () => updateToggleButtons(window.cybnTheme.get()),
  };

  // Wire up click listeners when DOM loads
  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(window.cybnTheme.get());
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.js-theme-toggle');
      if (toggleBtn) {
        e.preventDefault();
        toggleTheme();
      }
    });
  });

  // Listen to OS preference changes if user hasn't explicitly set one
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
