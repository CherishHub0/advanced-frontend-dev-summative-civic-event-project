// Admin dashboard: summary cards + charts from GET /dashboard/admin.
// Postgres returns counts as text ("12"), so every number goes through Number().
// ROLE GUARD 2: admins only.
if (Auth.requireAdmin()) {
  $(function () {
    Layout.init({ active: 'admin', admin: 'dashboard' });
    const n = (v) => Number(v) || 0;
    const SAGE = '#436652', SAGE_LIGHT = '#A0BAAA', STONE = '#D6D3D1', INK = '#57534E';

    function card(label, value, sub, href) {
      return `<a href="${href}" class="fade-in rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-sage-300">
        <p class="text-sm text-stone-500">${label}</p>
        <p class="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900">${value}</p>
        <p class="mt-1 text-xs text-stone-400">${sub}</p></a>`;
    }

    function charts(d) {
      if (!window.Chart) {
        $('canvas').replaceWith('<p class="text-sm text-stone-500">Charts couldn\'t load (no internet connection to the chart library).</p>');
        return;
      }
      Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
      Chart.defaults.color = INK;
      const grid = { color: '#F0EFED' };

      // Users per month (last 6 months from the backend; fill gaps with 0).
      const growth = {};
      (d.user_growth || []).forEach((g) => { growth[g.month] = n(g.new_users); });
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`, label: dt.toLocaleString(undefined, { month: 'short' }) });
      }
      new Chart(document.getElementById('growth-chart'), {
        type: 'line',
        data: { labels: months.map((m) => m.label), datasets: [{ label: 'New users', data: months.map((m) => growth[m.key] || 0), borderColor: SAGE, backgroundColor: 'rgba(67,102,82,0.08)', fill: true, tension: 0.35, pointBackgroundColor: SAGE, pointRadius: 4 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } },
      });
      // Text version of the chart for screen readers.
      $('#growth-table').text('New users per month: ' + months.map((m) => `${m.label} ${growth[m.key] || 0}`).join(', ') + '.');

      const ev = d.events || {};
      const ongoing = Math.max(0, n(ev.total_events) - n(ev.upcoming_events) - n(ev.past_events));
      new Chart(document.getElementById('events-chart'), {
        type: 'doughnut',
        data: { labels: ['Upcoming', 'Past', 'Happening now'], datasets: [{ data: [n(ev.upcoming_events), n(ev.past_events), ongoing], backgroundColor: [SAGE, STONE, SAGE_LIGHT], borderWidth: 0 }] },
        options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } },
      });

      new Chart(document.getElementById('content-chart'), {
        type: 'bar',
        data: {
          labels: ['Registrations', 'Feedback', 'Announcements', 'Promos', 'Notifications'],
          datasets: [{ data: [n(d.registrations?.total_registrations), n(d.feedbacks?.total_feedback), n(d.announcements?.total_announcements), n(d.promos?.total_promos), n(d.notifications?.total_notifications)],
            backgroundColor: [SAGE, SAGE_LIGHT, SAGE, SAGE_LIGHT, STONE], borderRadius: 8, maxBarThickness: 48 }],
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } },
      });
    }

    async function load() {
      $('#stat-cards').html(Array.from({ length: 4 }, () => '<div class="skeleton h-28 w-full"></div>').join(''));
      try {
        const { data: d } = await Api.get('/dashboard/admin');
        const u = d.users || {}, ev = d.events || {};
        $('#stat-cards').attr('aria-busy', 'false').html(
          card('Users', n(u.total_users), `${n(u.active_users)} active · ${n(u.inactive_users)} disabled`, 'users.html') +
          card('Events', n(ev.total_events), `${n(ev.upcoming_events)} upcoming`, '../events.html') +
          card('Registrations', n(d.registrations?.total_registrations), 'across all events', '../events.html') +
          card('Feedback', n(d.feedbacks?.total_feedback), 'reviews submitted', '../events.html'));
        charts(d);
      } catch (err) {
        $('#stat-cards').html(UI.errorBox(err.message));
      }
    }
    $(document).on('click', '#stat-cards .js-retry', load);
    load();
  });
}
