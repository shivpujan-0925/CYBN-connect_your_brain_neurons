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
        toast('Revision logged.', 'success');
        render();
      } catch (err) {
        toast(err.message, 'error');
        completeBtn.disabled = false;
      }
    };
  }

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
