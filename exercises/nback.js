/* ==========================================================================
   Kenetik Circuit — N-Back
   Ported from Brandon's brain-training with adaptive difficulty
   Domain: Working memory
   Score type: Accuracy
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { nLevel: 1, totalTrials: 20, matchRatio: 0.3, stimDuration: 2500 },
    2: { nLevel: 2, totalTrials: 22, matchRatio: 0.3, stimDuration: 2500 },
    3: { nLevel: 2, totalTrials: 24, matchRatio: 0.35, stimDuration: 2000 },
    4: { nLevel: 3, totalTrials: 26, matchRatio: 0.35, stimDuration: 2000 },
    5: { nLevel: 3, totalTrials: 28, matchRatio: 0.4, stimDuration: 1800 }
  };

  var ISI_DURATION = 300; // Inter-stimulus interval: brief blank between trials

  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];

  var state, config, container, onComplete, trialTimer;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      sequence: generateSequence(),
      results: [],
      currentTrial: 0,
      responded: false,
      betweenTrials: false,
      practiceMode: true,
      practiceIndex: 0,
      practiceSequence: []
    };

    // Generate practice: for 1-back, show A, B, B (match!), C
    // For 2-back: A, B, A (match!), C, B (match!)
    if (config.nLevel === 1) {
      state.practiceSequence = [
        { letter: 'A', isMatch: false, explain: 'First letter — just remember it.' },
        { letter: 'B', isMatch: false, explain: 'B ≠ A — not a match.' },
        { letter: 'B', isMatch: true, explain: 'B = B — that\'s a match! (same as 1 step ago)' },
        { letter: 'D', isMatch: false, explain: 'D ≠ B — not a match.' }
      ];
    } else {
      state.practiceSequence = [
        { letter: 'A', isMatch: false, explain: 'First letter — just remember it.' },
        { letter: 'B', isMatch: false, explain: 'Second letter — remember both.' },
        { letter: 'A', isMatch: true, explain: 'A = A — match! (same as ' + config.nLevel + ' steps ago)' },
        { letter: 'C', isMatch: false, explain: 'C ≠ B — not a match.' },
        { letter: 'A', isMatch: true, explain: 'A = A — match! (same as ' + config.nLevel + ' steps ago)' }
      ];
    }

    render();
    presentPractice();
  }

  function generateSequence() {
    var seq = [];
    var matchCount = Math.round(config.totalTrials * config.matchRatio);
    var matchIndices = {};

    // Pick random positions for matches (must be >= nLevel)
    while (Object.keys(matchIndices).length < matchCount) {
      var idx = config.nLevel + Math.floor(Math.random() * (config.totalTrials - config.nLevel));
      matchIndices[idx] = true;
    }

    for (var i = 0; i < config.totalTrials; i++) {
      if (i < config.nLevel) {
        seq.push({ letter: LETTERS[Math.floor(Math.random() * LETTERS.length)], isMatch: false });
      } else if (matchIndices[i]) {
        seq.push({ letter: seq[i - config.nLevel].letter, isMatch: true });
      } else {
        var letter;
        do {
          letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        } while (letter === seq[i - config.nLevel].letter);
        seq.push({ letter: letter, isMatch: false });
      }
    }

    return seq;
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption">' + config.nLevel + '-BACK</span>' +
          '<span class="kc-caption" id="nback-progress">0 / ' + config.totalTrials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 32px;">' +
          '<div class="kc-progress-bar__fill" id="nback-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 15px; color: var(--kc-text-muted); margin-bottom: 24px;">' +
          'Does this letter match the one from <strong>' + config.nLevel + ' step' + (config.nLevel > 1 ? 's' : '') + ' ago</strong>?' +
        '</div>' +
        '<div id="nback-stimulus" style="min-height: 160px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px;">' +
          '<span style="font-family: var(--kc-font-heading); font-size: 80px; font-weight: 700; color: var(--kc-blackberry);">—</span>' +
        '</div>' +
        '<div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 16px;">' +
          '<button class="kc-response-btn" id="nback-match" style="padding: 16px 40px; background: var(--kc-berry); color: white; border-color: var(--kc-berry);">Match</button>' +
          '<button class="kc-response-btn" id="nback-no-match" style="padding: 16px 40px;">No Match</button>' +
        '</div>' +
        '<div id="nback-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
        '<div class="kc-caption" style="margin-top: 8px;">Keys: <kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">M</kbd> match ' +
          '<kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">N</kbd> no match</div>' +
      '</div>';

    document.getElementById('nback-match').addEventListener('click', function() { handleResponse(true); });
    document.getElementById('nback-no-match').addEventListener('click', function() { handleResponse(false); });
    document.addEventListener('keydown', keyHandler);
  }

  function keyHandler(e) {
    if (state.responded || state.betweenTrials) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); handleResponse(true); }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleResponse(false); }
  }

  // Show a brief blank gap between trials so repeated letters are visually distinct
  function showISI(callback) {
    state.betweenTrials = true;
    var stimEl = document.getElementById('nback-stimulus');
    if (stimEl) {
      stimEl.innerHTML = '<span style="font-family: var(--kc-font-heading); font-size: 48px; color: var(--kc-text-light);">+</span>';
    }
    setTimeout(function() {
      state.betweenTrials = false;
      callback();
    }, ISI_DURATION);
  }

  // ===== PRACTICE MODE =====
  function presentPractice() {
    if (state.practiceIndex >= state.practiceSequence.length) {
      // Practice complete — transition to real test
      var stimEl = document.getElementById('nback-stimulus');
      var progressEl = document.getElementById('nback-progress');
      var feedbackEl = document.getElementById('nback-feedback');
      if (progressEl) progressEl.textContent = '';
      if (feedbackEl) feedbackEl.textContent = '';
      if (stimEl) {
        stimEl.innerHTML = '<div style="text-align: center;">' +
          '<div style="font-size: 18px; font-weight: 700; color: var(--kc-blackberry); margin-bottom: 8px;">Nice! You\'ve got it.</div>' +
          '<div style="font-size: 15px; color: var(--kc-text-secondary);">Now the real test begins.</div>' +
        '</div>';
      }
      state.practiceMode = false;
      setTimeout(function() { showISI(presentTrial); }, 1800);
      return;
    }

    state.responded = false;
    var trial = state.practiceSequence[state.practiceIndex];
    var stimEl = document.getElementById('nback-stimulus');
    var progressEl = document.getElementById('nback-progress');
    var feedbackEl = document.getElementById('nback-feedback');

    if (progressEl) progressEl.textContent = 'Practice ' + (state.practiceIndex + 1) + ' of ' + state.practiceSequence.length;
    if (feedbackEl) feedbackEl.textContent = '';

    // For first N trials (before matches are possible), auto-advance with explanation
    if (state.practiceIndex < config.nLevel) {
      if (stimEl) {
        stimEl.innerHTML = '<span style="font-family: var(--kc-font-heading); font-size: 80px; font-weight: 700; color: var(--kc-blackberry);">' + trial.letter + '</span>';
      }
      if (feedbackEl) {
        feedbackEl.innerHTML = '<span style="color: var(--kc-text-secondary);">' + trial.explain + '</span>';
      }
      state.practiceIndex++;
      setTimeout(function() {
        showISI(presentPractice);
      }, 2200);
      return;
    }

    if (stimEl) {
      stimEl.innerHTML = '<span style="font-family: var(--kc-font-heading); font-size: 80px; font-weight: 700; color: var(--kc-blackberry);">' + trial.letter + '</span>';
    }
  }

  function handlePracticeResponse(saidMatch) {
    var trial = state.practiceSequence[state.practiceIndex];
    var correct = saidMatch === trial.isMatch;
    var feedbackEl = document.getElementById('nback-feedback');

    if (feedbackEl) {
      var prefix = correct ? '<span style="color:var(--kc-success);">✓ Correct!</span> ' : '<span style="color:var(--kc-error);">✗ Not quite.</span> ';
      feedbackEl.innerHTML = prefix + '<span style="color: var(--kc-text-secondary);">' + trial.explain + '</span>';
    }

    state.practiceIndex++;
    setTimeout(function() {
      showISI(presentPractice);
    }, 2200);
  }

  function presentTrial() {
    if (state.currentTrial >= state.sequence.length) { finishGame(); return; }

    state.responded = false;
    var trial = state.sequence[state.currentTrial];

    var stimEl = document.getElementById('nback-stimulus');
    var progressEl = document.getElementById('nback-progress');
    var barEl = document.getElementById('nback-bar');
    var feedbackEl = document.getElementById('nback-feedback');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.totalTrials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.totalTrials) * 100) + '%';
    if (feedbackEl) feedbackEl.textContent = '';
    if (stimEl) {
      stimEl.innerHTML = '<span style="font-family: var(--kc-font-heading); font-size: 80px; font-weight: 700; color: var(--kc-blackberry);">' + trial.letter + '</span>';
    }

    // Auto-advance if no response within stimDuration
    trialTimer = setTimeout(function() {
      if (!state.responded) {
        // No response = miss
        state.results.push({
          trial: state.currentTrial,
          letter: trial.letter,
          isMatch: trial.isMatch,
          responded: false,
          correct: !trial.isMatch // Not responding is correct only for non-matches
        });
        state.currentTrial++;
        showISI(presentTrial);
      }
    }, config.stimDuration);
  }

  function handleResponse(saidMatch) {
    if (state.responded || state.betweenTrials) return;
    state.responded = true;

    // Route to practice handler if in practice mode
    if (state.practiceMode) {
      handlePracticeResponse(saidMatch);
      return;
    }

    clearTimeout(trialTimer);
    var trial = state.sequence[state.currentTrial];
    var correct = saidMatch === trial.isMatch;

    state.results.push({
      trial: state.currentTrial,
      letter: trial.letter,
      isMatch: trial.isMatch,
      response: saidMatch,
      responded: true,
      correct: correct
    });

    var feedbackEl = document.getElementById('nback-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ Incorrect';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;
    setTimeout(function() {
      showISI(presentTrial);
    }, 500);
  }

  function finishGame() {
    document.removeEventListener('keydown', keyHandler);

    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: 0,
      nLevel: config.nLevel,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: state.results.map(function(r) { return r.correct ? 1 : 0; }),
      completed: true
    });
  }

  window.KCGames.nback = { init: init };
})();
