// Global Command Palette (Cmd+K / Ctrl+K) for CYBN - Minimal & Authentic Edition
// Fast, lightweight search across problems and instant navigation without visual clutter.

(function initCommandPalette() {
  let paletteModal = null;
  let problemsCache = null;
  let selectedIndex = 0;
  let currentItems = [];

  const DEFAULT_ACTIONS = [
    {
      id: 'cmd-add',
      title: 'Add New Problem',
      icon: `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`,
      type: 'action',
      shortcut: '↵',
      run: () => { window.location.href = './add-problem.html'; }
    },
    {
      id: 'cmd-dashboard',
      title: 'Dashboard',
      icon: `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
      type: 'action',
      shortcut: '↵',
      run: () => { window.location.href = './dashboard.html'; }
    },
    {
      id: 'cmd-problems',
      title: 'All Problems',
      icon: `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`,
      type: 'action',
      shortcut: '↵',
      run: () => { window.location.href = './problems.html'; }
    },
    {
      id: 'cmd-stats',
      title: 'Stats & Retention',
      icon: `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      type: 'action',
      shortcut: '↵',
      run: () => { window.location.href = './stats.html'; }
    },
    {
      id: 'cmd-theme',
      title: 'Toggle Theme',
      icon: `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`,
      type: 'action',
      shortcut: '↵',
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
      // Not authenticated or network issue
    }
    return [];
  }

  function createPaletteDOM() {
    if (paletteModal) return;

    paletteModal = document.createElement('div');
    paletteModal.id = 'cybn-command-palette';
    paletteModal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 hidden transition-opacity';
    paletteModal.setAttribute('role', 'dialog');
    paletteModal.setAttribute('aria-modal', 'true');

    paletteModal.innerHTML = `
      <style>
        #palette-results::-webkit-scrollbar {
          width: 4px;
        }
        #palette-results::-webkit-scrollbar-track {
          background: transparent;
        }
        #palette-results::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 9999px;
        }
        #palette-results::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        #palette-input,
        #palette-input:focus,
        #palette-input:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
      </style>
      <div class="w-full max-w-lg rounded-2xl bg-white dark:bg-ink-850 border border-light-border dark:border-ink-600/70 shadow-2xl overflow-hidden flex flex-col max-h-[68vh] animate-fade-up" style="background-color: var(--card-bg, #151A33);">
        
        <!-- Search Input Header without rectangle focus outline -->
        <div class="relative flex items-center px-4 py-1 border-b border-light-border dark:border-ink-600/50 bg-slate-50/50 dark:bg-ink-900/60">
          <svg class="h-4 w-4 text-spark shrink-0 mr-2.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="palette-input"
            type="text"
            placeholder="Type a command or search problems..."
            class="w-full py-3 bg-transparent text-sm text-light-ink dark:text-paper placeholder:text-light-dim dark:placeholder:text-paper-dim border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            style="outline: none !important; box-shadow: none !important; border: none !important;"
            autocomplete="off"
            spellcheck="false"
          />
          <button id="palette-close-btn" type="button" class="text-[10px] font-mono text-light-dim dark:text-paper-dim hover:text-light-ink dark:hover:text-paper px-1.5 py-0.5 rounded bg-slate-100 dark:bg-ink-700/60 transition-colors">
            ESC
          </button>
        </div>

        <!-- Minimal Results List -->
        <div id="palette-results" class="overflow-y-auto p-1.5 space-y-0.5">
          <!-- Dynamically populated minimal items -->
        </div>

        <!-- Sleek Footer -->
        <div class="px-3.5 py-2 border-t border-light-border/80 dark:border-ink-600/50 bg-slate-50/80 dark:bg-ink-900/60 flex items-center justify-between text-[10px] font-mono text-light-dim dark:text-paper-dim">
          <div class="flex items-center gap-2.5">
            <span><kbd class="px-1 py-0.2 rounded bg-slate-200 dark:bg-ink-700 text-light-ink dark:text-paper">↑</kbd><kbd class="px-1 py-0.2 rounded bg-slate-200 dark:bg-ink-700 text-light-ink dark:text-paper ml-0.5">↓</kbd> navigate</span>
            <span><kbd class="px-1 py-0.2 rounded bg-slate-200 dark:bg-ink-700 text-light-ink dark:text-paper">↵</kbd> select</span>
          </div>
          <span class="text-spark font-sans font-medium text-[11px]">CYBN</span>
        </div>
      </div>
    `;

    document.body.appendChild(paletteModal);

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
        el.classList.add('bg-spark/15', 'dark:bg-spark/20', 'text-spark');
        el.classList.remove('hover:bg-slate-100', 'dark:hover:bg-ink-700/50');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('bg-spark/15', 'dark:bg-spark/20', 'text-spark');
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
      act.title.toLowerCase().includes(query)
    );

    // Filter problems
    const matchedProblems = problems.filter((p) => {
      if (!query) return false;
      const name = (p.name || '').toLowerCase();
      const topic = (p.topic || '').toLowerCase();
      const pattern = (p.pattern || '').toLowerCase();
      const diff = (p.difficulty || '').toLowerCase();
      return name.includes(query) || topic.includes(query) || pattern.includes(query) || diff.includes(query);
    }).slice(0, 15).map((p) => {
      const isMastered = p.status === 'mastered';
      const diff = p.difficulty || 'Medium';
      const diffClass = diff === 'Easy' ? 'text-mastered font-medium' : diff === 'Hard' ? 'text-overdue font-medium' : 'text-spark font-medium';
      const dotClass = isMastered ? 'bg-mastered' : p.is_overdue ? 'bg-overdue' : p.is_due_today ? 'bg-spark' : 'bg-dendrite';
      const stageLabel = isMastered ? 'Mastered' : `Day ${p.current_stage + 1}`;

      return {
        id: p.id,
        title: p.name,
        topic: p.topic || '',
        difficulty: diff,
        diffClass,
        dotClass,
        stageLabel,
        type: 'problem'
      };
    });

    let html = '';

    if (!query) {
      currentItems = [...matchedActions];
      html += `<div class="px-2.5 pt-1.5 pb-1 text-[10px] font-mono font-medium uppercase tracking-wider text-light-dim dark:text-paper-dim">Quick Commands</div>`;
      html += matchedActions.map((item, idx) => {
        const isSelected = idx === 0;
        const activeClass = isSelected ? 'bg-spark/15 dark:bg-spark/20 text-spark' : 'hover:bg-slate-100 dark:hover:bg-ink-700/50';
        return `
          <div class="palette-item flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeClass}" data-index="${idx}">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="text-light-muted dark:text-paper-muted shrink-0">${item.icon}</span>
              <span class="text-xs sm:text-sm font-medium text-light-ink dark:text-paper truncate">${escapeHtml(item.title)}</span>
            </div>
            <span class="text-[10px] font-mono text-light-dim dark:text-paper-dim">${item.shortcut}</span>
          </div>`;
      }).join('');
    } else {
      currentItems = [...matchedProblems, ...matchedActions];
      let itemIndex = 0;

      if (matchedProblems.length > 0) {
        html += `<div class="px-2.5 pt-1.5 pb-1 text-[10px] font-mono font-medium uppercase tracking-wider text-light-dim dark:text-paper-dim">Problems (${matchedProblems.length})</div>`;
        html += matchedProblems.map((item) => {
          const idx = itemIndex++;
          const isSelected = idx === 0;
          const activeClass = isSelected ? 'bg-spark/15 dark:bg-spark/20 text-spark' : 'hover:bg-slate-100 dark:hover:bg-ink-700/50';
          return `
            <div class="palette-item flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeClass}" data-index="${idx}">
              <div class="flex items-center gap-2 min-w-0 pr-2">
                <span class="h-1.5 w-1.5 rounded-full ${item.dotClass} shrink-0"></span>
                <span class="text-xs sm:text-sm font-medium text-light-ink dark:text-paper truncate">${escapeHtml(item.title)}</span>
                ${item.topic ? `<span class="text-[11px] text-light-dim dark:text-paper-dim truncate hidden sm:inline">· ${escapeHtml(item.topic)}</span>` : ''}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] font-mono ${item.diffClass}">${item.difficulty}</span>
                <span class="text-[10px] font-mono text-light-dim dark:text-paper-dim">· ${item.stageLabel}</span>
              </div>
            </div>`;
        }).join('');
      }

      if (matchedActions.length > 0) {
        html += `<div class="px-2.5 pt-2 pb-1 text-[10px] font-mono font-medium uppercase tracking-wider text-light-dim dark:text-paper-dim">Commands</div>`;
        html += matchedActions.map((item) => {
          const idx = itemIndex++;
          const isSelected = idx === 0;
          const activeClass = isSelected ? 'bg-spark/15 dark:bg-spark/20 text-spark' : 'hover:bg-slate-100 dark:hover:bg-ink-700/50';
          return `
            <div class="palette-item flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeClass}" data-index="${idx}">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-light-muted dark:text-paper-muted shrink-0">${item.icon}</span>
                <span class="text-xs sm:text-sm font-medium text-light-ink dark:text-paper truncate">${escapeHtml(item.title)}</span>
              </div>
              <span class="text-[10px] font-mono text-light-dim dark:text-paper-dim">${item.shortcut}</span>
            </div>`;
        }).join('');
      }
    }

    selectedIndex = 0;

    if (currentItems.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-light-dim dark:text-paper-dim">
          No matches found for "<span class="text-light-ink dark:text-paper font-semibold">${escapeHtml(query)}</span>".
        </div>`;
      return;
    }

    container.innerHTML = html;

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
    setTimeout(() => {
      input.focus();
      input.style.outline = 'none';
      input.style.boxShadow = 'none';
      input.style.border = 'none';
    }, 30);
  }

  function closePalette() {
    if (paletteModal) {
      paletteModal.classList.add('hidden');
    }
  }

  // Global Keyboard Listener: Cmd+K, Ctrl+K
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

  // Attach to search input & mobile search trigger on navbar
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.setAttribute('placeholder', 'Search problems, topics… (Ctrl+K)');
      searchInput.addEventListener('focus', (e) => {
        e.preventDefault();
        searchInput.blur();
        openPalette();
      });
      searchInput.addEventListener('click', (e) => {
        e.preventDefault();
        openPalette();
      });
    }

    const mobileSearchBtn = document.getElementById('mobile-search-btn');
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openPalette();
      });
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  window.cybnPalette = {
    open: openPalette,
    close: closePalette,
  };
})();
