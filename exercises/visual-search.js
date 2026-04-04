/* ==========================================================================
   Kenetik Circuit — Visual Search
   Find the target shape among increasingly complex fields of distractors.
   Domain: Selective attention
   Score type: Reaction time
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var SHAPES = [
    { type: 'circle', draw: function(color) { return '<div style="width:36px;height:36px;border-radius:50%;background:' + color + ';"></div>'; } },
    { type: 'square', draw: function(color) { return '<div style="width:32px;height:32px;background:' + color + ';border-radius:3px;"></div>'; } },
    { type: 'triangle', draw: function(color) { return '<div style="width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:36px solid ' + color + ';"></div>'; } },
    { type: 'diamond', draw: function(color) { return '<div style="width:28px;height:28px;background:' + color + ';transform:rotate(45deg);border-radius:3px;"></div>'; } },
    { type: 'star', draw: function(color) { return '<div style="font-size:32px;color:' + color + ';line-height:1;">★</div>'; } }
  ];

  var SHAPE_COLORS = ['#E03D1A', '#269DD2', '#2D9D4E', '#D01483', '#F06925'];

  var DIFFICULTY = {
    1: { trials: 12, distractorStart: 6, distractorInc: 1, shapeTypes: 2, colorTypes: 1 },
    2: { trials: 14, distractorStart: 8, distractorInc: 1, shapeTypes: 3, colorTypes: 1 },
    3: { trials: 16, distractorStart: 10, distractorInc: 2, shapeTypes: 3, colorTypes: 2 },
    4: { trials: 18, distractorStart: 12, distractorInc: 2, shapeTypes: 4, colorTypes: 3 },
    5: { trials: 20, distractorStart: 15, distractorInc: 3, shapeTypes: 5, colorTypes: 4 }
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
      targetShape: null,
      targetColor: null
    };

    // Pick a target for this session
    state.targetShape = SHAPES[0]; // circle is always the target
    state.targetColor = SHAPE_COLORS[0]; // red

    generateTrials();
    render();
    presentTrial();
  }

  function generateTrials() {
    for (var i = 0; i < config.trials; i++) {
      var distractorCount = config.distractorStart + (i * config.distractorInc);
      distractorCount = Math.min(distractorCount, 30); // cap
      state.trials.push({ distractorCount: distractorCount });
    }
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 600px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<span class="kc-caption">FIND:</span>' +
            '<div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--kc-bg-panel); border-radius: var(--kc-radius); border: 2px solid var(--kc-strawberry);">' +
              state.targetShape.draw(state.targetColor) +
            '</div>' +
          '</div>' +
          '<span class="kc-caption" id="vs-progress">1 / ' + config.trials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 16px;">' +
          '<div class="kc-progress-bar__fill" id="vs-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div id="vs-field" style="position: relative; width: 100%; height: 400px; background: var(--kc-white); border-radius: var(--kc-radius-lg); border: 1px solid var(--kc-border); overflow: hidden; cursor: pointer;">' +
        '</div>' +
        '<div id="vs-feedback" style="height: 24px; font-size: 14px; font-weight: 700; margin-top: 12px;"></div>' +
      '</div>';
  }

  function presentTrial() {
    if (state.currentTrial >= state.trials.length) { finishGame(); return; }

    var trial = state.trials[state.currentTrial];
    var field = document.getElementById('vs-field');
    var progressEl = document.getElementById('vs-progress');
    var barEl = document.getElementById('vs-bar');
    var feedbackEl = document.getElementById('vs-feedback');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.trials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.trials) * 100) + '%';
    if (feedbackEl) feedbackEl.textContent = '';

    if (!field) return;
    field.innerHTML = '';

    var positions = generatePositions(trial.distractorCount + 1, field.offsetWidth, field.offsetHeight);
    var targetIdx = Math.floor(Math.random() * positions.length);
    var availableShapes = SHAPES.slice(1, config.shapeTypes + 1); // exclude target shape
    var availableColors = SHAPE_COLORS.slice(1, config.colorTypes + 1);
    if (availableColors.length === 0) availableColors = [SHAPE_COLORS[1]];

    positions.forEach(function(pos, i) {
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:' + pos.x + 'px;top:' + pos.y + 'px;display:flex;align-items:center;justify-content:center;width:44px;height:44px;cursor:pointer;';

      if (i === targetIdx) {
        el.innerHTML = state.targetShape.draw(state.targetColor);
        el.setAttribute('data-target', 'true');
      } else {
        var shape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
        var color = availableColors[Math.floor(Math.random() * availableColors.length)];
        el.innerHTML = shape.draw(color);
      }

      el.addEventListener('click', function() {
        handleClick(el.getAttribute('data-target') === 'true');
      });

      field.appendChild(el);
    });

    state.trialStart = performance.now();
  }

  function generatePositions(count, width, height) {
    var positions = [];
    var padding = 30;
    var minDist = 44;

    for (var i = 0; i < count; i++) {
      var attempts = 0;
      var x, y, valid;
      do {
        x = padding + Math.floor(Math.random() * (width - padding * 2 - 44));
        y = padding + Math.floor(Math.random() * (height - padding * 2 - 44));
        valid = true;
        for (var j = 0; j < positions.length; j++) {
          var dx = x - positions[j].x;
          var dy = y - positions[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < minDist) { valid = false; break; }
        }
        attempts++;
      } while (!valid && attempts < 100);
      positions.push({ x: x, y: y });
    }
    return positions;
  }

  function handleClick(isTarget) {
    var rt = performance.now() - state.trialStart;

    state.results.push({
      trial: state.currentTrial,
      correct: isTarget,
      distractors: state.trials[state.currentTrial].distractorCount,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('vs-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = isTarget ? '✓ Found it!' : '✗ Wrong one';
      feedbackEl.style.color = isTarget ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;
    setTimeout(presentTrial, 400);
  }

  function finishGame() {
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

  window.KCGames['visual-search'] = { init: init };
})();
