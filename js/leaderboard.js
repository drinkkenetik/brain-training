/* ==========================================================================
   Kenetik Circuit — Leaderboards (Section 6.5)
   Global, Weekly, Friends, Age Group views.
   Stored in Supabase; local stub until connected.
   ========================================================================== */

(function() {
  'use strict';

  // Local leaderboard cache
  var leaderboardCache = {
    global: [],
    weekly: [],
    lastFetch: null
  };

  function loadCache() {
    try {
      var stored = localStorage.getItem('kc_leaderboard');
      if (stored) leaderboardCache = JSON.parse(stored);
    } catch (e) {}
  }

  function saveCache() {
    try {
      localStorage.setItem('kc_leaderboard', JSON.stringify(leaderboardCache));
    } catch (e) {}
  }

  function fetchLeaderboard(type, callback) {
    // TODO: Fetch from Supabase when connected
    // For now, return local data + simulated entries
    var identity = window.KCIdentity ? window.KCIdentity.getIdentity() : {};
    var gamState = window.KCGamification ? window.KCGamification.getState() : {};

    // Simulated leaderboard entries
    var simulated = [
      { rank: 1, name: 'Sarah K.', score: 96, streak: 45 },
      { rank: 2, name: 'Mike T.', score: 94, streak: 32 },
      { rank: 3, name: 'Lisa M.', score: 91, streak: 28 },
      { rank: 4, name: 'Chris P.', score: 89, streak: 21 },
      { rank: 5, name: 'Alex R.', score: 87, streak: 18 },
      { rank: 6, name: 'Jordan L.', score: 85, streak: 14 },
      { rank: 7, name: 'Taylor S.', score: 83, streak: 12 },
      { rank: 8, name: 'Morgan H.', score: 80, streak: 9 },
      { rank: 9, name: 'Casey B.', score: 78, streak: 7 },
      { rank: 10, name: 'Riley N.', score: 75, streak: 5 }
    ];

    callback(simulated);
  }

  function renderLeaderboard(entries, highlightUser) {
    if (!entries || entries.length === 0) {
      return '<div class="kc-caption kc-text-center" style="padding: 24px;">No leaderboard data yet. Complete more sessions to see rankings.</div>';
    }

    var html = '<div style="display: flex; flex-direction: column; gap: 4px;">';
    entries.forEach(function(entry) {
      var isUser = entry.name === highlightUser;
      html += '<div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--kc-radius); ' +
        (isUser ? 'background: rgba(251, 177, 27, 0.1); border: 1px solid rgba(251, 177, 27, 0.2);' : '') + '">' +
        '<div style="width: 28px; text-align: center; font-weight: 700; color: ' +
          (entry.rank <= 3 ? 'var(--kc-pineapple)' : 'var(--kc-text-muted)') + ';">' +
          (entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank) +
        '</div>' +
        '<div style="flex: 1; font-weight: ' + (isUser ? '700' : '400') + ';">' + entry.name + '</div>' +
        '<div style="font-family: var(--kc-font-heading); font-weight: 700; font-size: 18px;">' + entry.score + '</div>' +
        '<div class="kc-caption" style="min-width: 50px; text-align: right;">🔥 ' + entry.streak + '</div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  loadCache();

  window.KCLeaderboard = {
    fetchLeaderboard: fetchLeaderboard,
    renderLeaderboard: renderLeaderboard
  };

})();
