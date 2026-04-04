/* ==========================================================================
   Kenetik Circuit — Go/No-Go
   Respond to target stimuli, withhold response to non-targets.
   Domain: Impulse control + sustained attention
   Score type: Reaction time
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { totalTrials: 24, noGoRatio: 0.25, stimDuration: 1200, isiRange: [600, 1000] },
    2: { totalTrials: 28, noGoRatio: 0.3, stimDuration: 1000, isiRange: [500, 900] },
    3: { totalTrials: 32, noGoRatio: 0.3, stimDuration: 800, isiRange: [400, 800] },
    4: { totalTrials: 36, noGoRatio: 0.35, stimDuration: 700, isiRange: [350, 700] },
    5: { totalTrials: 40, noGoRatio: 0.4, stimDuration: 600, isiRange: [300, 600] }
  };

  // Go = green circle, No-Go = red circle
  var GO_COLOR = '#2D9D4E';
  var NOGO_COLOR = '#E03D1A';

  var state, config, container, onComplete, normalizeRT, stimTimer;

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
      responded: false
    };

    render();
    presentTrial();
  }

  function generateTrials() {
    var trials = [];
    var noGoCount = Math.round(config.totalTrials * config.noGoRatio);

    for (var i = 0; i < config.totalTrials; i++) {
      trials.push({ isGo: i >= noGoCount });
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
          '<span class="kc-caption" id="gng-type">—</span>' +
          '<span class="kc-caption" id="gng-progress">1 / ' + config.totalTrials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 32px;">' +
          '<div class="kc-progress-bar__fill" id="gng-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="display: flex; gap: 24px; justify-content: center; margin-bottom: 24px;">' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<div style="width: 16px; height: 16px; border-radius: 50%; background: ' + GO_COLOR + ';"></div>' +
            '<span class="kc-caption">Tap!</span>' +
          '</div>' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<div style="width: 16px; height: 16px; border-radius: 50%; background: ' + NOGO_COLOR + ';"></div>' +
            '<span class="kc-caption">Don\'t tap</span>' +
          '</div>' +
        '</div>' +
        '<div id="gng-stimulus" style="min-height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; cursor: pointer;" tabindex="0">' +
          '<div style="width: 100px; height: 100px; border-radius: 50%; background: var(--kc-border);"></div>' +
        '</div>' +
        '<div id="gng-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
        '<div class="kc-caption" style="margin-top: 8px;">Press <kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">Space</kbd> or tap the circle</div>' +
      '</div>';

    var stimArea = document.getElementById('gng-stimulus');
    if (stimArea) {
      stimArea.addEventListener('click', handleGo);
    }
    document.addEventListener('keydown', keyHandler);
  }

  function keyHandler(e) {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleGo();
    }
  }

  function presentTrial() {
    if (state.currentTrial >= state.trials.length) { finishGame(); return; }

    state.responded = false;
    var trial = state.trials[state.currentTrial];
    var stimEl = document.getElementById('gng-stimulus');
    var progressEl = document.getElementById('gng-progress');
    var barEl = document.getElementById('gng-bar');
    var typeEl = document.getElementById('gng-type');
    var feedbackEl = document.getElementById('gng-feedback');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.totalTrials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.totalTrials) * 100) + '%';
    if (typeEl) typeEl.textContent = '';
    if (feedbackEl) feedbackEl.textContent = '';

    // Show blank briefly
    if (stimEl) {
      stimEl.innerHTML = '<div style="width: 100px; height: 100px; border-radius: 50%; background: var(--kc-border);"></div>';
    }

    var isi = config.isiRange[0] + Math.floor(Math.random() * (config.isiRange[1] - config.isiRange[0]));

    setTimeout(function() {
      var color = trial.isGo ? GO_COLOR : NOGO_COLOR;
      if (stimEl) {
        stimEl.innerHTML = '<div style="width: 100px; height: 100px; border-radius: 50%; background: ' + color + '; box-shadow: 0 0 20px ' + color + '40; transition: all 150ms ease;"></div>';
      }
      state.trialStart = performance.now();

      // Auto-advance after stimDuration (no response = correct withhold for no-go, miss for go)
      stimTimer = setTimeout(function() {
        if (!state.responded) {
          var correct = !trial.isGo; // Not responding is correct for no-go
          state.results.push({
            trial: state.currentTrial,
            isGo: trial.isGo,
            responded: false,
            correct: correct,
            rt: null,
            normalizedRT: null
          });

          if (feedbackEl) {
            if (trial.isGo) {
              feedbackEl.textContent = '— Too slow';
              feedbackEl.style.color = 'var(--kc-error)';
            } else {
              feedbackEl.textContent = '✓ Good restraint';
              feedbackEl.style.color = 'var(--kc-success)';
            }
          }

          state.currentTrial++;
          setTimeout(presentTrial, 300);
        }
      }, config.stimDuration);
    }, isi);
  }

  function handleGo() {
    if (state.responded || state.trialStart === 0) return;
    state.responded = true;
    clearTimeout(stimTimer);

    var rt = performance.now() - state.trialStart;
    var trial = state.trials[state.currentTrial];
    var correct = trial.isGo; // Responding is correct for go, incorrect for no-go

    state.results.push({
      trial: state.currentTrial,
      isGo: trial.isGo,
      responded: true,
      correct: correct,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('gng-feedback');
    if (feedbackEl) {
      if (correct) {
        feedbackEl.textContent = '✓ ' + Math.round(rt) + 'ms';
        feedbackEl.style.color = 'var(--kc-success)';
      } else {
        feedbackEl.textContent = '✗ Should have waited!';
        feedbackEl.style.color = 'var(--kc-error)';
      }
    }

    state.currentTrial++;
    setTimeout(presentTrial, 400);
  }

  function finishGame() {
    document.removeEventListener('keydown', keyHandler);

    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;

    var goResponses = state.results.filter(function(r) { return r.isGo && r.responded; });
    var correctRTs = goResponses.filter(function(r) { return r.correct; }).map(function(r) { return r.normalizedRT; });
    var avgRT = correctRTs.length > 0 ? correctRTs.reduce(function(a, b) { return a + b; }, 0) / correctRTs.length : 999;

    // Commission errors (responded to no-go)
    var commissionErrors = state.results.filter(function(r) { return !r.isGo && r.responded; }).length;
    // Omission errors (didn't respond to go)
    var omissionErrors = state.results.filter(function(r) { return r.isGo && !r.responded; }).length;

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: avgRT,
      commissionErrors: commissionErrors,
      omissionErrors: omissionErrors,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: state.results.map(function(r) { return r.correct ? 1 : 0; }),
      completed: true
    });
  }

  window.KCGames['go-no-go'] = { init: init };
})();
