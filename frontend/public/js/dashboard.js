(async function initDashboard() {
  const user = await requireSession();
  if (!user) return;

  document.getElementById('profile-username').textContent = user.username;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api.auth.logout();
    window.location.href = './login.html';
  });

  // --- Avatar management (upload, display, and remove) ---
  const avatarImg = document.getElementById('avatar-img');
  const avatarEditBtn = document.getElementById('avatar-edit-btn');
  const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
  const avatarInput = document.getElementById('avatar-input');

  function setAvatar(url) {
    avatarImg.src = url || DEFAULT_AVATAR;
    if (url) {
      avatarRemoveBtn.classList.remove('hidden');
      avatarRemoveBtn.classList.add('flex');
    } else {
      avatarRemoveBtn.classList.add('hidden');
      avatarRemoveBtn.classList.remove('flex');
    }
  }

  setAvatar(user.avatar_url);

  avatarEditBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    if (!file) return;
    try {
      const { avatar_url } = await api.users.uploadAvatar(file);
      setAvatar(avatar_url);
      toast('Profile photo updated.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
    avatarInput.value = '';
  });

  avatarRemoveBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Remove Profile Picture',
      message: 'Reset your profile photo back to the default CYBN neural avatar?',
      confirmText: 'Remove Photo',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api.users.removeAvatar();
      setAvatar(null);
      toast('Profile photo removed. Default avatar restored.', 'default');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // --- Overview stats + consistency graph ---
  async function loadOverview() {
    const { overview } = await api.users.overview();
    document.getElementById('stat-total').textContent = overview.totalSolved;
    document.getElementById('stat-mastered').textContent = overview.totalMastered;
    document.getElementById('stat-due').textContent = overview.dueTodayCount;
    document.getElementById('stat-streak').textContent = overview.currentStreak;

    const streakBadge = document.getElementById('streak-badge');
    if (overview.currentStreak > 0) {
      document.getElementById('streak-count').textContent = overview.currentStreak;
      streakBadge.classList.remove('hidden');
      streakBadge.classList.add('flex');
    } else {
      streakBadge.classList.add('hidden');
    }

    const pct = overview.totalSolved ? Math.round((overview.totalMastered / overview.totalSolved) * 100) : 0;
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;
    document.getElementById('progress-bar-label').textContent =
      overview.totalSolved ? `${pct}% of your problems fully revised` : 'Add your first problem to start the graph.';

    renderConsistencyGraph(overview.consistency);
  }

  function renderConsistencyGraph(days) {
    const container = document.getElementById('consistency-graph');
    const monthsContainer = document.getElementById('consistency-months');
    if (!container) return;

    container.innerHTML = '';
    if (monthsContainer) monthsContainer.innerHTML = '';

    // group into weeks (columns of 7), oldest first
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;
    let totalActivityInYear = 0;

    for (let w = 0; w < weeks.length; w++) {
      const week = weeks[w];
      const col = document.createElement('div');
      col.className = 'flex flex-col gap-[3px] shrink-0';

      for (const day of week) {
        totalActivityInYear += (day.count || 0);
        const cell = document.createElement('div');
        const level = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count === 2 ? 2 : 3;
        const colors = [
          'bg-slate-200 dark:bg-ink-700/80',
          'bg-spark/35 shadow-[0_0_6px_rgba(245,158,11,0.2)]',
          'bg-spark/70 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
          'bg-spark shadow-[0_0_10px_rgba(245,158,11,0.6)]'
        ];
        cell.className = `h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-[2px] transition-transform hover:scale-125 hover:z-10 ${colors[level]}`;
        const formattedDate = new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        cell.title = `${formattedDate}: ${day.count} activity event${day.count === 1 ? '' : 's'}`;
        col.appendChild(cell);
      }
      container.appendChild(col);

      // Month labels matching each column
      if (monthsContainer) {
        const colLabel = document.createElement('div');
        colLabel.className = 'w-2.5 sm:w-3 shrink-0 text-center overflow-visible relative';
        if (week[0]) {
          const m = new Date(week[0].date).getUTCMonth();
          if (m !== lastMonth) {
            lastMonth = m;
            const span = document.createElement('span');
            span.className = 'absolute left-0 top-0 whitespace-nowrap text-[10px] text-light-dim dark:text-paper-dim font-mono';
            span.textContent = monthNames[m];
            colLabel.appendChild(span);
          }
        }
        monthsContainer.appendChild(colLabel);
      }
    }

    const summaryEl = document.getElementById('consistency-summary');
    if (summaryEl) {
      const activeDays = days.filter((d) => d.count > 0).length;
      summaryEl.textContent = `${totalActivityInYear} revisions & solves across ${activeDays} active days in the last year`;
    }
  }

  // --- Due today list ---
  async function loadDueList(problems) {
    const due = problems.filter((p) => (p.is_due_today || p.is_overdue) && p.status !== 'mastered');
    due.sort((a, b) => (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0));

    document.getElementById('due-count-badge').textContent = `${due.length} to revise`;
    const list = document.getElementById('due-list');

    if (due.length === 0) {
      list.innerHTML = `<div class="card p-8 text-center text-paper-muted">Nothing due today. Add a problem to get your pathway started.</div>`;
    } else {
      list.innerHTML = `<div class="card divide-y divide-ink-600/60">${due.map(problemRowHTML).join('')}</div>`;
      attachDoneHandlers(list);
    }

    // Total list (first 6, most recent) — always renders, regardless of due-today state
    const total = document.getElementById('total-list');
    if (problems.length === 0) {
      total.innerHTML = `<p class="text-paper-dim text-sm p-6">No problems added yet — hit "Add problem" to log your first one.</p>`;
      document.getElementById('view-all-btn').classList.add('hidden');
    } else {
      total.innerHTML = problems.slice(0, 6).map(problemRowHTML).join('');
      attachDoneHandlers(total);
    }
  }

  function attachDoneHandlers(scope) {
    scope.querySelectorAll('.js-done-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const { id, stage } = btn.dataset;
        btn.disabled = true;
        btn.textContent = '…';
        try {
          await api.problems.completeStage(id, Number(stage));
          toast('Nice — revision logged.', 'success');
          const { problems } = await api.problems.list();
          allProblemsCache = problems;
          await Promise.all([loadOverview(), loadDueList(problems)]);
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Done';
        }
      });
    });
  }

  // --- Search ---
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchResultsList = document.getElementById('search-results-list');
  const mainContent = document.getElementById('main-content');
  let allProblemsCache = [];

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResults.classList.add('hidden');
      mainContent.classList.remove('hidden');
      return;
    }
    const matches = allProblemsCache.filter((p) => p.name.toLowerCase().includes(q) || (p.topic || '').toLowerCase().includes(q));
    mainContent.classList.add('hidden');
    searchResults.classList.remove('hidden');
    searchResultsList.innerHTML = matches.length
      ? `<div class="card divide-y divide-ink-600/60">${matches.map(problemRowHTML).join('')}</div>`
      : `<p class="text-paper-muted text-sm">No problems match "${escapeHtml(searchInput.value)}".</p>`;
    attachDoneHandlers(searchResultsList);
  });

  try {
    await loadOverview();
    const { problems } = await api.problems.list();
    allProblemsCache = problems;
    await loadDueList(problems);
  } catch (err) {
    toast(err.message, 'error');
  }
})();
