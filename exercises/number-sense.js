/* ==========================================================================
   Kenetik Circuit — Number Sense
   Quick estimation and arithmetic under time pressure.
   Domain: Numerical cognition + estimation
   Score type: Mixed (60% accuracy + 40% speed)
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { trials: 16, maxNumber: 20, operations: ['+', '-'], timePerTrial: 8000 },
    2: { trials: 18, maxNumber: 50, operations: ['+', '-', '×'], timePerTrial: 7000 },
    3: { trials: 20, maxNumber: 100, operations: ['+', '-', '×'], timePerTrial: 6000 },
    4: { trials: 22, maxNumber: 100, operations: ['+', '-', '×', '÷'], timePerTrial: 5000 },
    5: { trials: 24, maxNumber: 200, operations: ['+', '-', '×', '÷'], timePerTrial: 4000 }
  };

  var state, config, container, onComplete, normalizeRT, trialTimer;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;
    normalizeRT = options.normalizeRT || function(rt) { return rt; };

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = { results: [], currentTrial: 0 };
    render();
    presentTrial();
  }

  function generateProblem() {
    var op = config.operations[Math.floor(Math.random() * config.operations.length)];
    var a, b, answer;

    switch (op) {
      case '+':
        a = 1 + Math.floor(Math.random() * config.maxNumber);
        b = 1 + Math.floor(Math.random() * config.maxNumber);
        answer = a + b;
        break;
      case '-':
        a = 1 + Math.floor(Math.random() * config.maxNumber);
        b = 1 + Math.floor(Math.random() * a); // ensure positive result
        answer = a - b;
        break;
      case '×':
        a = 2 + Math.floor(Math.random() * 12);
        b = 2 + Math.floor(Math.random() * 12);
        answer = a * b;
        break;
      case '÷':
        b = 2 + Math.floor(Math.random() * 10);
        answer = 1 + Math.floor(Math.random() * 12);
        a = b * answer; // ensure clean division
        break;
    }

    // Generate 3 wrong options
    var options = [answer];
    while (options.length < 4) {
      var wrong = answer + (Math.floor(Math.random() * 11) - 5);
      if (wrong !== answer && wrong >= 0 && options.indexOf(wrong) === -1) {
        options.push(wrong);
      }
    }

    // Shuffle options
    for (var i = options.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = options[i]; options[i] = options[j]; options[j] = tmp;
    }

    return { a: a, b: b, op: op, answer: answer, options: options };
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption">NUMBER SENSE</span>' +
          '<span class="kc-caption" id="ns-progress">1 / ' + config.trials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 24px;">' +
          '<div class="kc-progress-bar__fill" id="ns-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div id="ns-timer-bar" style="height: 3px; background: var(--kc-border); border-radius: 2px; margin-bottom: 24px; overflow: hidden;">' +
          '<div id="ns-timer-fill" style="height: 100%; background: var(--kc-peach); width: 100%; transition: width linear;"></div>' +
        '</div>' +
        '<div id="ns-problem" style="font-family: var(--kc-font-heading); font-size: 48px; font-weight: 700; margin-bottom: 32px; color: var(--kc-blackberry); min-height: 60px;"></div>' +
        '<div id="ns-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 320px; margin: 0 auto 16px;"></div>' +
        '<div id="ns-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
      '</div>';
  }

  function presentTrial() {
    if (state.currentTrial >= config.trials) { finishGame(); return; }

    var progressEl = document.getElementById('ns-progress');
    var barEl = document.getElementById('ns-bar');
    var feedbackEl = document.getElementById('ns-feedback');
    var problemEl = document.getElementById('ns-problem');
    var optionsEl = document.getElementById('ns-options');
    var timerFill = document.getElementById('ns-timer-fill');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.trials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.trials) * 100) + '%';
    if (feedbackEl) feedbackEl.textContent = '';

    var problem = generateProblem();
    state.currentProblem = problem;

    if (problemEl) problemEl.textContent = problem.a + ' ' + problem.op + ' ' + problem.b + ' = ?';

    // Timer bar animation
    if (timerFill) {
      timerFill.style.transition = 'none';
      timerFill.style.width = '100%';
      setTimeout(function() {
        timerFill.style.transition = 'width ' + (config.timePerTrial / 1000) + 's linear';
        timerFill.style.width = '0%';
      }, 50);
    }

    // Render options
    if (optionsEl) {
      optionsEl.innerHTML = '';
      problem.options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.className = 'kc-response-btn';
        btn.style.cssText = 'padding: 16px; font-size: 22px; font-weight: 700; font-family: var(--kc-font-heading); width: 100%; border-radius: var(--kc-radius);';
        btn.textContent = opt;
        btn.addEventListener('click', function() { handleResponse(opt); });
        optionsEl.appendChild(btn);
      });
    }

    state.trialStart = performance.now();

    // Auto-advance on timeout
    trialTimer = setTimeout(function() {
      state.results.push({
        trial: state.currentTrial,
        correct: false,
        responded: false,
        rt: config.timePerTrial
      });
      if (feedbackEl) {
        feedbackEl.textContent = '— Time\'s up! Answer: ' + problem.answer;
        feedbackEl.style.color = 'var(--kc-error)';
      }
      state.currentTrial++;
      setTimeout(presentTrial, 800);
    }, config.timePerTrial);
  }

  function handleResponse(selected) {
    clearTimeout(trialTimer);
    var rt = performance.now() - state.trialStart;
    var correct = selected === state.currentProblem.answer;

    state.results.push({
      trial: state.currentTrial,
      correct: correct,
      responded: true,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('ns-feedback');
    if (feedbackEl) {
      if (correct) {
        feedbackEl.textContent = '✓ ' + Math.round(rt) + 'ms';
        feedbackEl.style.color = 'var(--kc-success)';
      } else {
        feedbackEl.textContent = '✗ Answer: ' + state.currentProblem.answer;
        feedbackEl.style.color = 'var(--kc-error)';
      }
    }

    state.currentTrial++;
    setTimeout(presentTrial, 500);
  }

  function finishGame() {
    clearTimeout(trialTimer);
    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;
    var respondedCorrect = correct.filter(function(r) { return r.responded; });
    var avgRT = respondedCorrect.length > 0 ?
      respondedCorrect.reduce(function(a, r) { return a + r.normalizedRT; }, 0) / respondedCorrect.length : 999;

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: avgRT,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: state.results.map(function(r) { return r.correct ? 1 : 0; }),
      completed: true
    });
  }

  window.KCGames['number-sense'] = { init: init };
})();
