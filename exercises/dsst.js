/* ==========================================================================
   Kenetik Circuit — DSST (Digit Symbol Substitution Test)
   Ported from brain-score-preview with adaptive difficulty
   Domain: Processing speed
   Score type: Reaction time (sigmoid normalized)
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  // Symbol set
  var SYMBOLS = ['◯', '△', '□', '◇', '✕', '⬟', '▽', '☆', '⬡'];

  // Adaptive difficulty (5 levels)
  var DIFFICULTY = {
    1: { duration: 90, symbolCount: 6 },
    2: { duration: 90, symbolCount: 7 },
    3: { duration: 90, symbolCount: 8 },
    4: { duration: 75, symbolCount: 9 },
    5: { duration: 60, symbolCount: 9 }
  };

  var state, config, container, onComplete, normalizeRT, timerInterval;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;
    normalizeRT = options.normalizeRT || function(rt) { return rt; };

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      symbolMap: {},
      results: [],
      currentDigit: 0,
      timeLeft: config.duration,
      score: 0,
      trialStart: 0,
      active: false
    };

    // Generate random symbol-digit mapping
    var shuffled = SYMBOLS.slice(0, config.symbolCount);
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    for (var k = 0; k < config.symbolCount; k++) {
      state.symbolMap[k + 1] = shuffled[k];
    }

    render();
    startTimer();
    nextDigit();
  }

  function render() {
    var keyHTML = '';
    for (var d = 1; d <= config.symbolCount; d++) {
      keyHTML += '<div style="text-align: center; padding: 10px 4px; background: var(--kc-bg-panel);">' +
        '<div style="font-family: var(--kc-font-heading); font-size: 16px; font-weight: 500; margin-bottom: 4px;">' + d + '</div>' +
        '<div style="font-size: 20px; color: var(--kc-strawberry);">' + state.symbolMap[d] + '</div>' +
      '</div>';
    }

    var responseHTML = '';
    for (var s = 1; s <= config.symbolCount; s++) {
      responseHTML += '<button class="kc-response-btn dsst-btn" data-symbol="' + state.symbolMap[s] + '" ' +
        'style="padding: 14px 8px; font-size: 22px; min-width: auto; border-radius: var(--kc-radius);">' +
        state.symbolMap[s] + '</button>';
    }

    container.innerHTML =
      '<div style="width: 100%; max-width: 560px;">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">' +
          '<div><span class="kc-caption">TIME</span> <span id="dsst-timer" style="font-family: var(--kc-font-heading); font-size: 28px; font-weight: 500;">' + config.duration + '</span></div>' +
          '<div><span class="kc-caption">CORRECT</span> <span id="dsst-score" style="font-family: var(--kc-font-heading); font-size: 28px; font-weight: 500;">0</span></div>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: repeat(' + config.symbolCount + ', 1fr); gap: 1px; background: var(--kc-border); border-radius: var(--kc-radius-lg); overflow: hidden; margin-bottom: 20px;">' +
          keyHTML +
        '</div>' +
        '<div style="text-align: center; margin-bottom: 16px;">' +
          '<div class="kc-caption" style="margin-bottom: 4px;">Match the symbol for:</div>' +
          '<div id="dsst-digit" style="font-family: var(--kc-font-heading); font-size: 72px; font-weight: 300; color: var(--kc-strawberry);">1</div>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: repeat(' + Math.min(config.symbolCount, 5) + ', 1fr); gap: 8px; margin-bottom: 12px;">' +
          responseHTML +
        '</div>' +
        '<div id="dsst-feedback" style="text-align: center; height: 24px; font-size: 14px; font-weight: 700;"></div>' +
        '<div class="kc-progress-bar" style="margin-top: 16px;">' +
          '<div class="kc-progress-bar__fill" id="dsst-timer-bar" style="width: 100%;"></div>' +
        '</div>' +
      '</div>';

    // Click handlers
    var btns = container.querySelectorAll('.dsst-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        handleResponse(btn.getAttribute('data-symbol'));
      });
    });

    state.active = true;
  }

  function startTimer() {
    timerInterval = setInterval(function() {
      state.timeLeft--;
      var timerEl = document.getElementById('dsst-timer');
      var barEl = document.getElementById('dsst-timer-bar');

      if (timerEl) {
        timerEl.textContent = state.timeLeft;
        if (state.timeLeft <= 10) timerEl.style.color = 'var(--kc-strawberry)';
      }
      if (barEl) barEl.style.width = ((state.timeLeft / config.duration) * 100) + '%';

      if (state.timeLeft <= 0) {
        clearInterval(timerInterval);
        finishGame();
      }
    }, 1000);
  }

  function nextDigit() {
    state.currentDigit = Math.floor(Math.random() * config.symbolCount) + 1;
    var digitEl = document.getElementById('dsst-digit');
    if (digitEl) digitEl.textContent = state.currentDigit;
    state.trialStart = performance.now();
  }

  function handleResponse(selectedSymbol) {
    if (!state.active) return;

    var rt = performance.now() - state.trialStart;
    var normalizedRt = normalizeRT(rt);
    var correctSymbol = state.symbolMap[state.currentDigit];
    var correct = selectedSymbol === correctSymbol;

    state.results.push({
      digit: state.currentDigit,
      correctSymbol: correctSymbol,
      response: selectedSymbol,
      correct: correct,
      rt: rt,
      normalizedRT: normalizedRt
    });

    if (correct) state.score++;

    // Update UI
    var scoreEl = document.getElementById('dsst-score');
    var feedbackEl = document.getElementById('dsst-feedback');
    if (scoreEl) scoreEl.textContent = state.score;
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓' : '✗';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
      setTimeout(function() { if (feedbackEl) feedbackEl.textContent = ''; }, 400);
    }

    nextDigit();
  }

  function finishGame() {
    state.active = false;
    clearInterval(timerInterval);

    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = state.results.length > 0 ? (correct.length / state.results.length) * 100 : 0;

    var correctRTs = correct.map(function(r) { return r.normalizedRT; });
    var avgRT = correctRTs.length > 0 ?
      correctRTs.reduce(function(a, b) { return a + b; }, 0) / correctRTs.length : 999;

    var trialAccuracies = state.results.map(function(r) { return r.correct ? 1 : 0; });

    onComplete({
      score: state.score,
      accuracy: accuracy,
      avgRT: avgRT,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: trialAccuracies,
      completed: true
    });
  }

  window.KCGames.dsst = { init: init };
})();
