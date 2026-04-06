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

  // First-week onramp post-session messages (Section 5.4.2)
  var ONRAMP_MESSAGES = {
    1: { headline: 'Your first Brain Score is in.', detail: 'This is your baseline. Come back tomorrow to start improving.' },
    2: { headline: 'You just trained 3 new cognitive skills.', detail: 'Variety is how your brain grows. Each exercise targets a different domain.' },
    3: { headline: 'Your brain is adapting.', detail: 'The exercises adjust to your level. The better you get, the harder they get.' },
    4: { headline: 'Your daily workout is now personalized.', detail: 'The algorithm picks exercises based on what you need most.' },
    5: { headline: 'All 6 cognitive domains tested.', detail: 'Your full Brain Score is live. This is the real you.' },
    6: { headline: 'Six days strong.', detail: 'Tomorrow is your weekly recap — see how far you\'ve come.' },
    7: { headline: 'Week 1 complete.', detail: 'You\'ve built a foundation. Now the real training begins.' }
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
  var allScreens = ['arrival', 'dashboard', 'exercise', 'instructions', 'countdown', 'results', 'email-gate', 'return'];

  // Exercise instructions — shown before each exercise so users know what to do
  var EXERCISE_INSTRUCTIONS = {
    stroop: {
      text: 'You\'ll see color words displayed in different ink colors. Your job is to name the <strong>ink color</strong>, not read the word. It sounds simple — your brain will disagree.',
      steps: ['A word appears in a colored ink', 'Ignore what the word says', 'Tap the button matching the <strong>ink color</strong>'],
      duration: 'About 60 seconds'
    },
    dsst: {
      text: 'Match symbols to digits as fast as you can. A reference key shows which symbol goes with which number. When a number appears, tap the correct symbol.',
      steps: ['Study the symbol-digit key at the top', 'A number appears in the center', 'Tap the matching symbol as fast as you can'],
      duration: 'About 90 seconds'
    },
    flanker: {
      text: 'A row of arrows appears. Your job is to identify which direction the <strong>center arrow</strong> is pointing — left or right. The surrounding arrows will try to distract you.',
      steps: ['A row of arrows appears (e.g. ←← → ←←)', 'Focus on the CENTER arrow only', 'Tap Left or Right to match it'],
      duration: 'About 60 seconds'
    },
    nback: {
      text: 'Letters appear one at a time. You need to remember if the current letter matches the one from a few steps ago. This trains your working memory.',
      steps: ['A letter appears briefly', 'Decide: does it match the letter from N steps back?', 'Tap "Match" or "No Match"'],
      duration: 'About 60 seconds'
    },
    'task-switching': {
      text: 'You\'ll see colored shapes. The rule switches between identifying the <strong>shape</strong> and identifying the <strong>color</strong>. Watch the instruction banner — it tells you which rule is active.',
      steps: ['A colored shape appears', 'Check the rule: SHAPE or COLOR?', 'Tap the correct answer for the current rule'],
      duration: 'About 60 seconds'
    },
    'speed-match': {
      text: 'Cards appear one at a time. Does the current card match the previous one? You need to be fast AND accurate.',
      steps: ['A card with a symbol appears', 'Compare it to the PREVIOUS card', 'Tap Yes (match) or No (different)'],
      duration: 'About 60 seconds'
    },
    'visual-search': {
      text: 'Find the target shape hidden among distractors. The target is shown at the top — tap it as fast as you can when you spot it in the field.',
      steps: ['The target shape is shown at the top', 'Scan the field of shapes below', 'Tap the target when you find it'],
      duration: 'About 60 seconds'
    },
    'pattern-matrix': {
      text: 'A grid of shapes follows a pattern, but one piece is missing. Figure out the pattern and pick the piece that completes it.',
      steps: ['Study the pattern in the grid', 'Find the missing piece (marked with ?)', 'Tap the correct piece from the options below'],
      duration: 'About 90 seconds'
    },
    'sequence-memory': {
      text: 'Watch a sequence of colored pads light up, then repeat the sequence from memory. It gets longer each round.',
      steps: ['Watch the pads light up in order', 'Wait for your turn', 'Tap the pads in the same order'],
      duration: 'About 90 seconds'
    },
    'go-no-go': {
      text: 'Circles appear on screen. Tap when you see <strong>green</strong> (Go). Do NOT tap when you see <strong>red</strong> (No-Go). Speed matters, but so does restraint.',
      steps: ['A colored circle appears', 'GREEN = tap it (or press Space)', 'RED = don\'t tap, just wait'],
      duration: 'About 60 seconds'
    },
    'mental-rotation': {
      text: 'Two shapes appear side by side. One may be rotated. Are they the <strong>same shape</strong>, or is one a <strong>mirror image</strong>?',
      steps: ['Two shapes appear, one rotated', 'Mentally rotate them to compare', 'Tap "Same" or "Mirror"'],
      duration: 'About 90 seconds'
    },
    'word-sprint': {
      text: 'You\'re given a set of letters. Make as many words as you can before time runs out. Longer words score more points.',
      steps: ['Study the available letters', 'Type a word using only those letters', 'Press Enter or tap Go to submit'],
      duration: 'About 60 seconds'
    },
    'number-sense': {
      text: 'Solve arithmetic problems as fast as you can. Each problem has a time limit — pick the correct answer from four options.',
      steps: ['A math problem appears', 'Calculate the answer quickly', 'Tap the correct number'],
      duration: 'About 90 seconds'
    },
    'dual-focus': {
      text: 'Track moving objects on screen while answering questions about them. This tests your ability to divide your attention.',
      steps: ['Watch the objects bounce around', 'A question appears about an object', 'Answer quickly — the objects keep moving'],
      duration: 'About 90 seconds'
    },
    'trail-connect': {
      text: 'Connect numbered and lettered dots in alternating order: 1 → A → 2 → B → 3 → C and so on. Go as fast as you can.',
      steps: ['Find the next item in the sequence', 'Tap it (numbers and letters alternate)', 'Go fast — errors cost time but don\'t end the game'],
      duration: 'About 60–90 seconds'
    }
  };

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
    _exerciseCompleting = false;
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

    // Show instructions → user taps Ready → countdown → exercise
    showInstructions(exerciseKey, function() {
      showCountdown(function() {
        showScreen('exercise');
        launchExercise(exerciseKey);
      });
    });
  }

  function showInstructions(exerciseKey, callback) {
    var meta = EXERCISE_REGISTRY[exerciseKey];
    var instructions = EXERCISE_INSTRUCTIONS[exerciseKey];

    if (!instructions) {
      // No instructions for this exercise — skip straight to countdown
      callback();
      return;
    }

    showScreen('instructions');

    var iconEl = document.getElementById('instructions-icon');
    var nameEl = document.getElementById('instructions-name');
    var domainEl = document.getElementById('instructions-domain');
    var textEl = document.getElementById('instructions-text');
    var howEl = document.getElementById('instructions-how');
    var durationEl = document.getElementById('instructions-duration');

    if (iconEl) iconEl.textContent = meta ? meta.icon : '🧠';
    if (nameEl) nameEl.textContent = meta ? meta.name : exerciseKey;
    if (domainEl) domainEl.textContent = meta ? meta.domain.replace(/-/g, ' ') : '';
    if (textEl) textEl.innerHTML = instructions.text;
    if (durationEl) durationEl.textContent = instructions.duration;

    if (howEl && instructions.steps) {
      howEl.innerHTML =
        '<div style="background: var(--kc-bg-panel); border-radius: var(--kc-radius-lg); padding: var(--kc-space-md);">' +
          instructions.steps.map(function(step, i) {
            return '<div style="display: flex; align-items: flex-start; gap: 12px;' + (i > 0 ? ' margin-top: 12px;' : '') + '">' +
              '<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--kc-blackberry); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0;">' + (i + 1) + '</div>' +
              '<div style="font-size: 15px; color: var(--kc-text-secondary); line-height: 1.5;">' + step + '</div>' +
            '</div>';
          }).join('') +
        '</div>';
    }

    // Wire Ready button (remove old listener, add new one)
    var readyBtn = document.getElementById('btn-ready');
    if (readyBtn) {
      var newBtn = readyBtn.cloneNode(true);
      readyBtn.parentNode.replaceChild(newBtn, readyBtn);
      newBtn.addEventListener('click', function() {
        callback();
      });
    }
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
    _exerciseCompleting = false; // Reset guard for new exercise

    // Ensure header is correct (redundant with runNextExercise, but guards against race)
    var meta = EXERCISE_REGISTRY[exerciseKey];
    var nameEl = document.getElementById('exercise-name');
    var progressEl = document.getElementById('exercise-progress');
    if (nameEl) nameEl.textContent = meta ? meta.name : exerciseKey;
    if (progressEl) progressEl.textContent = (engineState.currentExerciseIndex + 1) + ' / ' + engineState.sessionExercises.length;

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

  var _exerciseCompleting = false;

  function handleExerciseComplete(exerciseKey, result) {
    // Guard against double-completion (debug skip + game timer both firing)
    if (_exerciseCompleting) return;
    _exerciseCompleting = true;

    var normalized = normalizeScore(exerciseKey, result);
    var points = 25; // Per exercise (Section 6.1)

    // Personal best detection
    var isPB = false;
    dbGetAll('scores', function(allScores) {
      var prevBest = 0;
      allScores.forEach(function(s) {
        if (s.exercise === exerciseKey && (s.normalizedScore || 0) > prevBest) {
          prevBest = s.normalizedScore;
        }
      });
      if (normalized > prevBest && allScores.length > 0) {
        isPB = true;
        points += 50; // Personal best bonus (Section 6.1)
        if (window.KCKlaviyo) {
          window.KCKlaviyo.trackEvent('Brain Score Improved', {
            exercise: exerciseKey, old_score: prevBest, new_score: normalized,
            improvement_pct: prevBest > 0 ? Math.round(((normalized - prevBest) / prevBest) * 100) : 100
          });
        }
        if (window.KCLoyaltyLion) {
          window.KCLoyaltyLion.trackActivity('brain_personal_best', 50);
        }
      }

      var scoreRecord = {
        exercise: exerciseKey,
        rawScore: result.score || 0,
        accuracy: result.accuracy || 0,
        avgRT: result.avgRT || 0,
        normalizedScore: normalized,
        difficulty: result.difficulty || 1,
        inputDevice: engineState.inputDevice,
        completed: result.completed !== false,
        isPB: isPB,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      // Save to IndexedDB immediately (Section 11.7.1)
      dbPut('scores', scoreRecord);

      engineState.sessionResults.push({
        exercise: exerciseKey,
        normalizedScore: normalized,
        rawResult: result,
        points: points,
        isPB: isPB
      });
      engineState.sessionPoints += points;

      // Update difficulty based on recent trials (between exercises = between-session boundary)
      if (result.trialAccuracies && result.trialAccuracies.length >= 10) {
        updateDifficulty(exerciseKey, result.trialAccuracies, false);
      }

      // Fire per-exercise LoyaltyLion event
      if (window.KCLoyaltyLion) {
        window.KCLoyaltyLion.trackActivity('brain_exercise_complete', 25);
      }

      // Move to next exercise (300ms fade per Section 3.8)
      engineState.currentExerciseIndex++;
      setTimeout(function() {
        runNextExercise();
      }, 300);
    });
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

    // Get previous Brain Score for change indicator
    dbGet('state', 'prevBrainScore', function(prevData) {
      var prevScore = prevData ? prevData.score : null;

      // Compute new Brain Score
      dbGetAll('scores', function(allScores) {
        computeBrainScore(allScores, function(brainData) {
          // Save current score for next comparison
          dbPut('state', { key: 'prevBrainScore', score: brainData.score });

          // Fire gamification events and get celebration data
          var celebrations = null;
          if (window.KCGamification) {
            celebrations = window.KCGamification.onSessionComplete(engineState.sessionPoints, engineState.sessionResults);
          }

          // Check if this is baseline completion (first session)
          var isBaseline = engineState.isFirstVisit && engineState.sessionDay === 1;
          if (isBaseline) {
            if (window.KCKlaviyo) {
              window.KCKlaviyo.trackBaselineComplete(brainData.score);
            }
            if (window.KCLoyaltyLion) {
              window.KCLoyaltyLion.trackActivity('brain_baseline_complete', 200);
            }
            engineState.sessionPoints += 200; // Baseline bonus
          }

          // Update persistent user state
          dbGet('state', 'user', function(userState) {
            userState = userState || { key: 'user' };
            userState.totalPoints = (userState.totalPoints || 0) + engineState.sessionPoints;
            userState.level = window.KCGamification ? window.KCGamification.getLevel() : 1;
            userState.streak = window.KCGamification ? window.KCGamification.getStreak() : 0;
            userState.lastSessionDate = new Date().toISOString();
            userState.sessionDay = (userState.sessionDay || 0) + 1;
            dbPut('state', userState);
          });

          showResults(brainData, prevScore, celebrations);

          // Fire Klaviyo + LoyaltyLion session events
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

          // Fire celebration events
          if (celebrations) {
            if (celebrations.leveledUp && window.KCKlaviyo) {
              window.KCKlaviyo.trackLevelUp(celebrations.newLevel, celebrations.levelTitle);
            }
            if (celebrations.streakMilestone && window.KCKlaviyo) {
              window.KCKlaviyo.trackStreakMilestone(celebrations.streakMilestone);
            }
          }

          // Update weekly challenge progress
          if (window.KCChallenges) {
            var challengeResult = window.KCChallenges.updateProgress({
              results: engineState.sessionResults,
              brainScore: brainData.score
            });
            if (challengeResult && challengeResult.completed) {
              // Add challenge completion to celebrations
              if (!celebrations) celebrations = {};
              celebrations.challengeCompleted = challengeResult;
            }
          }

          // Check for new badges
          if (window.KCBadges) {
            var newBadges = window.KCBadges.onSessionComplete({
              results: engineState.sessionResults,
              brainScore: brainData.score
            });
            if (newBadges && newBadges.length > 0) {
              if (!celebrations) celebrations = {};
              celebrations.newBadges = newBadges;
            }
          }
        });
      });
    });
  }

  // ===== RESULTS SCREEN (Section 5.5) =====
  function showResults(brainData, prevScore, celebrations) {
    showScreen('results');

    // Score zone
    var scoreEl = document.getElementById('results-brain-score');
    if (scoreEl) {
      scoreEl.textContent = brainData.score;
      // Pulse in gold if any PB this session
      var hasPB = engineState.sessionResults.some(function(r) { return r.isPB; });
      if (hasPB) {
        scoreEl.style.color = 'var(--kc-pineapple)';
        setTimeout(function() { scoreEl.style.color = ''; }, 2000);
      }
    }

    // Score change indicator
    var changeEl = document.getElementById('results-score-change');
    if (changeEl && prevScore !== null && prevScore !== undefined) {
      var diff = brainData.score - prevScore;
      if (diff > 0) {
        changeEl.textContent = '+' + diff;
        changeEl.className = 'kc-score-change kc-mt-xs kc-score-change--up';
      } else if (diff < 0) {
        changeEl.textContent = '' + diff;
        changeEl.className = 'kc-score-change kc-mt-xs kc-score-change--down';
      } else {
        changeEl.textContent = '±0';
        changeEl.className = 'kc-score-change kc-mt-xs';
      }
    } else {
      if (changeEl) changeEl.textContent = '';
    }

    // Domain bars chart
    if (window.KCCharts) {
      window.KCCharts.renderDomainBars('results-domain-bars', brainData.domains || {});
    }

    // Celebration banner (Section 5.5.2: inline, not interstitial)
    var celebrationEl = document.getElementById('results-celebration');
    if (celebrationEl) {
      var hasCelebration = celebrations && (celebrations.leveledUp || celebrations.streakMilestone || celebrations.challengeCompleted || celebrations.newBadges);
      if (hasCelebration) {
        celebrationEl.classList.remove('kc-hidden');
        var html = '';
        if (celebrations.leveledUp) {
          html += '<div class="kc-celebration__title">Level ' + celebrations.newLevel + ': ' + celebrations.levelTitle + '</div>';
          var unlocked = [];
          Object.keys(EXERCISE_REGISTRY).forEach(function(key) {
            if (EXERCISE_REGISTRY[key].unlockLevel === celebrations.newLevel) {
              unlocked.push(EXERCISE_REGISTRY[key].name);
            }
          });
          if (unlocked.length > 0) {
            html += '<div class="kc-celebration__detail">' + unlocked.join(' and ') + ' unlocked</div>';
          }
        }
        if (celebrations.streakMilestone) {
          html += '<div class="kc-celebration__title">🔥 ' + celebrations.streakMilestone + '-day streak!</div>';
        }
        if (celebrations.challengeCompleted) {
          html += '<div class="kc-celebration__title">🏆 Weekly Challenge Complete!</div>';
          html += '<div class="kc-celebration__detail">' + celebrations.challengeCompleted.name + ' — +200 Fuel Points</div>';
        }
        if (celebrations.newBadges) {
          celebrations.newBadges.forEach(function(badge) {
            html += '<div class="kc-celebration__title">' + badge.icon + ' Badge Unlocked: ' + badge.name + '</div>';
            html += '<div class="kc-celebration__detail">' + badge.description + '</div>';
          });
        }
        celebrationEl.innerHTML = html;

        // Confetti for streak milestones and level-ups (Section 3.8)
        if (celebrations.streakMilestone || celebrations.leveledUp) {
          setTimeout(confettiBurst, 300);
        }
      } else {
        celebrationEl.classList.add('kc-hidden');
      }
    }

    // Exercise summary tiles
    var exercisesEl = document.getElementById('results-exercises');
    if (exercisesEl) {
      exercisesEl.innerHTML = '';
      engineState.sessionResults.forEach(function(r) {
        var meta = EXERCISE_REGISTRY[r.exercise];
        var tile = document.createElement('div');
        tile.className = 'kc-exercise-tile';
        var pbBadge = r.isPB ? ' <span style="color: var(--kc-pineapple); font-size: 12px; font-weight: 700;">PB!</span>' : '';
        tile.innerHTML =
          '<div class="kc-exercise-tile__icon kc-domain-bg--' + (meta ? meta.domain : 'processing-speed') + '">' +
            (meta ? meta.icon : '🧠') +
          '</div>' +
          '<div style="flex:1;">' +
            '<div class="kc-exercise-tile__name">' + (meta ? meta.name : r.exercise) + pbBadge + '</div>' +
            '<div class="kc-exercise-tile__domain">Score: ' + Math.round(r.normalizedScore) + '</div>' +
          '</div>';
        exercisesEl.appendChild(tile);
      });
    }

    // Points
    var pointsEl = document.getElementById('results-points');
    if (pointsEl) pointsEl.textContent = '+' + engineState.sessionPoints + ' Fuel Points';

    // Streak
    var streak = window.KCGamification ? window.KCGamification.getStreak() : 0;
    var streakEl = document.getElementById('results-streak');
    if (streakEl) streakEl.textContent = streak;

    // Reward progress
    var totalPoints = window.KCGamification ? window.KCGamification.getTotalPoints() : 0;
    updateRewardProgress('results', totalPoints);

    // Single action prompt (Section 5.5.1: priority hierarchy)
    var actionEl = document.getElementById('results-action');
    if (actionEl) {
      // Priority 1: consumption log
      // Priority hierarchy (Section 5.5.1): one ask max
      var actionShown = false;

      // Priority 1: Consumption log
      if (!actionShown && window.KCConsumption && window.KCConsumption.shouldShowLog()) {
        actionEl.innerHTML =
          '<div class="kc-card" style="text-align: center; padding: var(--kc-space-md);">' +
            '<div class="kc-caption kc-mb-sm">How many Kenetik servings today?</div>' +
            '<div style="display: flex; gap: 12px; justify-content: center;">' +
              '<button class="kc-btn kc-btn--secondary" onclick="window.KCConsumption.logServings(1)" style="padding: 12px 24px;">1</button>' +
              '<button class="kc-btn kc-btn--secondary" onclick="window.KCConsumption.logServings(2)" style="padding: 12px 24px;">2</button>' +
              '<button class="kc-btn kc-btn--secondary" onclick="window.KCConsumption.logServings(3)" style="padding: 12px 24px;">3+</button>' +
              '<button class="kc-btn kc-btn--ghost" onclick="this.closest(\'.kc-card\').remove()" style="padding: 12px;">Skip</button>' +
            '</div>' +
          '</div>';
        actionShown = true;
      }

      // Priority 2: Restock prompt (if <5 days remaining)
      if (!actionShown && window.KCConsumption) {
        var daysRemaining = window.KCConsumption.getEstimatedDaysRemaining();
        if (daysRemaining !== null && daysRemaining < 5) {
          actionEl.innerHTML =
            '<div class="kc-card" style="text-align: center; padding: var(--kc-space-md);">' +
              '<div class="kc-caption kc-mb-sm">Running low?</div>' +
              '<a href="https://drinkkenetik.com/collections/all" target="_blank" class="kc-btn kc-btn--primary" style="padding: 12px 32px;">Restock</a>' +
            '</div>';
          actionShown = true;
        }
      }

      // Priority 3: Share prompt (if milestone hit)
      var hasMilestone = celebrations && (celebrations.leveledUp || celebrations.streakMilestone ||
        engineState.sessionResults.some(function(r) { return r.isPB; }));
      if (!actionShown && hasMilestone && window.KCShareCard) {
        actionEl.innerHTML =
          '<div class="kc-card" style="text-align: center; padding: var(--kc-space-md);">' +
            '<div class="kc-caption kc-mb-sm">Share your achievement</div>' +
            '<button class="kc-btn kc-btn--secondary" id="btn-share-card" style="padding: 12px 32px;">📤 Share Brain Score</button>' +
          '</div>';
        var shareBtn = document.getElementById('btn-share-card');
        if (shareBtn) {
          shareBtn.addEventListener('click', function() {
            dbGet('state', 'user', function(us) {
              window.KCShareCard.shareCard(brainData, us || {});
            });
          });
        }
        actionShown = true;
      }

      // Priority 4: Nothing — just clear
      if (!actionShown) {
        actionEl.innerHTML = '';
      }
    }

    // Onramp message for first week (Section 5.4.2)
    var onrampMsg = ONRAMP_MESSAGES[engineState.sessionDay];
    if (onrampMsg && actionEl) {
      var msgHTML = '<div style="text-align: center; margin-top: var(--kc-space-sm);">' +
        '<div style="font-size: 17px; font-weight: 700; color: var(--kc-blackberry); margin-bottom: 4px;">' + onrampMsg.headline + '</div>' +
        '<div class="kc-caption">' + onrampMsg.detail + '</div>' +
      '</div>';
      // Append after any action prompt, or show standalone
      actionEl.innerHTML = (actionEl.innerHTML || '') + msgHTML;
    }

    // Update "See you tomorrow" button text
    var doneBtn = document.getElementById('btn-results-done');
    if (doneBtn) {
      doneBtn.textContent = engineState.isFirstVisit ? 'Continue' : 'See you tomorrow';
    }
  }

  // ===== REWARD PROGRESS =====
  function updateRewardProgress(prefix, totalPoints) {
    var tiers = [
      { points: 1000, label: 'Free Shipping' },
      { points: 2500, label: '10% Off' },
      { points: 5000, label: 'Free Can' },
      { points: 7500, label: '15% Off' },
      { points: 10000, label: 'Free 3-Pack' }
    ];

    var nextTier = null;
    for (var i = 0; i < tiers.length; i++) {
      if (totalPoints < tiers[i].points) {
        nextTier = tiers[i];
        break;
      }
    }

    var labelEl = document.getElementById(prefix + '-reward-label');
    var barEl = document.getElementById(prefix + '-reward-progress');

    if (nextTier) {
      var remaining = nextTier.points - totalPoints;
      var pct = (totalPoints / nextTier.points) * 100;
      if (labelEl) labelEl.textContent = remaining + ' pts to ' + nextTier.label;
      if (barEl) barEl.style.width = Math.min(100, pct) + '%';
    } else {
      if (labelEl) labelEl.textContent = 'All rewards unlocked!';
      if (barEl) barEl.style.width = '100%';
    }
  }

  // ===== DASHBOARD RENDERING =====
  function renderDashboard(brainData, userState) {
    // Brain Score
    var scoreEl = document.getElementById('dash-brain-score');
    if (scoreEl) scoreEl.textContent = brainData.score || '—';

    // Score change from last session
    var changeEl = document.getElementById('dash-score-change');
    if (changeEl) {
      dbGet('state', 'prevBrainScore', function(prevData) {
        if (prevData && prevData.score !== undefined) {
          var diff = brainData.score - prevData.score;
          if (diff > 0) {
            changeEl.textContent = '+' + diff + ' from last session';
            changeEl.className = 'kc-score-change kc-mt-xs kc-score-change--up';
          } else if (diff < 0) {
            changeEl.textContent = '' + diff + ' from last session';
            changeEl.className = 'kc-score-change kc-mt-xs kc-score-change--down';
          } else {
            changeEl.textContent = '';
          }
        }
      });
    }

    // Streak (from gamification, not just userState)
    var streak = window.KCGamification ? window.KCGamification.getStreak() : (userState.streak || 0);
    var streakEl = document.getElementById('dash-streak-count');
    if (streakEl) streakEl.textContent = streak;

    // Partial domain note
    var partialNote = document.getElementById('dash-partial-note');
    var domainCountEl = document.getElementById('dash-domain-count');
    if (partialNote && brainData.domainCount < 6 && brainData.domainCount > 0) {
      partialNote.classList.remove('kc-hidden');
      if (domainCountEl) domainCountEl.textContent = brainData.domainCount;
    } else if (partialNote) {
      partialNote.classList.add('kc-hidden');
    }

    // Reward progress
    var totalPoints = window.KCGamification ? window.KCGamification.getTotalPoints() : (userState.totalPoints || 0);
    updateRewardProgress('dash', totalPoints);

    // Render exercise preview tiles
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
            '<div class="kc-exercise-tile__domain" style="text-transform: capitalize;">' + (meta ? meta.domain.replace(/-/g, ' ') : '') + '</div>' +
          '</div>';
        exercisesEl.appendChild(tile);
      });
    }

    // Update persistent topbar
    var topbarStreak = document.getElementById('kc-topbar-streak');
    if (topbarStreak) topbarStreak.textContent = streak;
    var topbarPoints = document.getElementById('kc-topbar-points');
    if (topbarPoints) topbarPoints.textContent = totalPoints + ' FP';

    // === SECONDARY SECTION ===

    // Radar chart
    if (window.KCCharts) {
      window.KCCharts.renderRadarChart('dash-radar-chart', brainData.domains || {}, 220);
    }

    // Weekly Challenge
    var challengeEl = document.getElementById('dash-challenge');
    if (challengeEl && window.KCChallenges) {
      challengeEl.innerHTML = window.KCChallenges.renderChallengeCard();
    }

    // Badges
    var badgesEl = document.getElementById('dash-badges');
    if (badgesEl && window.KCBadges) {
      badgesEl.innerHTML = window.KCBadges.renderBadgeGrid();
    }

    // Leaderboard preview
    var leaderboardEl = document.getElementById('dash-leaderboard');
    if (leaderboardEl && window.KCLeaderboard) {
      window.KCLeaderboard.fetchLeaderboard('global', function(entries) {
        leaderboardEl.innerHTML = window.KCLeaderboard.renderLeaderboard(entries);
      });
    }
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
        engineState.sessionExercises = ONRAMP_SESSIONS[1].slice();
        engineState.sessionDay = 1;
        engineState.isFirstVisit = true;
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
        setTimeout(goToDashboard, 300);
      });
    }

    if (gateSkipBtn) {
      gateSkipBtn.addEventListener('click', function() {
        // Small delay to let finishSession async writes complete
        setTimeout(goToDashboard, 300);
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

  // ===== CONFETTI (Section 3.8: brand colors only, subtle burst) =====
  function confettiBurst() {
    var colors = ['#E03D1A', '#269DD2', '#D01483', '#F06925', '#FBB11B', '#13286D'];
    var container = document.createElement('div');
    container.className = 'kc-confetti-container';
    document.body.appendChild(container);

    for (var i = 0; i < 30; i++) {
      var piece = document.createElement('div');
      piece.className = 'kc-confetti-piece';
      piece.style.left = (20 + Math.random() * 60) + '%';
      piece.style.top = (10 + Math.random() * 30) + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      piece.style.animationDuration = (1 + Math.random() * 1) + 's';
      container.appendChild(piece);
    }

    setTimeout(function() { container.remove(); }, 2500);
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
    dbGetAll: dbGetAll,
    goToDashboard: goToDashboard,
    // Test helper: skip current exercise with a fake result
    _debugSkipExercise: function() {
      var idx = engineState.currentExerciseIndex;
      var key = engineState.sessionExercises[idx];
      if (!key) return 'no exercise at index ' + idx;
      // Cancel any active countdown and go straight to complete
      handleExerciseComplete(key, {
        score: 70 + Math.floor(Math.random() * 20),
        accuracy: 70 + Math.floor(Math.random() * 25),
        avgRT: 400 + Math.floor(Math.random() * 300),
        totalTrials: 20, correctTrials: 15, difficulty: 1,
        trialAccuracies: Array(20).fill(1).map(function() { return Math.random() > 0.25 ? 1 : 0; }),
        completed: true
      });
      return 'skipped ' + key;
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
