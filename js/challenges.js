/* ==========================================================================
   Kenetik Circuit — Weekly Challenges (Section 6.4)
   Fresh challenges every Monday. 200 Fuel Points on completion.
   Challenge exercise overrides the selection algorithm.
   ========================================================================== */

(function() {
  'use strict';

  var CHALLENGE_TEMPLATES = [
    { id: 'stroop-pr', name: 'Beat your Stroop PR', exercise: 'stroop', type: 'personal-best', description: 'Set a new personal best on the Stroop Test this week.' },
    { id: 'five-sessions', name: 'Complete 5 sessions', exercise: null, type: 'session-count', target: 5, description: 'Complete 5 training sessions this week.' },
    { id: 'score-90', name: 'Score 90+ on any exercise', exercise: null, type: 'high-score', target: 90, description: 'Achieve a normalized score of 90 or higher on any exercise.' },
    { id: 'three-new', name: 'Try 3 new exercises', exercise: null, type: 'variety', target: 3, description: 'Play 3 exercises you haven\'t done this month.' },
    { id: 'domain-improve', name: 'Improve your weakest domain', exercise: null, type: 'domain-improve', description: 'Raise your lowest domain score by 10+ points.' },
    { id: 'speed-match-pr', name: 'Speed Match champion', exercise: 'speed-match', type: 'personal-best', description: 'Set a new personal best on Speed Match.' },
    { id: 'nback-level5', name: 'Reach N-back level 3', exercise: 'nback', type: 'difficulty-reach', target: 3, description: 'Complete an N-back session at difficulty level 3 or higher.' },
    { id: 'streak-7', name: '7-day streak', exercise: null, type: 'streak', target: 7, description: 'Maintain a 7-day training streak.' },
    { id: 'all-domains', name: 'Train all 6 domains', exercise: null, type: 'all-domains', description: 'Complete at least one exercise in each of the 6 cognitive domains this week.' },
    { id: 'trail-fast', name: 'Trail blazer', exercise: 'trail-connect', type: 'personal-best', description: 'Set a new personal best on Trail Connect.' }
  ];

  var challengeState = {
    currentChallenge: null,
    weekStart: null,
    progress: {},
    history: []
  };

  function loadState() {
    try {
      var stored = localStorage.getItem('kc_challenges');
      if (stored) {
        var data = JSON.parse(stored);
        Object.keys(data).forEach(function(k) { challengeState[k] = data[k]; });
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem('kc_challenges', JSON.stringify(challengeState));
    } catch (e) {}
  }

  function getMonday() {
    var now = new Date();
    var day = now.getDay();
    var diff = now.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  function checkAndRotateChallenge() {
    var currentMonday = getMonday();

    if (challengeState.weekStart !== currentMonday) {
      // New week — rotate challenge
      if (challengeState.currentChallenge) {
        challengeState.history.push({
          challenge: challengeState.currentChallenge,
          week: challengeState.weekStart,
          completed: challengeState.currentChallenge.completed || false
        });
      }

      // Pick a random challenge that wasn't last week's
      var lastId = challengeState.currentChallenge ? challengeState.currentChallenge.id : null;
      var available = CHALLENGE_TEMPLATES.filter(function(t) { return t.id !== lastId; });
      var template = available[Math.floor(Math.random() * available.length)];

      challengeState.currentChallenge = {
        id: template.id,
        name: template.name,
        exercise: template.exercise,
        type: template.type,
        target: template.target || null,
        description: template.description,
        progress: 0,
        completed: false
      };
      challengeState.weekStart = currentMonday;
      challengeState.progress = {};
      saveState();
    }
  }

  function getCurrentChallenge() {
    checkAndRotateChallenge();
    return challengeState.currentChallenge;
  }

  function updateProgress(sessionData) {
    if (!challengeState.currentChallenge || challengeState.currentChallenge.completed) return;

    var ch = challengeState.currentChallenge;

    switch (ch.type) {
      case 'personal-best':
        // Check if the user beat their PR on the target exercise
        if (sessionData.results) {
          sessionData.results.forEach(function(r) {
            if (r.exercise === ch.exercise && r.isPB) {
              ch.completed = true;
            }
          });
        }
        break;

      case 'session-count':
        ch.progress = (ch.progress || 0) + 1;
        if (ch.progress >= ch.target) ch.completed = true;
        break;

      case 'high-score':
        if (sessionData.results) {
          sessionData.results.forEach(function(r) {
            if (r.normalizedScore >= ch.target) ch.completed = true;
          });
        }
        break;

      case 'variety':
        if (!challengeState.progress.exercisesPlayed) challengeState.progress.exercisesPlayed = {};
        if (sessionData.results) {
          sessionData.results.forEach(function(r) {
            challengeState.progress.exercisesPlayed[r.exercise] = true;
          });
        }
        ch.progress = Object.keys(challengeState.progress.exercisesPlayed).length;
        if (ch.progress >= ch.target) ch.completed = true;
        break;

      case 'streak':
        var streak = window.KCGamification ? window.KCGamification.getStreak() : 0;
        ch.progress = streak;
        if (streak >= ch.target) ch.completed = true;
        break;

      case 'all-domains':
        if (!challengeState.progress.domainsPlayed) challengeState.progress.domainsPlayed = {};
        if (sessionData.results && window.KCEngine) {
          sessionData.results.forEach(function(r) {
            var meta = window.KCEngine.EXERCISE_REGISTRY[r.exercise];
            if (meta) challengeState.progress.domainsPlayed[meta.domain] = true;
          });
        }
        ch.progress = Object.keys(challengeState.progress.domainsPlayed).length;
        if (ch.progress >= 6) ch.completed = true;
        break;

      case 'difficulty-reach':
        if (sessionData.results) {
          sessionData.results.forEach(function(r) {
            if (r.exercise === ch.exercise && r.rawResult && r.rawResult.difficulty >= ch.target) {
              ch.completed = true;
            }
          });
        }
        break;

      case 'domain-improve':
        // Tracked via Brain Score domain comparison (simplified)
        ch.progress = 0; // TODO: compare domain scores
        break;
    }

    if (ch.completed) {
      // Award 200 Fuel Points
      if (window.KCGamification) {
        window.KCGamification.onSessionComplete(200, []);
      }
      if (window.KCKlaviyo) {
        window.KCKlaviyo.trackEvent('Brain Weekly Challenge Complete', {
          challenge_name: ch.name,
          points_earned: 200
        });
      }
      if (window.KCLoyaltyLion) {
        window.KCLoyaltyLion.trackActivity('brain_weekly_challenge', 200);
      }
    }

    saveState();
    return ch;
  }

  // Get the challenge exercise to override selection algorithm (Section 5.2)
  function getChallengeExercise() {
    var ch = getCurrentChallenge();
    if (ch && !ch.completed && ch.exercise) {
      return ch.exercise;
    }
    return null;
  }

  function renderChallengeCard() {
    var ch = getCurrentChallenge();
    if (!ch) return '';

    var progressHTML = '';
    if (ch.target) {
      var pct = Math.min(100, ((ch.progress || 0) / ch.target) * 100);
      progressHTML = '<div class="kc-progress-bar" style="margin-top: 8px;"><div class="kc-progress-bar__fill" style="width: ' + pct + '%;"></div></div>' +
        '<div class="kc-caption" style="margin-top: 4px;">' + (ch.progress || 0) + ' / ' + ch.target + '</div>';
    }

    return '<div class="kc-card" style="text-align: left; padding: var(--kc-space-md);">' +
      '<div style="display: flex; justify-content: space-between; align-items: center;">' +
        '<div class="kc-eyebrow" style="color: var(--kc-peach);">WEEKLY CHALLENGE</div>' +
        (ch.completed ? '<span style="color: var(--kc-success); font-weight: 700; font-size: 13px;">✓ COMPLETE</span>' : '') +
      '</div>' +
      '<div style="font-size: 16px; font-weight: 700; margin-top: 4px;">' + ch.name + '</div>' +
      '<div class="kc-caption" style="margin-top: 4px;">' + ch.description + '</div>' +
      (ch.completed ? '<div class="kc-points-earned" style="margin-top: 8px; font-size: 14px;">+200 Fuel Points</div>' : progressHTML) +
    '</div>';
  }

  loadState();

  window.KCChallenges = {
    getCurrentChallenge: getCurrentChallenge,
    updateProgress: updateProgress,
    getChallengeExercise: getChallengeExercise,
    renderChallengeCard: renderChallengeCard
  };

})();
