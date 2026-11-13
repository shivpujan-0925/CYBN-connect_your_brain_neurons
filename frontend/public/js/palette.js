// Global Command Palette (Cmd+K / Ctrl+K) for CYBN
// Provides instant search across problems, quick navigation actions, and theme switching.

(function initCommandPalette() {
  let paletteModal = null;
  let problemsCache = null;
  let selectedIndex = 0;
  let currentItems = [];

  // Default quick command actions
  const DEFAULT_ACTIONS = [
    {
      id: 'cmd-add',
      title: 'Add New Problem',
      subtitle: 'Log a new Day 0 solve with spaced repetition',
      icon: '➕',
      type: 'action',
      run: () => { window.location.href = './add-problem.html'; }
    },
    {
      id: 'cmd-dashboard',
      title: 'Dashboard Overview',
      subtitle: 'Streaks, due revisions, and memory consolidation graph',
      icon: '🏠',
      type: 'action',
      run: () => { window.location.href = './dashboard.html'; }
    },
    {
      id: 'cmd-problems',
      title: 'All Tracked Problems',
      subtitle: 'Full list filtered by due, overdue, and mastered',
      icon: '📋',
      type: 'action',
      run: () => { window.location.href = './problems.html'; }
    },
    {
      id: 'cmd-stats',
      title: 'Stats & Retention Metrics',
      subtitle: 'Topic breakdown, difficulty spread, weekly activity',
      icon: '📊',
      type: 'action',
      run: () => { window.location.href = './stats.html'; }
    },
    {
      id: 'cmd-theme',
      title: 'Toggle Dark / Light Theme',
      subtitle: 'Switch visual appearance',
      icon: '🌓',
      type: 'action',
      run: () => {
        if (window.cybnTheme && window.cybnTheme.toggle) {
          window.cybnTheme.toggle();
        }
      }
    }
  ];

  async function getProblems() {
    if (problemsCache) return problemsCache;
    try {
      if (typeof api !== 'undefined' && api.problems && api.problems.list) {
        const { problems } = await api.problems.list();
        problemsCache = problems || [];
        return problemsCache;
      }
    } catch {
      // Not authenticated or network error
    }
    return [];
  }

  function createPaletteDOM() {
    if (paletteModal) return;

    paletteModal = document.createElement('div');
    paletteModal.id = 'cybn-command-palette';
    paletteModal.className = 'fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 hidden transition-opacity';
    paletteModal.setAttribute('role', 'dialog');
    paletteModal.setAttribute('aria-modal', 'true');

    paletteModal.innerHTML = `
      <div class="w-full max-w-xl rounded-2xl bg-white dark:bg-ink-800 border border-light-border dark:border-ink-600/70 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-fade-up">
        <!-- Input Header -->
        <div class="relative flex items-center px-4 border-b border-light-border dark:border-ink-600/50 bg-slate-50/50 dark:bg-ink-900/50">
          <svg class="h-4 w-4 text-spark shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="palette-input"
            type="text"
            placeholder="Type a command or search problems by name, topic, pattern..."
            class="w-full py-4 bg-transparent text-sm text-light-ink dark:text-paper placeholder:text-light-dim dark:placeholder:text-paper-dim focus:outline-none"
            autocomplete="off"
            spellcheck="false"
          />
          <button id="palette-close-btn" type="button" class="text-xs font-mono text-light-dim dark:text-paper-dim hover:text-light-ink dark:hover:text-paper px-2 py-1 rounded bg-slate-100 dark:bg-ink-700">
            ESC
          </button>
        </div>

        <!-- Results List -->
        <div id="palette-results" class="overflow-y-auto divide-y divide-light-border/40 dark:divide-ink-600/30 p-2 space-y-1">
          <!-- Dynamically populated -->
        </div>

        <!-- Footer -->
        <div class="px-4 py-2.5 border-t border-light-border/80 dark:border-ink-600/50 bg-slate-50/80 dark:bg-ink-900/60 flex items-center justify-between text-[11px] font-mono text-light-dim dark:text-paper-dim">
          <div class="flex items-center gap-3">
            <span><kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-ink-700 text-light-ink dark:text-paper">↑</kbd> <kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-ink-700 text-light-ink dark:text-paper">↓</kbd> navigate</span>
            <span><kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-ink-700 text-light-ink dark:text-paper">↵</kbd> select</span>
          </div>
          <span class="text-spark font-sans font-semibold">CYBN Command</span>
        </div>
      </div>
    `;

    document.body.appendChild(paletteModal);

    // Close when clicking overlay backdrop
    paletteModal.addEventListener('click', (e) => {
      if (e.target === paletteModal) closePalette();
    });

    document.getElementById('palette-close-btn').addEventListener('click', closePalette);

    const input = document.getElementById('palette-input');
    input.addEventListener('input', () => {
      renderResults(input.value.trim().toLowerCase());
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentItems.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentItems.length;
          updateSelectionHighlight();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentItems.length > 0) {
          selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
          updateSelectionHighlight();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentItems[selectedIndex]) {
          executeItem(currentItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });
  }

  function executeItem(item) {
    closePalette();
    if (item.type === 'action' && item.run) {
      item.run();
    } else if (item.type === 'problem') {
      window.location.href = `./problem.html?id=${item.id}`;
    }
  }

  function updateSelectionHighlight() {
    const container = document.getElementById('palette-results');
    if (!container) return;
    const elements = container.querySelectorAll('.palette-item');
    elements.forEach((el, idx) => {
      if (idx === selectedIndex) {
        el.classList.add('bg-spark/15', 'border-spark/30');
        el.classList.remove('hover:bg-slate-100', 'dark:hover:bg-ink-700/50');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('bg-spark/15', 'border-spark/30');
        el.classList.add('hover:bg-slate-100', 'dark:hover:bg-ink-700/50');
      }
    });
  }

  async function renderResults(query = '') {
    const container = document.getElementById('palette-results');
    if (!container) return;

    const problems = await getProblems();
    currentItems = [];

    // Filter actions
    const matchedActions = DEFAULT_ACTIONS.filter((act) =>
      act.title.toLowerCase().includes(query) || act.subtitle.toLowerCase().includes(query)
    );

    // Filter problems
    const matchedProblems = problems.filter((p) => {
      if (!query) return false;
      const name = (p.name || '').toLowerCase();
      const topic = (p.topic || '').toLowerCase();
      const pattern = (p.pattern || '').toLowerCase();
      const diff = (p.difficulty || '').toLowerCase();
      return name.includes(query) || topic.includes(query) || pattern.includes(query) || diff.includes(query);
    }).slice(0, 15).map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.difficulty || 'Medium'} · ${p.topic || 'DSA'} ${p.pattern ? `· ${p.pattern}` : ''}`,
      badge: p.status === 'mastered' ? 'Mastered' : `Day ${p.current_stage + 1}`,
      badgeClass: p.status === 'mastered' ? 'pill-easy' : 'pill-medium',
      type: 'problem'
    }));

    if (!query) {
      currentItems = [...matchedActions];
    } else {
      currentItems = [...matchedProblems, ...matchedActions];
    }

    selectedIndex = 0;

    if (currentItems.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-xs text-light-dim dark:text-paper-dim">
          No problems or commands found matching "<span class="text-light-ink dark:text-paper font-semibold">${escapeHtml(query)}</span>".
        </div>`;
      return;
    }

    container.innerHTML = currentItems.map((item, idx) => {
      const isSelected = idx === 0;
      const highlightClass = isSelected ? 'bg-spark/15 border-spark/30' : 'hover:bg-slate-100 dark:hover:bg-ink-700/50';

      if (item.type === 'action') {
        return `
          <div class="palette-item flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border border-transparent ${highlightClass}" data-index="${idx}">
            <div class="flex items-center gap-3">
              <span class="text-base shrink-0">${item.icon}</span>
              <div class="min-w-0">
                <p class="text-xs sm:text-sm font-semibold text-light-ink dark:text-paper truncate">${escapeHtml(item.title)}</p>
                <p class="text-[11px] text-light-muted dark:text-paper-muted truncate">${escapeHtml(item.subtitle)}</p>
              </div>
            </div>
            <span class="text-[10px] font-mono uppercase tracking-wider text-light-dim dark:text-paper-dim px-2 py-0.5 rounded bg-slate-100 dark:bg-ink-900 border border-light-border dark:border-ink-600/50 shrink-0">Command</span>
          </div>`;
      } else {
        return `
          <div class="palette-item flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border border-transparent ${highlightClass}" data-index="${idx}">
            <div class="min-w-0 pr-3">
              <p class="text-xs sm:text-sm font-semibold text-light-ink dark:text-paper truncate">${escapeHtml(item.title)}</p>
              <p class="text-[11px] text-light-muted dark:text-paper-muted truncate">${escapeHtml(item.subtitle)}</p>
            </div>
            <span class="pill ${item.badgeClass} shrink-0 text-[10px] font-mono">${item.badge}</span>
          </div>`;
      }
    }).join('');

    container.querySelectorAll('.palette-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.index);
        if (currentItems[idx]) executeItem(currentItems[idx]);
      });
      el.addEventListener('mouseenter', () => {
        selectedIndex = Number(el.dataset.index);
        updateSelectionHighlight();
      });
    });
  }

  function openPalette() {
    createPaletteDOM();
    paletteModal.classList.remove('hidden');
    const input = document.getElementById('palette-input');
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 30);
  }

  function closePalette() {
    if (paletteModal) {
      paletteModal.classList.add('hidden');
    }
  }

  // Global Keyboard Listener: Cmd+K, Ctrl+K, or slash ('/' outside of inputs)
  document.addEventListener('keydown', (e) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
    if (isCmdK) {
      e.preventDefault();
      if (paletteModal && !paletteModal.classList.contains('hidden')) {
        closePalette();
      } else {
        openPalette();
      }
    } else if (e.key === 'Escape' && paletteModal && !paletteModal.classList.contains('hidden')) {
      closePalette();
    }
  });

  // Attach to search input on dashboard if present
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.setAttribute('placeholder', 'Search or press Ctrl+K…');
      searchInput.addEventListener('focus', (e) => {
        e.preventDefault();
        searchInput.blur();
        openPalette();
      });
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // Expose API
  window.cybnPalette = {
    open: openPalette,
    close: closePalette,
  };
})();

