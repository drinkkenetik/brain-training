/* ==========================================================================
   Kenetik Circuit — Gamification Engine (Section 6)
   Streaks, levels, badges, Fuel Points
   Local + server dual tracking (Section 11.7.3)
   ========================================================================== */

(function() {
  'use strict';

  var LEVEL_THRESHOLDS = [
    { level: 1, title: 'First Sip', points: 0 },
    { level: 2, title: 'Morning Clarity', points: 500 },
    { level: 3, title: 'Deep Worker', points: 1500 },
    { level: 4, title: 'Flow State', points: 3000 },
    { level: 5, title: 'Full Clarity', points: 5000 },
    { level: 6, title: 'Cognitive Athlete', points: 8000 },
    { level: 7, title: 'Protocol Pro', points: 12000 },
    { level: 8, title: 'Steady Hand', points: 18000 },
    { level: 9, title: 'Mind Architect', points: 25000 },
    { level: 10, title: 'Kenetik Legend', points: 35000 }
  ];

  var STREAK_MILESTONES = [7, 14, 30, 60, 90, 365];

  var gameState = {
    totalPoints: 0,
    level: 1,
    streak: 0,
    streakFreezes: 0,
    lastSessionDate: null,
    badges: []
  };

  function loadState() {
    try {
      var stored = localStorage.getItem('kc_gamification');
      if (stored) {
        var data = JSON.parse(stored);
        Object.keys(data).forEach(function(key) { gameState[key] = data[key]; });
      }
    } catch (e) {}
    reconcileStreak();
  }

  function saveState() {
    try {
      localStorage.setItem('kc_gamification', JSON.stringify(gameState));
    } catch (e) {}
  }

  function reconcileStreak() {
    if (!gameState.lastSessionDate) return;

    var today = new Date().toDateString();
    var lastDate = new Date(gameState.lastSessionDate).toDateString();
    if (today === lastDate) return; // Already trained today

    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === lastDate) return; // Trained yesterday, streak intact

    // Missed a day
    if (gameState.streakFreezes > 0) {
      gameState.streakFreezes--;
      saveState();
    } else {
      // Streak broken (recovery window checked elsewhere)
      var daysMissed = Math.floor((Date.now() - new Date(gameState.lastSessionDate).getTime()) / 86400000);
      if (daysMissed > 2) {
        gameState.streak = 0;
        saveState();
      }
    }
  }

  function onSessionComplete(points, results) {
    var today = new Date().toDateString();
    var lastDate = gameState.lastSessionDate ? new Date(gameState.lastSessionDate).toDateString() : null;

    // Update streak
    if (lastDate !== today) {
      gameState.streak++;
      gameState.lastSessionDate = new Date().toISOString();

      // Award streak freeze every 7 days (max 3)
      if (gameState.streak % 7 === 0 && gameState.streakFreezes < 3) {
        gameState.streakFreezes++;
      }
    }

    // Add points
    gameState.totalPoints += points;

    // Check level up
    var newLevel = 1;
    for (var i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (gameState.totalPoints >= LEVEL_THRESHOLDS[i].points) {
        newLevel = LEVEL_THRESHOLDS[i].level;
        break;
      }
    }

    var leveledUp = newLevel > gameState.level;
    gameState.level = newLevel;

    saveState();

    return {
      leveledUp: leveledUp,
      newLevel: newLevel,
      levelTitle: getLevelTitle(newLevel),
      streakMilestone: STREAK_MILESTONES.indexOf(gameState.streak) !== -1 ? gameState.streak : null
    };
  }

  function getLevelTitle(level) {
    var entry = LEVEL_THRESHOLDS.find(function(l) { return l.level === level; });
    return entry ? entry.title : 'First Sip';
  }

  function getStreak() { return gameState.streak; }
  function getLevel() { return gameState.level; }
  function getTotalPoints() { return gameState.totalPoints; }
  function getStreakFreezes() { return gameState.streakFreezes; }
  function getState() { return gameState; }

  function isInRecoveryWindow() {
    if (!gameState.lastSessionDate || gameState.streak > 0) return false;
    var daysMissed = Math.floor((Date.now() - new Date(gameState.lastSessionDate).getTime()) / 86400000);
    return daysMissed <= 2; // 24-hour recovery window (with some buffer)
  }

  function getStreakStatus() {
    if (gameState.streak > 0) {
      return { status: 'active', days: gameState.streak, freezes: gameState.streakFreezes };
    }
    if (isInRecoveryWindow()) {
      return { status: 'recovery', days: 0, freezes: gameState.streakFreezes, message: 'Complete a session to restore your streak.' };
    }
    return { status: 'broken', days: 0, freezes: gameState.streakFreezes };
  }

  loadState();

  window.KCGamification = {
    onSessionComplete: onSessionComplete,
    getStreak: getStreak,
    getLevel: getLevel,
    getTotalPoints: getTotalPoints,
    getStreakFreezes: getStreakFreezes,
    getStreakStatus: getStreakStatus,
    getLevelTitle: getLevelTitle,
    getState: getState,
    LEVEL_THRESHOLDS: LEVEL_THRESHOLDS
  };

})();
