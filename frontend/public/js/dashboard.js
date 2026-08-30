(async function initDashboard() {
  const user = await requireSession();
  if (!user) return;

  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-id').textContent = `ID: ${user.id}`;
  document.getElementById('avatar-img').src = user.avatar_url || DEFAULT_AVATAR;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api.auth.logout();
    window.location.href = './login.html';
  });

  // --- Avatar upload ---
  const avatarInput = document.getElementById('avatar-input');
  document.getElementById('avatar-edit-btn').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    if (!file) return;
    try {
      const { avatar_url } = await api.users.uploadAvatar(file);
      document.getElementById('avatar-img').src = avatar_url;
      toast('Profile photo updated.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
    avatarInput.value = '';
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
    container.innerHTML = '';
    // group into weeks (columns of 7), oldest first
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    for (const week of weeks) {
      const col = document.createElement('div');
      col.className = 'flex flex-col gap-1';
      for (const day of week) {
        const cell = document.createElement('div');
        const level = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count === 2 ? 2 : 3;
        const colors = ['bg-ink-700', 'bg-spark/30', 'bg-spark/65', 'bg-spark'];
        cell.className = `h-3 w-3 rounded-sm ${colors[level]}`;
        cell.title = `${day.date}: ${day.count} problem${day.count === 1 ? '' : 's'} solved`;
        col.appendChild(cell);
      }
      container.appendChild(col);
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
