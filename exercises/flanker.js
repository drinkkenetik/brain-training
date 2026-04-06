/* ==========================================================================
   Kenetik Circuit — Flanker Task
   Ported from Brandon's brain-training with adaptive difficulty
   Domain: Executive function / response inhibition
   Score type: Reaction time
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { totalTrials: 16, congruentRatio: 0.6, isiDuration: 600 },
    2: { totalTrials: 18, congruentRatio: 0.5, isiDuration: 500 },
    3: { totalTrials: 20, congruentRatio: 0.5, isiDuration: 450 },
    4: { totalTrials: 24, congruentRatio: 0.4, isiDuration: 400 },
    5: { totalTrials: 28, congruentRatio: 0.35, isiDuration: 350 }
  };

  var ARROWS = {
    left: '←',
    right: '→'
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
      trials: generateTrials(),
      results: [],
      currentTrial: 0,
      trialStart: 0,
      awaitingResponse: false,
      practiceMode: true,
      practiceIndex: 0,
      practiceTrials: [
        { direction: 'right', flankerDirection: 'right', congruent: true, explain: 'All arrows point right → answer is RIGHT.' },
        { direction: 'left', flankerDirection: 'right', congruent: false, explain: 'The CENTER arrow points left. Ignore the surrounding arrows.' },
        { direction: 'right', flankerDirection: 'left', congruent: false, explain: 'Center = RIGHT. The distractors point left — don\'t be fooled.' }
      ]
    };

    render();
    presentPractice();
  }

  function generateTrials() {
    var trials = [];
    var congruentCount = Math.round(config.totalTrials * config.congruentRatio);

    for (var i = 0; i < config.totalTrials; i++) {
      var direction = Math.random() < 0.5 ? 'left' : 'right';
      var congruent = i < congruentCount;
      var flankerDir = congruent ? direction : (direction === 'left' ? 'right' : 'left');
      trials.push({
        direction: direction,
        flankerDirection: flankerDir,
        congruent: congruent
      });
    }

    // Shuffle
    for (var k = trials.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = trials[k]; trials[k] = trials[j]; trials[j] = tmp;
    }

    return trials;
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption" id="flanker-type">—</span>' +
          '<span class="kc-caption" id="flanker-progress">0 / ' + config.totalTrials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 32px;">' +
          '<div class="kc-progress-bar__fill" id="flanker-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 16px; color: var(--kc-text-muted); margin-bottom: 24px;">Which direction is the <strong>center arrow</strong> pointing?</div>' +
        '<div id="flanker-stimulus" style="min-height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; font-family: var(--kc-font-heading); font-size: 52px; letter-spacing: 12px; font-weight: 300;">' +
          '<span style="color: var(--kc-text-light);">+</span>' +
        '</div>' +
        '<div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 16px;">' +
          '<button class="kc-response-btn" data-dir="left" style="padding: 16px 40px; font-size: 28px;">←</button>' +
          '<button class="kc-response-btn" data-dir="right" style="padding: 16px 40px; font-size: 28px;">→</button>' +
        '</div>' +
        '<div id="flanker-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
      '</div>';

    container.querySelectorAll('.kc-response-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        handleResponse(btn.getAttribute('data-dir'));
      });
    });

    document.addEventListener('keydown', keyHandler);
  }

  function keyHandler(e) {
    if (!state.awaitingResponse) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); handleResponse('left'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); handleResponse('right'); }
  }

  // ===== PRACTICE =====
  function presentPractice() {
    if (state.practiceIndex >= state.practiceTrials.length) {
      var stimEl = document.getElementById('flanker-stimulus');
      var feedbackEl = document.getElementById('flanker-feedback');
      var typeEl = document.getElementById('flanker-type');
      if (typeEl) typeEl.textContent = '';
      if (feedbackEl) feedbackEl.textContent = '';
      if (stimEl) {
        stimEl.innerHTML = '<div style="text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--kc-blackberry);margin-bottom:8px;">Got it!</div><div style="font-size:15px;color:var(--kc-text-secondary);">Now the real test begins.</div></div>';
      }
      state.practiceMode = false;
      setTimeout(presentTrial, 1800);
      return;
    }

    var trial = state.practiceTrials[state.practiceIndex];
    var stimEl = document.getElementById('flanker-stimulus');
    var progressEl = document.getElementById('flanker-progress');
    var typeEl = document.getElementById('flanker-type');
    var feedbackEl = document.getElementById('flanker-feedback');

    if (typeEl) typeEl.textContent = 'PRACTICE';
    if (progressEl) progressEl.textContent = 'Practice ' + (state.practiceIndex + 1) + ' of 3';
    if (feedbackEl) feedbackEl.textContent = '';

    state.awaitingResponse = false;
    if (stimEl) {
      stimEl.innerHTML = '<span style="color:var(--kc-text-light);">+</span>';
      setTimeout(function() {
        var flanker = ARROWS[trial.flankerDirection];
        var center = ARROWS[trial.direction];
        stimEl.textContent = flanker + flanker + ' ' + center + ' ' + flanker + flanker;
        state.trialStart = performance.now();
        state.awaitingResponse = true;
      }, 300);
    }
  }

  function handlePracticeResponse(dir) {
    var trial = state.practiceTrials[state.practiceIndex];
    var correct = dir === trial.direction;
    var feedbackEl = document.getElementById('flanker-feedback');
    if (feedbackEl) {
      var prefix = correct ? '<span style="color:var(--kc-success);">✓ Correct!</span> ' : '<span style="color:var(--kc-error);">✗ Wrong.</span> ';
      feedbackEl.innerHTML = prefix + '<span style="color:var(--kc-text-secondary);font-size:13px;">' + trial.explain + '</span>';
    }
    state.practiceIndex++;
    setTimeout(presentPractice, 1800);
  }

  function presentTrial() {
    if (state.currentTrial >= state.trials.length) { finishGame(); return; }

    var trial = state.trials[state.currentTrial];
    var stimEl = document.getElementById('flanker-stimulus');
    var progressEl = document.getElementById('flanker-progress');
    var barEl = document.getElementById('flanker-bar');
    var typeEl = document.getElementById('flanker-type');
    var feedbackEl = document.getElementById('flanker-feedback');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.totalTrials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.totalTrials) * 100) + '%';
    if (typeEl) typeEl.textContent = trial.congruent ? 'CONGRUENT' : 'INCONGRUENT';
    if (feedbackEl) feedbackEl.textContent = '';

    // Show fixation then stimulus
    state.awaitingResponse = false;
    if (stimEl) {
      stimEl.innerHTML = '<span style="color: var(--kc-text-light);">+</span>';
      setTimeout(function() {
        var flanker = ARROWS[trial.flankerDirection];
        var center = ARROWS[trial.direction];
        stimEl.textContent = flanker + flanker + ' ' + center + ' ' + flanker + flanker;
        state.trialStart = performance.now();
        state.awaitingResponse = true;
      }, 250);
    }
  }

  function handleResponse(dir) {
    if (!state.awaitingResponse) return;
    state.awaitingResponse = false;

    if (state.practiceMode) { handlePracticeResponse(dir); return; }

    var rt = performance.now() - state.trialStart;
    var trial = state.trials[state.currentTrial];
    var correct = dir === trial.direction;

    state.results.push({
      trial: state.currentTrial,
      direction: trial.direction,
      response: dir,
      correct: correct,
      congruent: trial.congruent,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('flanker-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ Incorrect';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;
    setTimeout(presentTrial, config.isiDuration);
  }

  function finishGame() {
    document.removeEventListener('keydown', keyHandler);

    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;
    var correctRTs = correct.map(function(r) { return r.normalizedRT; });
    var avgRT = correctRTs.length > 0 ? correctRTs.reduce(function(a, b) { return a + b; }, 0) / correctRTs.length : 999;

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

  window.KCGames.flanker = { init: init };
})();
