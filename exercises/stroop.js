/* ==========================================================================
   Kenetik Circuit — Stroop Color Word Test
   Ported from brain-score-preview with adaptive difficulty
   Domain: Executive function / inhibition
   Score type: Reaction time (sigmoid normalized)
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var COLORS = ['red', 'blue', 'green', 'yellow'];
  var COLOR_HEX = {
    red: '#E03D1A',
    blue: '#269DD2',
    green: '#2D9D4E',
    yellow: '#D4A017'
  };
  var COLOR_WORDS = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
  var KEY_MAP = { '1': 'red', '2': 'blue', '3': 'green', '4': 'yellow' };

  // Adaptive difficulty (5 levels)
  var DIFFICULTY = {
    1: { totalTrials: 16, incongruentRatio: 0.4, isiDuration: 600 },
    2: { totalTrials: 18, incongruentRatio: 0.5, isiDuration: 500 },
    3: { totalTrials: 20, incongruentRatio: 0.5, isiDuration: 450 },
    4: { totalTrials: 22, incongruentRatio: 0.6, isiDuration: 400 },
    5: { totalTrials: 24, incongruentRatio: 0.7, isiDuration: 350 }
  };

  var state, config, container, onComplete, normalizeRT;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;
    normalizeRT = options.normalizeRT || function(rt) { return rt; };

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      trials: [],
      results: [],
      currentTrial: 0,
      trialStart: 0,
      awaitingResponse: false
    };

    state.trials = generateTrials();
    render();
    presentTrial();
  }

  function generateTrials() {
    var trials = [];
    var incongruentCount = Math.round(config.totalTrials * config.incongruentRatio);
    var congruentCount = config.totalTrials - incongruentCount;

    for (var i = 0; i < congruentCount; i++) {
      var c = COLORS[i % COLORS.length];
      trials.push({ word: c.toUpperCase(), inkColor: c, congruent: true });
    }

    for (var j = 0; j < incongruentCount; j++) {
      var word = COLORS[j % COLORS.length];
      var available = COLORS.filter(function(c) { return c !== word; });
      var ink = available[Math.floor(Math.random() * available.length)];
      trials.push({ word: word.toUpperCase(), inkColor: ink, congruent: false });
    }

    // Fisher-Yates shuffle
    for (var k = trials.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = trials[k]; trials[k] = trials[r]; trials[r] = tmp;
    }

    return trials;
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">' +
          '<span class="kc-caption" id="stroop-trial-type">—</span>' +
          '<span class="kc-caption" id="stroop-progress">0 / ' + config.totalTrials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 32px;">' +
          '<div class="kc-progress-bar__fill" id="stroop-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 16px; color: var(--kc-text-muted); margin-bottom: 24px;">Name the <strong>ink color</strong>, not the word.</div>' +
        '<div id="stroop-stimulus" style="min-height: 160px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px;">' +
          '<span style="font-size: 48px; color: var(--kc-text-light);">+</span>' +
        '</div>' +
        '<div id="stroop-responses" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;">' +
          COLORS.map(function(c, i) {
            return '<button class="kc-response-btn" data-color="' + c + '" style="color: ' + COLOR_HEX[c] + '; min-width: 90px;">' +
              c.toUpperCase() +
            '</button>';
          }).join('') +
        '</div>' +
        '<div id="stroop-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
        '<div class="kc-caption" style="margin-top: 12px;">Keys: <kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">1</kbd> ' +
          '<kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">2</kbd> ' +
          '<kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">3</kbd> ' +
          '<kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">4</kbd>' +
        '</div>' +
      '</div>';

    // Click handlers
    var btns = container.querySelectorAll('.kc-response-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        handleResponse(btn.getAttribute('data-color'));
      });
    });

    // Keyboard handler
    document.addEventListener('keydown', keyHandler);
  }

  function keyHandler(e) {
    if (!state.awaitingResponse) return;
    var color = KEY_MAP[e.key];
    if (color) {
      e.preventDefault();
      handleResponse(color);
    }
  }

  function presentTrial() {
    if (state.currentTrial >= state.trials.length) {
      finishGame();
      return;
    }

    var trial = state.trials[state.currentTrial];
    var stimEl = document.getElementById('stroop-stimulus');
    var progressEl = document.getElementById('stroop-progress');
    var barEl = document.getElementById('stroop-bar');
    var typeEl = document.getElementById('stroop-trial-type');
    var feedbackEl = document.getElementById('stroop-feedback');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.totalTrials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.totalTrials) * 100) + '%';
    if (typeEl) typeEl.textContent = trial.congruent ? 'CONGRUENT' : 'INCONGRUENT';
    if (feedbackEl) feedbackEl.textContent = '';

    // Show fixation briefly
    if (stimEl) {
      stimEl.innerHTML = '<span style="font-size: 48px; color: var(--kc-text-light);">+</span>';
      state.awaitingResponse = false;

      setTimeout(function() {
        // Show stimulus
        stimEl.innerHTML = '<span style="font-family: var(--kc-font-heading); font-size: 64px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: ' + COLOR_HEX[trial.inkColor] + ';">' + trial.word + '</span>';
        state.trialStart = performance.now();
        state.awaitingResponse = true;
      }, 250);
    }
  }

  function handleResponse(selectedColor) {
    if (!state.awaitingResponse) return;
    state.awaitingResponse = false;

    var rt = performance.now() - state.trialStart;
    var normalizedRt = normalizeRT(rt);
    var trial = state.trials[state.currentTrial];
    var correct = selectedColor === trial.inkColor;

    state.results.push({
      trial: state.currentTrial,
      word: trial.word,
      inkColor: trial.inkColor,
      response: selectedColor,
      correct: correct,
      congruent: trial.congruent,
      rt: rt,
      normalizedRT: normalizedRt
    });

    // Show feedback
    var feedbackEl = document.getElementById('stroop-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ Incorrect';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;

    setTimeout(function() {
      presentTrial();
    }, config.isiDuration);
  }

  function finishGame() {
    document.removeEventListener('keydown', keyHandler);

    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;

    var correctRTs = correct.map(function(r) { return r.normalizedRT; });
    var avgRT = correctRTs.length > 0 ?
      correctRTs.reduce(function(a, b) { return a + b; }, 0) / correctRTs.length : 999;

    // Stroop effect: incongruent avg RT - congruent avg RT
    var congruentRTs = correct.filter(function(r) { return r.congruent; }).map(function(r) { return r.normalizedRT; });
    var incongruentRTs = correct.filter(function(r) { return !r.congruent; }).map(function(r) { return r.normalizedRT; });
    var congruentAvg = congruentRTs.length > 0 ? congruentRTs.reduce(function(a, b) { return a + b; }, 0) / congruentRTs.length : 0;
    var incongruentAvg = incongruentRTs.length > 0 ? incongruentRTs.reduce(function(a, b) { return a + b; }, 0) / incongruentRTs.length : 0;

    var trialAccuracies = state.results.map(function(r) { return r.correct ? 1 : 0; });

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: avgRT,
      stroopEffect: Math.round(incongruentAvg - congruentAvg),
      congruentAvgRT: congruentAvg,
      incongruentAvgRT: incongruentAvg,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: trialAccuracies,
      completed: true
    });
  }

  window.KCGames.stroop = { init: init };
})();
