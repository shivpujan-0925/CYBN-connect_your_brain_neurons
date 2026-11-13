// Shared API client — talks to the CYBN backend. Auth uses a Bearer token stored
// in localStorage rather than relying on the cross-origin cookie: browsers treat
// third-party cookies very inconsistently (Brave blocks them by default, Chrome's
// own third-party-cookie phase-out can too), so a token sent explicitly via the
// Authorization header works reliably everywhere regardless of cookie policy.

const API_BASE = window.CYBN_API_BASE || 'http://localhost:5000/api';
const TOKEN_KEY = 'cybn_token';

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body && isForm) {
    opts.body = body; // FormData sets its own Content-Type boundary
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  let data;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, message: 'Unexpected response from server.' };
  }

  if (!res.ok || data.ok === false) {
    const err = new Error(data.message || 'Something went wrong.');
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

const api = {
  auth: {
    signup: async (payload) => {
      const data = await request('/auth/signup', { method: 'POST', body: payload });
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data;
    },
    login: async (payload) => {
      const data = await request('/auth/login', { method: 'POST', body: payload });
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data;
    },
    logout: async () => {
      localStorage.removeItem(TOKEN_KEY);
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        // token is already cleared locally either way — a failed server call here is harmless
      }
      return { ok: true };
    },
    me: () => request('/auth/me'),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),
  },
  users: {
    overview: () => request('/users/overview'),
    stats: () => request('/users/stats'),
    uploadAvatar: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return request('/users/avatar', { method: 'POST', body: fd, isForm: true });
    },
    removeAvatar: () => request('/users/avatar', { method: 'DELETE' }),
  },
  problems: {
    list: (filter) => request(`/problems${filter ? `?filter=${filter}` : ''}`),
    get: (id) => request(`/problems/${id}`),
    create: (payload) => request('/problems', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/problems/${id}`, { method: 'PATCH', body: payload }),
    remove: (id) => request(`/problems/${id}`, { method: 'DELETE' }),
    completeStage: (id, stage) => request(`/problems/${id}/complete-stage`, { method: 'POST', body: { stage } }),
    restart: (id) => request(`/problems/${id}/restart`, { method: 'POST' }),
    importFromLeetCode: (url) => request('/problems/import-leetcode', { method: 'POST', body: { url } }),
  },
};

/** Redirect to /login.html if there's no active session. Returns the user or null. */
async function requireSession() {
  try {
    const { user } = await api.auth.me();
    return user;
  } catch {
    window.location.href = './login.html';
    return null;
  }
}

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="cybn-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141936"/>
          <stop offset="100%" stop-color="#0a0d1d"/>
        </linearGradient>
        <linearGradient id="cybn-user" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#818CF8"/>
          <stop offset="100%" stop-color="#4F46E5"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="url(#cybn-bg)"/>
      <rect x="2" y="2" width="96" height="96" rx="22" fill="none" stroke="#2B3563" stroke-width="2"/>
      <circle cx="68" cy="26" r="4.5" fill="#F59E0B"/>
      <path d="M58 33 L68 26" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      <circle cx="50" cy="40" r="17" fill="url(#cybn-user)"/>
      <path d="M22 84 C22 69 35 62 50 62 C65 62 78 69 78 84" fill="url(#cybn-user)"/>
    </svg>
  `);

function timeAgoOrDue(isoString) {
  if (!isoString) return '—';
  const diffMs = new Date(isoString).getTime() - Date.now();
  const days = Math.round(diffMs / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

function toast(message, variant = 'default') {
  const el = document.createElement('div');
  const colors = {
    default: 'border-ink-600 bg-ink-800 text-paper',
    error: 'border-overdue/40 bg-ink-800 text-overdue',
    success: 'border-mastered/40 bg-ink-800 text-mastered',
  };
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg border px-4 py-3 text-sm shadow-card animate-fade-up ${colors[variant] || colors.default}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/** Custom confirmation modal — replaces the browser's native confirm() popup with
 *  a styled card matching the rest of the app. Returns a Promise<boolean>: true if
 *  the person confirmed, false if they cancelled (Cancel button, backdrop click, or Esc). */
function showConfirmModal({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';

    const confirmBtnClass = danger ? 'btn-danger' : 'btn-primary';

    overlay.innerHTML = `
      <div class="card w-full max-w-sm p-6 animate-fade-up" role="dialog" aria-modal="true" style="animation-duration: 0.18s;">
        <h3 class="font-display text-lg font-semibold text-paper mb-2">${escapeHtml(title)}</h3>
        <p class="text-sm text-paper-muted mb-6">${escapeHtml(message)}</p>
        <div class="flex gap-3 justify-end">
          <button type="button" class="btn-secondary js-modal-cancel">${escapeHtml(cancelText)}</button>
          <button type="button" class="${confirmBtnClass} js-modal-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;

    function cleanup(result) {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      resolve(result);
    }
    function onKeydown(e) {
      if (e.key === 'Escape') cleanup(false);
    }

    overlay.querySelector('.js-modal-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.js-modal-confirm').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false); // clicking the backdrop cancels
    });
    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(overlay);
    overlay.querySelector('.js-modal-confirm').focus();
  });
}

const DIFFICULTY_PILL = { Easy: 'pill-easy', Medium: 'pill-medium', Hard: 'pill-hard' };

/** Renders one "Problem Name ---- Done button" row, shared by the dashboard and full list. */
function problemRowHTML(problem) {
  const nextStage = problem.current_stage + 1;
  const isMastered = problem.status === 'mastered';
  const stageLabel = isMastered ? 'Mastered' : `Day ${nextStage} · ${timeAgoOrDue(problem[`day${nextStage}_due_at`])}`;
  const stateClass = isMastered
    ? 'text-mastered'
    : problem.is_overdue
      ? 'text-overdue font-semibold'
      : problem.is_due_today
        ? 'text-spark dark:text-spark-soft font-semibold'
        : 'text-light-dim dark:text-paper-dim';

  return `
    <div class="flex items-center justify-between gap-2.5 sm:gap-4 px-3.5 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 dark:hover:bg-ink-700/40 transition-colors" data-problem-id="${problem.id}">
      <a href="./problem.html?id=${problem.id}" class="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
        <span class="${DIFFICULTY_PILL[problem.difficulty] || 'pill-medium'} shrink-0 text-[10px] sm:text-xs px-2 py-0.5">${problem.difficulty || 'Medium'}</span>
        <span class="truncate text-xs sm:text-sm font-medium text-light-ink dark:text-paper hover:text-spark dark:hover:text-spark-soft transition-colors">${escapeHtml(problem.name)}</span>
      </a>
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <span class="text-[11px] sm:text-xs font-mono ${stateClass} whitespace-nowrap">${stageLabel}</span>
        ${!isMastered ? `<button class="btn-secondary shrink-0 !py-1 !px-2.5 sm:!px-3 text-[11px] sm:text-xs js-done-btn rounded-lg" data-id="${problem.id}" data-stage="${nextStage}">Done</button>` : `<span class="pill bg-mastered/10 text-mastered shrink-0 border border-mastered/20 text-[10px] sm:text-xs">✓ Done</span>`}
      </div>
    </div>`;
}


function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
