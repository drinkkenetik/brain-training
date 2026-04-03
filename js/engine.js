/* ==========================================================================
   Kenetik Circuit — Engine
   Session logic, Brain Score formula, adaptive difficulty, exercise selection
   Per spec v3.3, Sections 5.1–5.6, 11.5
   ========================================================================== */

(function() {
  'use strict';

  // ===== CONSTANTS =====
  var EXERCISES_PER_SESSION = 3;
  var DECAY_THRESHOLD_DAYS = 14;
  var DECAY_RATE_PER_WEEK = 0.03;
  var ROLLING_WINDOW_DAYS = 7;
  var DIFFICULTY_WINDOW_SIZE = 15; // 10-20 trials rolling window
  var ACCURACY_THRESHOLD_RAISE = 0.85;
  var ACCURACY_THRESHOLD_LOWER = 0.65;

  // Sigmoid normalization defaults (Section 5.3.2)
  var SIGMOID_K = 0.02;

  // Exercise midpoints (population medians, ms) — seeded from Brandon's baselines
  var EXERCISE_MIDPOINTS = {
    stroop: 650,
    dsst: 1200,
    flanker: 500,
    'speed-match': 600,
    'visual-search': 800,
    'go-no-go': 350,
    'trail-connect': 700,
    'number-sense': 900
  };

  // Domain definitions (Section 5.3.1)
  var DOMAINS = {
    'processing-speed': ['dsst', 'speed-match', 'number-sense', 'trail-connect'],
    'working-memory': ['nback', 'speed-match', 'sequence-memory'],
    'executive-function': ['stroop', 'flanker', 'go-no-go'],
    'cognitive-flexibility': ['task-switching', 'trail-connect', 'dual-focus'],
    'attention': ['visual-search', 'go-no-go', 'dual-focus'],
    'spatial-language': ['mental-rotation', 'pattern-matrix', 'word-sprint', 'number-sense']
  };

  // Exercise metadata
  var EXERCISE_REGISTRY = {
    stroop: { name: 'Stroop Test', domain: 'executive-function', scoreType: 'rt', icon: '🎯', unlockLevel: 1 },
    dsst: { name: 'Digit Symbol', domain: 'processing-speed', scoreType: 'rt', icon: '⚡', unlockLevel: 1 },
    flanker: { name: 'Flanker Task', domain: 'executive-function', scoreType: 'rt', icon: '➡️', unlockLevel: 1 },
    nback: { name: 'N-Back', domain: 'working-memory', scoreType: 'accuracy', icon: '🧠', unlockLevel: 1 },
    'task-switching': { name: 'Task Switching', domain: 'cognitive-flexibility', scoreType: 'rt', icon: '🔄', unlockLevel: 1 },
    'speed-match': { name: 'Speed Match', domain: 'processing-speed', scoreType: 'rt', icon: '⚡', unlockLevel: 2 },
    'visual-search': { name: 'Visual Search', domain: 'attention', scoreType: 'rt', icon: '🔍', unlockLevel: 2 },
    'pattern-matrix': { name: 'Pattern Matrix', domain: 'spatial-language', scoreType: 'accuracy', icon: '🧩', unlockLevel: 3 },
    'sequence-memory': { name: 'Sequence Memory', domain: 'working-memory', scoreType: 'accuracy', icon: '🔢', unlockLevel: 3 },
    'mental-rotation': { name: 'Mental Rotation', domain: 'spatial-language', scoreType: 'accuracy', icon: '🔄', unlockLevel: 4 },
    'word-sprint': { name: 'Word Sprint', domain: 'spatial-language', scoreType: 'mixed', icon: '📝', unlockLevel: 4 },
    'go-no-go': { name: 'Go/No-Go', domain: 'executive-function', scoreType: 'rt', icon: '🚦', unlockLevel: 5 },
    'number-sense': { name: 'Number Sense', domain: 'spatial-language', scoreType: 'mixed', icon: '🔢', unlockLevel: 5 },
    'dual-focus': { name: 'Dual Focus', domain: 'attention', scoreType: 'mixed', icon: '👁️', unlockLevel: 5 },
    'trail-connect': { name: 'Trail Connect', domain: 'cognitive-flexibility', scoreType: 'rt', icon: '🔗', unlockLevel: 5 }
  };

  // First-week curated sessions (Section 5.4.2)
  var ONRAMP_SESSIONS = {
    1: ['stroop', 'dsst', 'nback'],
    2: ['flanker', 'speed-match', 'task-switching'],
    3: null, // Dynamic: best + visual-search + new domain
    4: null, // 2 algorithm + 1 curated
    5: null, // Full algorithm
    6: null,
    7: null
  };

  // Input device latency offsets (Section 11.5)
  var LATENCY_OFFSETS = {
    mouse: -30,
    trackpad: -15,
    touch: 0
  };

  // ===== STATE =====
  var engineState = {
    currentScreen: 'arrival',
    sessionDay: 0,
    sessionExercises: [],
    currentExerciseIndex: 0,
    sessionResults: [],
    sessionPoints: 0,
    inputDevice: 'touch', // detected at session start
    isFirstVisit: true
  };

  // ===== IndexedDB LOCAL STORAGE =====
  var DB_NAME = 'kenetik_circuit';
  var DB_VERSION = 1;
  var db = null;

  function openDB(callback) {
    if (db) { callback(db); return; }
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains('scores')) {
        var scores = d.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
        scores.createIndex('exercise', 'exercise', { unique: false });
        scores.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!d.objectStoreNames.contains('sessions')) {
        d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('state')) {
        d.createObjectStore('state', { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains('eventQueue')) {
        d.createObjectStore('eventQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = function(e) {
      db = e.target.result;
      callback(db);
    };
    request.onerror = function() {
      callback(null);
    };
  }

  function dbPut(storeName, data, callback) {
    openDB(function(d) {
      if (!d) { if (callback) callback(null); return; }
      try {
        var tx = d.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var req = store.put(data);
        req.onsuccess = function() { if (callback) callback(req.result); };
        req.onerror = function() { if (callback) callback(null); };
      } catch (e) { if (callback) callback(null); }
    });
  }

  function dbGetAll(storeName, callback) {
    openDB(function(d) {
      if (!d) { callback([]); return; }
      try {
        var tx = d.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.getAll();
        req.onsuccess = function() { callback(req.result || []); };
        req.onerror = function() { callback([]); };
      } catch (e) { callback([]); }
    });
  }

  function dbGet(storeName, key, callback) {
    openDB(function(d) {
      if (!d) { callback(null); return; }
      try {
        var tx = d.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.get(key);
        req.onsuccess = function() { callback(req.result || null); };
        req.onerror = function() { callback(null); };
      } catch (e) { callback(null); }
    });
  }

  // ===== INPUT DEVICE DETECTION (Section 11.5) =====
  function detectInputDevice() {
    var detected = 'touch';
    window.addEventListener('pointerdown', function handler(e) {
      if (e.pointerType === 'mouse') detected = 'mouse';
      else if (e.pointerType === 'pen') detected = 'touch';
      else if (e.pointerType === 'touch') detected = 'touch';
      engineState.inputDevice = detected;
      window.removeEventListener('pointerdown', handler);
    }, { once: true });

    // Heuristic: if no touch support, likely mouse/trackpad
    if (!('ontouchstart' in window)) {
      // Check for trackpad via navigator (rough heuristic)
      detected = 'mouse';
      engineState.inputDevice = detected;
    }
  }

  function normalizeRT(rawRT) {
    var offset = LATENCY_OFFSETS[engineState.inputDevice] || 0;
    return Math.max(0, rawRT + offset);
  }

  // ===== SCORE NORMALIZATION (Section 5.3.2) =====
  function sigmoidNormalize(rt, exerciseType) {
    var midpoint = EXERCISE_MIDPOINTS[exerciseType] || 600;
    return 100 / (1 + Math.exp(SIGMOID_K * (rt - midpoint)));
  }

  function normalizeScore(exerciseType, rawData) {
    var meta = EXERCISE_REGISTRY[exerciseType];
    if (!meta) return 50;

    if (meta.scoreType === 'accuracy') {
      return Math.min(100, Math.max(0, rawData.accuracy || 0));
    }
    if (meta.scoreType === 'rt') {
      return sigmoidNormalize(rawData.avgRT || 600, exerciseType);
    }
    if (meta.scoreType === 'mixed') {
      var accComponent = Math.min(100, Math.max(0, rawData.accuracy || 0));
      var rtComponent = sigmoidNormalize(rawData.avgRT || 600, exerciseType);
      return 0.6 * accComponent + 0.4 * rtComponent;
    }
    return 50;
  }

  // ===== BRAIN SCORE COMPOSITE (Section 5.3.3) =====
  function computeBrainScore(scores, callback) {
    var now = Date.now();
    var sevenDaysAgo = now - (ROLLING_WINDOW_DAYS * 86400000);
    var domainScores = {};
    var domainCount = 0;

    var domainNames = Object.keys(DOMAINS);
    domainNames.forEach(function(domain) {
      var exercises = DOMAINS[domain];
      var bestScore = null;
      var bestDate = 0;

      scores.forEach(function(s) {
        if (exercises.indexOf(s.exercise) === -1) return;
        var scoreDate = new Date(s.createdAt).getTime();

        // Use best score in 7-day window, or most recent if no recent scores
        var normalized = s.normalizedScore || 0;
        if (scoreDate >= sevenDaysAgo) {
          if (bestScore === null || normalized > bestScore) {
            bestScore = normalized;
            bestDate = scoreDate;
          }
        } else if (bestScore === null) {
          if (bestDate === 0 || scoreDate > bestDate) {
            bestScore = normalized;
            bestDate = scoreDate;
          }
        }
      });

      if (bestScore !== null) {
        // Apply decay (Section 5.3.4)
        var daysSince = (now - bestDate) / 86400000;
        if (daysSince > DECAY_THRESHOLD_DAYS) {
          var weeksOverdue = (daysSince - DECAY_THRESHOLD_DAYS) / 7;
          bestScore = bestScore * Math.pow(1 - DECAY_RATE_PER_WEEK, weeksOverdue);
        }
        domainScores[domain] = Math.round(bestScore);
        domainCount++;
      }
    });

    if (domainCount === 0) {
      callback({ score: 0, domains: domainScores, domainCount: 0 });
      return;
    }

    var total = 0;
    Object.keys(domainScores).forEach(function(d) { total += domainScores[d]; });
    var composite = Math.round(total / domainCount);
    composite = Math.max(0, Math.min(100, composite));

    callback({ score: composite, domains: domainScores, domainCount: domainCount });
  }

  // ===== ADAPTIVE DIFFICULTY (Section 4.2, Brandon's notes) =====
  // 5 levels per exercise. Rolling window of 10-20 trials.
  // Only lower between sessions, raise mid-session.
  function getExerciseDifficulty(exerciseType, callback) {
    dbGet('state', 'difficulty_' + exerciseType, function(data) {
      callback(data ? data.level : 1);
    });
  }

  function updateDifficulty(exerciseType, recentAccuracies, isMidSession) {
    if (recentAccuracies.length < 10) return;

    var windowAccuracies = recentAccuracies.slice(-DIFFICULTY_WINDOW_SIZE);
    var avgAccuracy = windowAccuracies.reduce(function(a, b) { return a + b; }, 0) / windowAccuracies.length;

    getExerciseDifficulty(exerciseType, function(currentLevel) {
      var newLevel = currentLevel;

      if (avgAccuracy >= ACCURACY_THRESHOLD_RAISE && currentLevel < 5) {
        newLevel = currentLevel + 1; // Can raise mid-session
      } else if (avgAccuracy < ACCURACY_THRESHOLD_LOWER && currentLevel > 1 && !isMidSession) {
        newLevel = currentLevel - 1; // Only lower between sessions
      }

      if (newLevel !== currentLevel) {
        dbPut('state', { key: 'difficulty_' + exerciseType, level: newLevel });
      }
    });
  }

  // ===== EXERCISE SELECTION ALGORITHM (Section 5.2) =====
  function selectExercises(userState, scores, callback) {
    var day = userState.sessionDay || 1;

    // First-week curated onramp (Section 5.4.2)
    if (day <= 2 && ONRAMP_SESSIONS[day]) {
      callback(ONRAMP_SESSIONS[day]);
      return;
    }

    // Day 3: best + visual-search + new domain
    if (day === 3) {
      var bestExercise = findBestExercise(scores) || 'stroop';
      callback([bestExercise, 'visual-search', 'flanker']);
      return;
    }

    // Day 4+: algorithm selects (Day 4 gets 1 curated)
    var available = getAvailableExercises(userState.level || 1, day);
    var selected = algorithmSelect(available, scores, EXERCISES_PER_SESSION);
    callback(selected);
  }

  function getAvailableExercises(level, day) {
    var available = [];
    Object.keys(EXERCISE_REGISTRY).forEach(function(key) {
      var ex = EXERCISE_REGISTRY[key];
      // During onramp, Speed Match and Visual Search available regardless of level
      if (day <= 7 && (key === 'speed-match' || key === 'visual-search')) {
        available.push(key);
        return;
      }
      if (ex.unlockLevel <= level) {
        available.push(key);
      }
    });
    return available;
  }

  function algorithmSelect(available, scores, count) {
    // Three factors weighted equally: recency, weakness, enjoyment
    var scored = available.map(function(ex) {
      var recencyScore = getRecencyScore(ex, scores);
      var weaknessScore = getWeaknessScore(ex, scores);
      var enjoymentScore = getEnjoymentScore(ex, scores);
      return {
        exercise: ex,
        total: recencyScore + weaknessScore + enjoymentScore
      };
    });

    scored.sort(function(a, b) { return b.total - a.total; });

    // Ensure domain variety: don't pick two exercises from the same primary domain
    var selected = [];
    var usedDomains = {};
    for (var i = 0; i < scored.length && selected.length < count; i++) {
      var domain = EXERCISE_REGISTRY[scored[i].exercise].domain;
      if (!usedDomains[domain] || selected.length >= count - 1) {
        selected.push(scored[i].exercise);
        usedDomains[domain] = true;
      }
    }

    // Fill remaining if needed
    while (selected.length < count && selected.length < available.length) {
      for (var j = 0; j < scored.length && selected.length < count; j++) {
        if (selected.indexOf(scored[j].exercise) === -1) {
          selected.push(scored[j].exercise);
        }
      }
    }

    return selected;
  }

  function getRecencyScore(exercise, scores) {
    var now = Date.now();
    var twoDaysAgo = now - (2 * 86400000);
    var lastPlayed = 0;
    scores.forEach(function(s) {
      if (s.exercise === exercise) {
        var d = new Date(s.createdAt).getTime();
        if (d > lastPlayed) lastPlayed = d;
      }
    });
    if (lastPlayed === 0) return 10; // Never played = high priority
    if (lastPlayed > twoDaysAgo) return 0; // Played recently = deprioritize
    return 5;
  }

  function getWeaknessScore(exercise, scores) {
    var domain = EXERCISE_REGISTRY[exercise].domain;
    var domainScores = scores.filter(function(s) {
      return DOMAINS[domain] && DOMAINS[domain].indexOf(s.exercise) !== -1;
    });
    if (domainScores.length === 0) return 8; // Untested domain = high priority
    var avg = domainScores.reduce(function(a, s) { return a + (s.normalizedScore || 0); }, 0) / domainScores.length;
    return avg < 50 ? 8 : avg < 70 ? 5 : 2;
  }

  function getEnjoymentScore(exercise, scores) {
    var completions = scores.filter(function(s) { return s.exercise === exercise && s.completed; });
    return Math.min(10, completions.length); // More completions = more enjoyed
  }

  function findBestExercise(scores) {
    var best = null;
    var bestScore = -1;
    scores.forEach(function(s) {
      if ((s.normalizedScore || 0) > bestScore) {
        bestScore = s.normalizedScore;
        best = s.exercise;
      }
    });
    return best;
  }

  // ===== SCREEN MANAGEMENT =====
  var allScreens = ['arrival', 'dashboard', 'exercise', 'countdown', 'results', 'email-gate', 'return'];

  function showScreen(name) {
    allScreens.forEach(function(s) {
      var el = document.getElementById('screen-' + s);
      if (el) {
        el.classList.remove('kc-screen--active');
        el.classList.add('kc-screen');
      }
    });
    var target = document.getElementById('screen-' + name);
    if (target) {
      target.classList.remove('kc-screen');
      target.classList.add('kc-screen--active');
    }
    engineState.currentScreen = name;

    // Show/hide topbar (visible on dashboard, results, not on arrival/exercise)
    var topbar = document.getElementById('kc-topbar');
    if (topbar) {
      if (name === 'dashboard' || name === 'results' || name === 'return') {
        topbar.classList.remove('kc-hidden');
      } else {
        topbar.classList.add('kc-hidden');
      }
    }
  }

  // ===== SESSION FLOW =====
  function startSession() {
    engineState.currentExerciseIndex = 0;
    engineState.sessionResults = [];
    engineState.sessionPoints = 0;
    runNextExercise();
  }

  function runNextExercise() {
    if (engineState.currentExerciseIndex >= engineState.sessionExercises.length) {
      finishSession();
      return;
    }

    var exerciseKey = engineState.sessionExercises[engineState.currentExerciseIndex];
    var meta = EXERCISE_REGISTRY[exerciseKey];

    // Update exercise header
    var nameEl = document.getElementById('exercise-name');
    var progressEl = document.getElementById('exercise-progress');
    if (nameEl) nameEl.textContent = meta ? meta.name : exerciseKey;
    if (progressEl) progressEl.textContent = (engineState.currentExerciseIndex + 1) + ' / ' + engineState.sessionExercises.length;

    // Show countdown then exercise
    showCountdown(function() {
      showScreen('exercise');
      launchExercise(exerciseKey);
    });
  }

  function showCountdown(callback) {
    showScreen('countdown');
    var numEl = document.getElementById('countdown-number');
    var labelEl = document.getElementById('countdown-label');
    var exerciseKey = engineState.sessionExercises[engineState.currentExerciseIndex];
    var meta = EXERCISE_REGISTRY[exerciseKey];
    if (labelEl) labelEl.textContent = meta ? meta.name : 'Get ready...';

    var count = 3;
    numEl.textContent = count;
    var interval = setInterval(function() {
      count--;
      if (count > 0) {
        numEl.textContent = count;
      } else {
        clearInterval(interval);
        callback();
      }
    }, 1000);
  }

  function launchExercise(exerciseKey) {
    var area = document.getElementById('exercise-area');
    if (!area) return;
    area.innerHTML = '';

    // Get difficulty then launch the game module
    getExerciseDifficulty(exerciseKey, function(level) {
      var game = window.KCGames && window.KCGames[exerciseKey];
      if (game && typeof game.init === 'function') {
        game.init(area, {
          difficulty: level,
          onComplete: function(result) {
            handleExerciseComplete(exerciseKey, result);
          },
          normalizeRT: normalizeRT
        });
      } else {
        // Fallback: skip unavailable exercise
        handleExerciseComplete(exerciseKey, {
          score: 0, accuracy: 0, avgRT: 0, trials: [],
          completed: false
        });
      }
    });
  }

  function handleExerciseComplete(exerciseKey, result) {
    var normalized = normalizeScore(exerciseKey, result);
    var points = 25; // Per exercise (Section 6.1)

    // Personal best bonus
    var isPB = false; // TODO: check against history

    var scoreRecord = {
      exercise: exerciseKey,
      rawScore: result.score || 0,
      accuracy: result.accuracy || 0,
      avgRT: result.avgRT || 0,
      normalizedScore: normalized,
      difficulty: result.difficulty || 1,
      inputDevice: engineState.inputDevice,
      completed: result.completed !== false,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    // Save to IndexedDB immediately (Section 11.7.1)
    dbPut('scores', scoreRecord);

    engineState.sessionResults.push({
      exercise: exerciseKey,
      normalizedScore: normalized,
      rawResult: result,
      points: points
    });
    engineState.sessionPoints += points;

    // Update difficulty based on recent trials (between exercises = between-session boundary)
    if (result.trialAccuracies && result.trialAccuracies.length >= 10) {
      updateDifficulty(exerciseKey, result.trialAccuracies, false);
    }

    // Move to next exercise (300ms fade per Section 3.8)
    engineState.currentExerciseIndex++;
    setTimeout(function() {
      runNextExercise();
    }, 300);
  }

  function finishSession() {
    // Add session completion bonus (100 pts for 3+ exercises)
    if (engineState.sessionResults.length >= 3) {
      engineState.sessionPoints += 100;
    }

    // Save session record
    var sessionRecord = {
      exercises: engineState.sessionResults.map(function(r) { return r.exercise; }),
      results: engineState.sessionResults,
      totalPoints: engineState.sessionPoints,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    dbPut('sessions', sessionRecord);

    // Compute Brain Score
    dbGetAll('scores', function(allScores) {
      computeBrainScore(allScores, function(brainData) {
        showResults(brainData);

        // Fire events to gamification, Klaviyo, LoyaltyLion
        if (window.KCGamification) {
          window.KCGamification.onSessionComplete(engineState.sessionPoints, engineState.sessionResults);
        }
        if (window.KCKlaviyo) {
          window.KCKlaviyo.trackSessionComplete({
            exercises: engineState.sessionResults,
            points: engineState.sessionPoints,
            brainScore: brainData.score
          });
        }
        if (window.KCLoyaltyLion) {
          window.KCLoyaltyLion.trackActivity('brain_daily_session', engineState.sessionPoints);
        }
      });
    });
  }

  // ===== RESULTS SCREEN (Section 5.5) =====
  function showResults(brainData) {
    showScreen('results');

    var scoreEl = document.getElementById('results-brain-score');
    if (scoreEl) scoreEl.textContent = brainData.score;

    var changeEl = document.getElementById('results-score-change');
    // TODO: compare with previous session's score
    if (changeEl) changeEl.textContent = '';

    // Populate exercise summary tiles
    var exercisesEl = document.getElementById('results-exercises');
    if (exercisesEl) {
      exercisesEl.innerHTML = '';
      engineState.sessionResults.forEach(function(r) {
        var meta = EXERCISE_REGISTRY[r.exercise];
        var tile = document.createElement('div');
        tile.className = 'kc-exercise-tile';
        tile.innerHTML =
          '<div class="kc-exercise-tile__icon kc-domain-bg--' + (meta ? meta.domain : 'processing-speed') + '">' +
            (meta ? meta.icon : '🧠') +
          '</div>' +
          '<div style="flex:1;">' +
            '<div class="kc-exercise-tile__name">' + (meta ? meta.name : r.exercise) + '</div>' +
            '<div class="kc-exercise-tile__domain">Score: ' + Math.round(r.normalizedScore) + '</div>' +
          '</div>';
        exercisesEl.appendChild(tile);
      });
    }

    var pointsEl = document.getElementById('results-points');
    if (pointsEl) pointsEl.textContent = '+' + engineState.sessionPoints + ' Fuel Points';

    // Update streak display
    if (window.KCGamification) {
      var streak = window.KCGamification.getStreak();
      var streakEl = document.getElementById('results-streak');
      if (streakEl) streakEl.textContent = streak;
    }

    // Single action prompt (Section 5.5.1: priority hierarchy)
    var actionEl = document.getElementById('results-action');
    if (actionEl) {
      actionEl.innerHTML = '<p class="kc-caption" style="font-size: 15px;">See you tomorrow.</p>';
    }
  }

  // ===== DASHBOARD RENDERING =====
  function renderDashboard(brainData, userState) {
    var scoreEl = document.getElementById('dash-brain-score');
    if (scoreEl) scoreEl.textContent = brainData.score || '—';

    var streakEl = document.getElementById('dash-streak-count');
    if (streakEl) streakEl.textContent = userState.streak || 0;

    // Partial domain note
    var partialNote = document.getElementById('dash-partial-note');
    var domainCountEl = document.getElementById('dash-domain-count');
    if (partialNote && brainData.domainCount < 6 && brainData.domainCount > 0) {
      partialNote.classList.remove('kc-hidden');
      if (domainCountEl) domainCountEl.textContent = brainData.domainCount;
    } else if (partialNote) {
      partialNote.classList.add('kc-hidden');
    }

    // Render exercise tiles
    var exercisesEl = document.getElementById('dash-exercises');
    if (exercisesEl) {
      exercisesEl.innerHTML = '';
      engineState.sessionExercises.forEach(function(key) {
        var meta = EXERCISE_REGISTRY[key];
        var tile = document.createElement('div');
        tile.className = 'kc-exercise-tile';
        tile.innerHTML =
          '<div class="kc-exercise-tile__icon kc-domain-bg--' + (meta ? meta.domain : 'processing-speed') + '">' +
            (meta ? meta.icon : '🧠') +
          '</div>' +
          '<div>' +
            '<div class="kc-exercise-tile__name">' + (meta ? meta.name : key) + '</div>' +
            '<div class="kc-exercise-tile__domain">' + (meta ? meta.domain.replace(/-/g, ' ') : '') + '</div>' +
          '</div>';
        exercisesEl.appendChild(tile);
      });
    }

    // Update topbar
    var topbarStreak = document.getElementById('kc-topbar-streak');
    if (topbarStreak) topbarStreak.textContent = userState.streak || 0;
    var topbarPoints = document.getElementById('kc-topbar-points');
    if (topbarPoints) topbarPoints.textContent = (userState.totalPoints || 0) + ' FP';
  }

  // ===== INITIALIZATION =====
  function init() {
    detectInputDevice();

    // Check user state from IndexedDB
    dbGet('state', 'user', function(userState) {
      userState = userState || { key: 'user', sessionDay: 0, streak: 0, totalPoints: 0, level: 1, identityState: 'anonymous' };

      dbGetAll('scores', function(allScores) {
        // Determine which screen to show
        if (allScores.length === 0) {
          // First visit: show arrival screen
          showScreen('arrival');
          engineState.isFirstVisit = true;
        } else {
          // Check for return after absence (Section 11.8)
          var lastSession = null;
          allScores.forEach(function(s) {
            var d = new Date(s.createdAt).getTime();
            if (!lastSession || d > lastSession) lastSession = d;
          });
          var daysSinceLastSession = lastSession ? (Date.now() - lastSession) / 86400000 : 999;

          if (daysSinceLastSession > 7) {
            // Return after absence
            computeBrainScore(allScores, function(brainData) {
              var returnScoreEl = document.getElementById('return-brain-score');
              if (returnScoreEl) returnScoreEl.textContent = brainData.score;
              showScreen('return');
            });
          } else {
            // Normal: show dashboard
            engineState.isFirstVisit = false;
            userState.sessionDay = (userState.sessionDay || 0) + 1;

            selectExercises(userState, allScores, function(exercises) {
              engineState.sessionExercises = exercises;
              computeBrainScore(allScores, function(brainData) {
                renderDashboard(brainData, userState);
                showScreen('dashboard');
              });
            });
          }
        }
      });
    });

    // ===== EVENT LISTENERS =====

    // Arrival: Start Training
    var startTrainingBtn = document.getElementById('btn-start-training');
    if (startTrainingBtn) {
      startTrainingBtn.addEventListener('click', function() {
        // First visit: go straight to baseline (Day 1)
        engineState.sessionExercises = ONRAMP_SESSIONS[1];
        engineState.sessionDay = 1;
        dbPut('state', { key: 'user', sessionDay: 1, streak: 0, totalPoints: 0, level: 1, identityState: 'anonymous' });
        startSession();
      });
    }

    // Dashboard: Start Session
    var startSessionBtn = document.getElementById('btn-start-session');
    if (startSessionBtn) {
      startSessionBtn.addEventListener('click', function() {
        startSession();
      });
    }

    // Results: Done
    var resultsDoneBtn = document.getElementById('btn-results-done');
    if (resultsDoneBtn) {
      resultsDoneBtn.addEventListener('click', function() {
        // Check if first session + anonymous → email gate
        dbGet('state', 'user', function(userState) {
          userState = userState || {};
          if (userState.identityState === 'anonymous' && engineState.isFirstVisit) {
            showScreen('email-gate');
          } else {
            // Reload dashboard
            dbGetAll('scores', function(allScores) {
              selectExercises(userState, allScores, function(exercises) {
                engineState.sessionExercises = exercises;
                computeBrainScore(allScores, function(brainData) {
                  renderDashboard(brainData, userState);
                  showScreen('dashboard');
                });
              });
            });
          }
        });
      });
    }

    // Email gate
    var gateEmailInput = document.getElementById('gate-email');
    var gateSaveBtn = document.getElementById('btn-gate-save');
    var gateSkipBtn = document.getElementById('btn-gate-skip');

    if (gateEmailInput && gateSaveBtn) {
      gateEmailInput.addEventListener('input', function() {
        var valid = gateEmailInput.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        gateSaveBtn.disabled = !valid;
      });

      gateSaveBtn.addEventListener('click', function() {
        var email = gateEmailInput.value.trim();
        if (window.KCIdentity) {
          window.KCIdentity.captureEmail(email);
        }
        goToDashboard();
      });
    }

    if (gateSkipBtn) {
      gateSkipBtn.addEventListener('click', function() {
        goToDashboard();
      });
    }

    // Return: pick up where you left off
    var returnStartBtn = document.getElementById('btn-return-start');
    if (returnStartBtn) {
      returnStartBtn.addEventListener('click', function() {
        dbGet('state', 'user', function(userState) {
          userState = userState || { key: 'user', sessionDay: 8, streak: 0, totalPoints: 0, level: 1 };
          dbGetAll('scores', function(allScores) {
            selectExercises(userState, allScores, function(exercises) {
              engineState.sessionExercises = exercises;
              startSession();
            });
          });
        });
      });
    }
  }

  function goToDashboard() {
    dbGet('state', 'user', function(userState) {
      userState = userState || { key: 'user', sessionDay: 1, streak: 0, totalPoints: 0, level: 1 };
      dbGetAll('scores', function(allScores) {
        selectExercises(userState, allScores, function(exercises) {
          engineState.sessionExercises = exercises;
          computeBrainScore(allScores, function(brainData) {
            renderDashboard(brainData, userState);
            showScreen('dashboard');
          });
        });
      });
    });
  }

  // ===== PUBLIC API =====
  window.KCEngine = {
    init: init,
    showScreen: showScreen,
    normalizeRT: normalizeRT,
    normalizeScore: normalizeScore,
    computeBrainScore: computeBrainScore,
    getExerciseDifficulty: getExerciseDifficulty,
    updateDifficulty: updateDifficulty,
    EXERCISE_REGISTRY: EXERCISE_REGISTRY,
    DOMAINS: DOMAINS,
    state: engineState,
    dbPut: dbPut,
    dbGet: dbGet,
    dbGetAll: dbGetAll
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
