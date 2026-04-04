/* ==========================================================================
   Kenetik Circuit — Badges & Achievements (Section 6.6)
   Collectible achievements that unlock based on training milestones.
   ========================================================================== */

(function() {
  'use strict';

  var BADGE_DEFINITIONS = [
    { id: 'first-score', name: 'First Score', icon: '🏁', description: 'Complete your baseline assessment.', check: function(s) { return s.totalSessions >= 1; } },
    { id: 'streak-7', name: 'Streak Starter', icon: '🔥', description: 'Achieve a 7-day streak.', check: function(s) { return s.streak >= 7; } },
    { id: 'streak-30', name: 'Streak Master', icon: '🔥', description: 'Achieve a 30-day streak.', check: function(s) { return s.streak >= 30; } },
    { id: 'streak-90', name: 'Unbreakable', icon: '💪', description: '90-day streak.', check: function(s) { return s.streak >= 90; } },
    { id: 'all-exercises', name: 'Brain Athlete', icon: '🏆', description: 'Complete all 15 exercise types.', check: function(s) { return s.uniqueExercises >= 15; } },
    { id: 'quick-read', name: 'Quick Read', icon: '⚡', description: 'Sub-300ms average on Go/No-Go.', check: function(s) { return s.goNoGoAvgRT > 0 && s.goNoGoAvgRT < 300; } },
    { id: 'memory-palace', name: 'Memory Palace', icon: '🧠', description: 'Reach N-back level 5.', check: function(s) { return s.nbackMaxLevel >= 5; } },
    { id: 'perfect-session', name: 'Perfect Session', icon: '💯', description: 'Score 95+ on all 3 exercises in a session.', check: function(s) { return s.perfectSessions >= 1; } },
    { id: 'level-5', name: 'Full Clarity', icon: '🌟', description: 'Reach Level 5.', check: function(s) { return s.level >= 5; } },
    { id: 'level-10', name: 'Kenetik Legend', icon: '👑', description: 'Reach Level 10.', check: function(s) { return s.level >= 10; } },
    { id: 'early-bird', name: 'Early Bird', icon: '🌅', description: 'Complete a session before 7am.', check: function(s) { return s.earlyBirdSessions >= 1; } },
    { id: 'night-owl', name: 'Night Owl', icon: '🦉', description: 'Complete a session after 10pm.', check: function(s) { return s.nightOwlSessions >= 1; } },
    { id: 'speed-demon', name: 'Speed Demon', icon: '💨', description: 'Complete a session in under 5 minutes.', check: function(s) { return s.fastSessions >= 1; } },
    { id: 'brain-score-80', name: 'Sharp Mind', icon: '🎯', description: 'Reach a Brain Score of 80+.', check: function(s) { return s.brainScore >= 80; } },
    { id: 'brain-score-95', name: 'Elite Cognition', icon: '🧬', description: 'Reach a Brain Score of 95+.', check: function(s) { return s.brainScore >= 95; } },
    { id: 'ten-pbs', name: 'Record Breaker', icon: '📈', description: 'Set 10 personal bests.', check: function(s) { return s.totalPBs >= 10; } },
    { id: 'domain-master', name: 'Domain Master', icon: '🎓', description: 'Score 90+ in all 6 domains.', check: function(s) { return s.domainsAbove90 >= 6; } }
  ];

  var badgeState = {
    earned: {}, // id -> { earnedAt }
    stats: {}
  };

  function loadState() {
    try {
      var stored = localStorage.getItem('kc_badges');
      if (stored) {
        var data = JSON.parse(stored);
        badgeState.earned = data.earned || {};
        badgeState.stats = data.stats || {};
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem('kc_badges', JSON.stringify(badgeState));
    } catch (e) {}
  }

  function updateStats(sessionData) {
    var s = badgeState.stats;
    s.totalSessions = (s.totalSessions || 0) + 1;
    s.streak = window.KCGamification ? window.KCGamification.getStreak() : 0;
    s.level = window.KCGamification ? window.KCGamification.getLevel() : 1;
    s.brainScore = sessionData.brainScore || s.brainScore || 0;

    // Track unique exercises
    if (!s.exercisesPlayed) s.exercisesPlayed = {};
    if (sessionData.results) {
      sessionData.results.forEach(function(r) {
        s.exercisesPlayed[r.exercise] = true;
        if (r.isPB) s.totalPBs = (s.totalPBs || 0) + 1;
      });
    }
    s.uniqueExercises = Object.keys(s.exercisesPlayed).length;

    // Check time of day
    var hour = new Date().getHours();
    if (hour < 7) s.earlyBirdSessions = (s.earlyBirdSessions || 0) + 1;
    if (hour >= 22) s.nightOwlSessions = (s.nightOwlSessions || 0) + 1;

    // Perfect session check (all 3 exercises scored 95+)
    if (sessionData.results && sessionData.results.length >= 3) {
      var allHigh = sessionData.results.every(function(r) { return r.normalizedScore >= 95; });
      if (allHigh) s.perfectSessions = (s.perfectSessions || 0) + 1;
    }

    // Go/No-Go and N-back specific stats
    if (sessionData.results) {
      sessionData.results.forEach(function(r) {
        if (r.exercise === 'go-no-go' && r.rawResult && r.rawResult.avgRT) {
          s.goNoGoAvgRT = r.rawResult.avgRT;
        }
        if (r.exercise === 'nback' && r.rawResult && r.rawResult.difficulty) {
          s.nbackMaxLevel = Math.max(s.nbackMaxLevel || 0, r.rawResult.difficulty);
        }
      });
    }

    saveState();
  }

  function checkBadges() {
    var newBadges = [];
    BADGE_DEFINITIONS.forEach(function(badge) {
      if (!badgeState.earned[badge.id] && badge.check(badgeState.stats)) {
        badgeState.earned[badge.id] = { earnedAt: new Date().toISOString() };
        newBadges.push(badge);
      }
    });
    saveState();
    return newBadges;
  }

  function onSessionComplete(sessionData) {
    updateStats(sessionData);
    return checkBadges();
  }

  function getEarnedBadges() {
    return BADGE_DEFINITIONS.filter(function(b) { return badgeState.earned[b.id]; });
  }

  function getAllBadges() {
    return BADGE_DEFINITIONS.map(function(b) {
      return {
        id: b.id,
        name: b.name,
        icon: b.icon,
        description: b.description,
        earned: !!badgeState.earned[b.id],
        earnedAt: badgeState.earned[b.id] ? badgeState.earned[b.id].earnedAt : null
      };
    });
  }

  function renderBadgeGrid() {
    var badges = getAllBadges();
    return '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px;">' +
      badges.map(function(b) {
        return '<div style="text-align: center; opacity: ' + (b.earned ? '1' : '0.3') + ';">' +
          '<div style="font-size: 32px; margin-bottom: 4px;">' + b.icon + '</div>' +
          '<div style="font-size: 11px; font-weight: 500;">' + b.name + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  loadState();

  window.KCBadges = {
    onSessionComplete: onSessionComplete,
    getEarnedBadges: getEarnedBadges,
    getAllBadges: getAllBadges,
    renderBadgeGrid: renderBadgeGrid
  };

})();
