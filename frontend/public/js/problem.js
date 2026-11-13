(async function initProblemPage() {
  const user = await requireSession();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const problemId = params.get('id');
  const root = document.getElementById('page-root');

  if (!problemId) {
    root.innerHTML = `<p class="text-overdue">No problem ID was given.</p>`;
    return;
  }

  let problem;
  try {
    ({ problem } = await api.problems.get(problemId));
  } catch (err) {
    root.innerHTML = `<p class="text-overdue">${err.message}</p>`;
    return;
  }

  const template = document.getElementById('problem-template');
  root.innerHTML = '';
  root.appendChild(template.content.cloneNode(true));

  const q = (sel) => root.querySelector(sel);

  function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function render() {
    q('.js-name').textContent = problem.name;
    q('.js-difficulty-pill').outerHTML = `<span class="${DIFFICULTY_PILL[problem.difficulty] || 'pill-medium'} js-difficulty-pill">${problem.difficulty || 'Medium'}</span>`;
    q('.js-status-pill').outerHTML = problem.status === 'mastered'
      ? `<span class="pill bg-mastered/10 text-mastered js-status-pill">✓ Mastered</span>`
      : problem.is_overdue
        ? `<span class="pill bg-overdue/10 text-overdue js-status-pill">Revision overdue</span>`
        : `<span class="pill bg-dendrite/10 text-dendrite js-status-pill">In progress</span>`;

    // metadata (view mode)
    q('.js-topic').textContent = problem.topic || '—';
    q('.js-pattern').textContent = problem.pattern || '—';
    q('.js-time').textContent = problem.time_complexity || '—';
    q('.js-space').textContent = problem.space_complexity || '—';
    q('.js-notes').textContent = problem.notes || '—';
    const linkEl = q('.js-link');
    if (problem.link) {
      linkEl.innerHTML = `<a href="${escapeHtml(problem.link)}" target="_blank" rel="noopener" class="text-dendrite hover:underline">${escapeHtml(problem.link)}</a>`;
    } else {
      linkEl.textContent = '—';
    }

    // edit form defaults
    q('.js-input-name').value = problem.name || '';
    q('.js-input-topic').value = problem.topic || '';
    q('.js-input-pattern').value = problem.pattern || '';
    q('.js-input-time').value = problem.time_complexity || '';
    q('.js-input-space').value = problem.space_complexity || '';
    q('.js-input-difficulty').value = problem.difficulty || 'Medium';
    q('.js-input-link').value = problem.link || '';
    q('.js-input-notes').value = problem.notes || '';

    renderStepper();
    renderNextAction();
    updateRecallUI();
  }

  function triggerMasteryConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 pointer-events-none z-50';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#F59E0B', '#FBBF24', '#6366F1', '#818CF8', '#10B981', '#34D399'];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRotation: (Math.random() - 0.5) * 10,
      });
    }

    let start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / 2400;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.vRotation;
        p.alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(step);
  }

  function nodeState(stageIndex) {
    if (stageIndex === 0) return { state: 'done', sub: formatDate(problem.day0_completed_at) || 'solved' };
    const completedAt = problem[`day${stageIndex}_completed_at`];
    if (completedAt) return { state: 'done', sub: formatDate(completedAt) };
    if (stageIndex === problem.current_stage + 1) {
      if (problem.is_overdue) return { state: 'overdue', sub: timeAgoOrDue(problem[`day${stageIndex}_due_at`]) };
      if (problem.is_due_today) return { state: 'due', sub: 'due today' };
      return { state: 'pending', sub: timeAgoOrDue(problem[`day${stageIndex}_due_at`]) };
    }
    return { state: 'pending', sub: '—' };
  }

  function renderStepper() {
    const stepper = q('.js-stepper');
    const labelsRow = q('.js-stepper-labels');
    stepper.innerHTML = '';
    labelsRow.innerHTML = '';
    const stageLabels = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5'];
    const subLabelHeaders = ['solved', '+1d', '+3d', '+7d', '+15d', 'mastered'];

    stageLabels.forEach((label, i) => {
      const { state, sub } = nodeState(i);
      const node = document.createElement('div');
      node.className = 'synapse-node';
      node.dataset.state = state;
      node.textContent = label;
      stepper.appendChild(node);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'w-9 text-center';
      labelSpan.textContent = sub || subLabelHeaders[i];
      labelsRow.appendChild(labelSpan);

      if (i < stageLabels.length - 1) {
        const line = document.createElement('div');
        line.className = 'synapse-line';
        line.dataset.filled = String(state === 'done');
        stepper.appendChild(line);

        const spacer = document.createElement('span');
        spacer.className = 'flex-1 min-w-[16px]';
        labelsRow.appendChild(spacer);
      }
    });
  }

  function renderNextAction() {
    const label = q('.js-next-action-label');
    const completeBtn = q('.js-complete-btn');

    if (problem.status === 'mastered') {
      label.textContent = `Fully mastered after ${problem.restart_count > 0 ? `${problem.restart_count} restart(s) and ` : ''}5 revision stages.`;
      completeBtn.classList.add('hidden');
      return;
    }

    const nextStage = problem.current_stage + 1;
    const dueAt = problem[`day${nextStage}_due_at`];
    label.textContent = `Day ${nextStage} revision is ${timeAgoOrDue(dueAt).toLowerCase()}.`;

    completeBtn.textContent = `Mark Day ${nextStage} done`;
    completeBtn.classList.remove('hidden');
    completeBtn.onclick = async () => {
      completeBtn.disabled = true;
      completeBtn.textContent = 'Saving…';
      try {
        ({ problem } = await api.problems.completeStage(problem.id, nextStage));
        if (nextStage === 5) {
          triggerMasteryConfetti();
          toast('🎉 Synaptic pathway fully mastered!', 'success');
        } else {
          toast('Revision logged.', 'success');
        }
        render();
      } catch (err) {
        toast(err.message, 'error');
        completeBtn.disabled = false;
      }
    };
  }

  // --- Active Recall & Stopwatch Controller ---
  let isRecallActive = problem.status !== 'mastered';
  let isRevealed = false;

  function updateRecallUI() {
    const curtain = q('#recall-curtain');
    const content = q('#recall-content');
    const toggleBtn = q('#active-recall-toggle-btn');
    const dot = q('#active-recall-dot');
    const text = q('#active-recall-toggle-text');

    if (!curtain || !content) return;

    if (!isRecallActive) {
      curtain.classList.add('hidden');
      content.classList.remove('hidden');
      toggleBtn.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-light-border dark:border-ink-600 bg-slate-100 dark:bg-ink-800 text-light-muted dark:text-paper-muted transition-all';
      dot.className = 'h-2 w-2 rounded-full bg-slate-400';
      text.textContent = 'Recall Mode: OFF';
    } else {
      toggleBtn.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-spark/40 bg-spark/10 text-spark transition-all';
      dot.className = 'h-2 w-2 rounded-full bg-spark animate-pulse';
      text.textContent = 'Recall Mode: ON';

      if (isRevealed) {
        curtain.classList.add('hidden');
        content.classList.remove('hidden');
      } else {
        curtain.classList.remove('hidden');
        content.classList.add('hidden');
      }
    }
  }

  q('#active-recall-toggle-btn').addEventListener('click', () => {
    isRecallActive = !isRecallActive;
    isRevealed = false;
    updateRecallUI();
  });

  q('#recall-reveal-btn').addEventListener('click', () => {
    isRevealed = true;
    updateRecallUI();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isRecallActive && !isRevealed) {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        isRevealed = true;
        updateRecallUI();
      }
    }
  });

  // Confidence Rating Buttons
  q('#rate-struggled-btn').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Reset schedule to Day 0?',
      message: 'Since you struggled to recall this problem, resetting to Day 0 will help consolidate the neural pathway from the beginning.',
      confirmText: 'Reset to Day 0',
      danger: true,
    });
    if (!confirmed) return;
    try {
      ({ problem } = await api.problems.restart(problem.id));
      toast('Reset to Day 0. Fresh revision begins tomorrow.', 'default');
      isRevealed = false;
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  q('#rate-nailed-btn').addEventListener('click', async () => {
    if (problem.status === 'mastered') {
      toast('Problem is already mastered.', 'default');
      return;
    }
    const nextStage = problem.current_stage + 1;
    try {
      ({ problem } = await api.problems.completeStage(problem.id, nextStage));
      if (nextStage === 5) {
        triggerMasteryConfetti();
        toast('🎉 Synaptic pathway fully mastered!', 'success');
      } else {
        toast(`Day ${nextStage} revision logged successfully.`, 'success');
      }
      isRevealed = false;
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Stopwatch Controller
  let timerInterval = null;
  let timerSeconds = 0;
  const stopwatchEl = q('#recall-stopwatch');
  const toggleTimerBtn = q('#stopwatch-toggle');
  const resetTimerBtn = q('#stopwatch-reset');

  function formatTimer(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  toggleTimerBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      toggleTimerBtn.textContent = 'Start';
      toggleTimerBtn.className = 'hover:text-spark ml-1 font-sans text-[11px] font-semibold text-spark';
    } else {
      timerInterval = setInterval(() => {
        timerSeconds++;
        stopwatchEl.textContent = formatTimer(timerSeconds);
      }, 1000);
      toggleTimerBtn.textContent = 'Pause';
      toggleTimerBtn.className = 'hover:text-spark ml-1 font-sans text-[11px] font-semibold text-rose-500';
    }
  });

  resetTimerBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerSeconds = 0;
    stopwatchEl.textContent = '00:00';
    toggleTimerBtn.textContent = 'Start';
    toggleTimerBtn.className = 'hover:text-spark ml-1 font-sans text-[11px] font-semibold';
  });

  // --- Edit toggle ---
  const viewMode = q('.js-view-mode');
  const editMode = q('.js-edit-mode');
  q('.js-edit-btn').addEventListener('click', () => {
    viewMode.classList.add('hidden');
    editMode.classList.remove('hidden');
  });
  q('.js-cancel-edit-btn').addEventListener('click', () => {
    editMode.classList.add('hidden');
    viewMode.classList.remove('hidden');
  });
  editMode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = q('.js-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const payload = {
        name: q('.js-input-name').value.trim(),
        topic: q('.js-input-topic').value.trim(),
        pattern: q('.js-input-pattern').value.trim(),
        time_complexity: q('.js-input-time').value.trim(),
        space_complexity: q('.js-input-space').value.trim(),
        difficulty: q('.js-input-difficulty').value,
        link: q('.js-input-link').value.trim(),
        notes: q('.js-input-notes').value.trim(),
      };
      ({ problem } = await api.problems.update(problem.id, payload));
      toast('Problem updated.', 'success');
      editMode.classList.add('hidden');
      viewMode.classList.remove('hidden');
      render();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  });

  // --- Restart ---
  q('.js-restart-btn').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Restart from Day 0?',
      message: 'Your revision progress on this problem will reset. This can\'t be undone.',
      confirmText: 'Restart',
    });
    if (!confirmed) return;
    try {
      ({ problem } = await api.problems.restart(problem.id));
      toast('Restarted from Day 0.', 'success');
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // --- Delete ---
  q('.js-delete-btn').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Delete this problem?',
      message: `"${problem.name}" will be permanently deleted. This can't be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.problems.remove(problem.id);
      toast('Problem deleted.', 'success');
      window.location.href = './problems.html';
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  render();
})();
