/* ==========================================================================
   Kenetik Circuit — Task Switching
   Ported from Brandon's brain-training with adaptive difficulty
   Domain: Cognitive flexibility
   Score type: Reaction time
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { totalTrials: 16, switchRatio: 0.3, isiDuration: 600 },
    2: { totalTrials: 20, switchRatio: 0.4, isiDuration: 500 },
    3: { totalTrials: 24, switchRatio: 0.5, isiDuration: 450 },
    4: { totalTrials: 28, switchRatio: 0.5, isiDuration: 400 },
    5: { totalTrials: 32, switchRatio: 0.6, isiDuration: 350 }
  };

  var SHAPES = ['circle', 'square', 'triangle', 'diamond'];
  var COLORS_MAP = {
    red: '#E03D1A',
    blue: '#269DD2',
    green: '#2D9D4E',
    yellow: '#FBB11B'
  };
  var COLORS = Object.keys(COLORS_MAP);

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
      awaitingResponse: false
    };

    render();
    presentTrial();
  }

  function generateTrials() {
    var trials = [];
    var currentRule = 'shape'; // alternates

    for (var i = 0; i < config.totalTrials; i++) {
      var shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      var color = COLORS[Math.floor(Math.random() * COLORS.length)];
      var isSwitch = i > 0 && Math.random() < config.switchRatio;

      if (isSwitch) {
        currentRule = currentRule === 'shape' ? 'color' : 'shape';
      }

      trials.push({
        shape: shape,
        color: color,
        rule: currentRule,
        isSwitch: isSwitch,
        correctAnswer: currentRule === 'shape' ? shape : color
      });
    }

    return trials;
  }

  function drawShape(shape, color, size) {
    var hex = COLORS_MAP[color] || '#000';
    if (shape === 'circle') return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + hex + ';"></div>';
    if (shape === 'square') return '<div style="width:' + size + 'px;height:' + size + 'px;background:' + hex + ';border-radius:4px;"></div>';
    if (shape === 'triangle') return '<div style="width:0;height:0;border-left:' + (size/2) + 'px solid transparent;border-right:' + (size/2) + 'px solid transparent;border-bottom:' + size + 'px solid ' + hex + ';"></div>';
    if (shape === 'diamond') return '<div style="width:' + size + 'px;height:' + size + 'px;background:' + hex + ';transform:rotate(45deg);border-radius:4px;"></div>';
    return '';
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption" id="ts-rule">RULE: SHAPE</span>' +
          '<span class="kc-caption" id="ts-progress">0 / ' + config.totalTrials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 32px;">' +
          '<div class="kc-progress-bar__fill" id="ts-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div id="ts-instruction" style="font-size: 18px; font-weight: 700; color: var(--kc-blackberry); margin-bottom: 16px; padding: 12px; background: var(--kc-bg-panel); border-radius: var(--kc-radius);">Identify the SHAPE</div>' +
        '<div id="ts-stimulus" style="min-height: 160px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px;">' +
          '<span style="color: var(--kc-text-light); font-size: 48px;">+</span>' +
        '</div>' +
        '<div id="ts-responses" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;"></div>' +
        '<div id="ts-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
      '</div>';
  }

  function presentTrial() {
    if (state.currentTrial >= state.trials.length) { finishGame(); return; }

    var trial = state.trials[state.currentTrial];
    var stimEl = document.getElementById('ts-stimulus');
    var progressEl = document.getElementById('ts-progress');
    var barEl = document.getElementById('ts-bar');
    var ruleEl = document.getElementById('ts-rule');
    var instrEl = document.getElementById('ts-instruction');
    var responsesEl = document.getElementById('ts-responses');
    var feedbackEl = document.getElementById('ts-feedback');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.totalTrials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.totalTrials) * 100) + '%';
    if (ruleEl) ruleEl.textContent = 'RULE: ' + trial.rule.toUpperCase();
    if (instrEl) {
      instrEl.textContent = 'Identify the ' + trial.rule.toUpperCase();
      instrEl.style.background = trial.isSwitch ? 'rgba(251, 177, 27, 0.15)' : 'var(--kc-bg-panel)';
    }
    if (feedbackEl) feedbackEl.textContent = '';

    // Show fixation then stimulus
    state.awaitingResponse = false;
    if (stimEl) {
      stimEl.innerHTML = '<span style="color: var(--kc-text-light); font-size: 48px;">+</span>';
    }

    setTimeout(function() {
      if (stimEl) stimEl.innerHTML = drawShape(trial.shape, trial.color, 80);

      // Render response options
      var options = trial.rule === 'shape' ? SHAPES : COLORS;
      if (responsesEl) {
        responsesEl.innerHTML = '';
        options.forEach(function(opt) {
          var btn = document.createElement('button');
          btn.className = 'kc-response-btn';
          btn.setAttribute('data-answer', opt);
          btn.style.padding = '14px 24px';
          btn.style.minWidth = '80px';
          if (trial.rule === 'color') {
            btn.style.color = COLORS_MAP[opt] || '#000';
          }
          btn.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
          btn.addEventListener('click', function() { handleResponse(opt); });
          responsesEl.appendChild(btn);
        });
      }

      state.trialStart = performance.now();
      state.awaitingResponse = true;
    }, 300);
  }

  function handleResponse(answer) {
    if (!state.awaitingResponse) return;
    state.awaitingResponse = false;

    var rt = performance.now() - state.trialStart;
    var trial = state.trials[state.currentTrial];
    var correct = answer === trial.correctAnswer;

    state.results.push({
      trial: state.currentTrial,
      rule: trial.rule,
      correct: correct,
      isSwitch: trial.isSwitch,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('ts-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ Incorrect';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;
    setTimeout(presentTrial, config.isiDuration);
  }

  function finishGame() {
    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;
    var correctRTs = correct.map(function(r) { return r.normalizedRT; });
    var avgRT = correctRTs.length > 0 ? correctRTs.reduce(function(a, b) { return a + b; }, 0) / correctRTs.length : 999;

    // Switch cost: avg RT on switch trials vs stay trials
    var switchRTs = correct.filter(function(r) { return r.isSwitch; }).map(function(r) { return r.normalizedRT; });
    var stayRTs = correct.filter(function(r) { return !r.isSwitch; }).map(function(r) { return r.normalizedRT; });
    var switchAvg = switchRTs.length > 0 ? switchRTs.reduce(function(a, b) { return a + b; }, 0) / switchRTs.length : 0;
    var stayAvg = stayRTs.length > 0 ? stayRTs.reduce(function(a, b) { return a + b; }, 0) / stayRTs.length : 0;

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: avgRT,
      switchCost: Math.round(switchAvg - stayAvg),
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: state.results.map(function(r) { return r.correct ? 1 : 0; }),
      completed: true
    });
  }

  window.KCGames['task-switching'] = { init: init };
})();
