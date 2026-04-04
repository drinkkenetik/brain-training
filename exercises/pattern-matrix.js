/* ==========================================================================
   Kenetik Circuit — Pattern Matrix
   Identify the missing piece in a visual pattern grid (Raven's-style).
   Domain: Spatial reasoning / pattern recognition
   Score type: Accuracy
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { trials: 10, gridSize: 2, optionCount: 3, patternTypes: 1 },
    2: { trials: 12, gridSize: 2, optionCount: 4, patternTypes: 2 },
    3: { trials: 14, gridSize: 3, optionCount: 4, patternTypes: 2 },
    4: { trials: 16, gridSize: 3, optionCount: 5, patternTypes: 3 },
    5: { trials: 18, gridSize: 3, optionCount: 6, patternTypes: 3 }
  };

  // Simple pattern generators
  var FILLS = ['#E03D1A', '#269DD2', '#2D9D4E', '#D01483', '#F06925', '#13286D'];
  var SHAPES_FN = {
    circle: function(fill, size) { return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + fill + ';"></div>'; },
    square: function(fill, size) { return '<div style="width:' + size + 'px;height:' + size + 'px;background:' + fill + ';border-radius:3px;"></div>'; },
    triangle: function(fill, size) { return '<div style="width:0;height:0;border-left:' + (size/2) + 'px solid transparent;border-right:' + (size/2) + 'px solid transparent;border-bottom:' + size + 'px solid ' + fill + ';"></div>'; },
    diamond: function(fill, size) { return '<div style="width:' + (size*0.7) + 'px;height:' + (size*0.7) + 'px;background:' + fill + ';transform:rotate(45deg);border-radius:2px;"></div>'; }
  };
  var SHAPE_KEYS = Object.keys(SHAPES_FN);

  var state, config, container, onComplete;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = { results: [], currentTrial: 0 };
    render();
    presentTrial();
  }

  function generatePattern(gridSize) {
    // Create a pattern rule: each row/col follows a progression
    var pattern = [];
    var ruleType = Math.floor(Math.random() * 3); // 0=color progression, 1=shape progression, 2=size progression

    var baseShapeIdx = Math.floor(Math.random() * SHAPE_KEYS.length);
    var baseColorIdx = Math.floor(Math.random() * FILLS.length);

    for (var r = 0; r < gridSize; r++) {
      pattern[r] = [];
      for (var c = 0; c < gridSize; c++) {
        var shapeIdx, colorIdx, size;

        if (ruleType === 0) {
          // Color changes across columns
          shapeIdx = baseShapeIdx;
          colorIdx = (baseColorIdx + c) % FILLS.length;
          size = 32;
        } else if (ruleType === 1) {
          // Shape changes across rows
          shapeIdx = (baseShapeIdx + r) % SHAPE_KEYS.length;
          colorIdx = (baseColorIdx + c) % FILLS.length;
          size = 32;
        } else {
          // Size changes across rows
          shapeIdx = (baseShapeIdx + c) % SHAPE_KEYS.length;
          colorIdx = baseColorIdx;
          size = 20 + (r * 8);
        }

        pattern[r][c] = {
          shape: SHAPE_KEYS[shapeIdx],
          color: FILLS[colorIdx],
          size: size
        };
      }
    }
    return pattern;
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption">PATTERN MATRIX</span>' +
          '<span class="kc-caption" id="pm-progress">1 / ' + config.trials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 24px;">' +
          '<div class="kc-progress-bar__fill" id="pm-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 15px; color: var(--kc-text-muted); margin-bottom: 20px;">Which piece completes the pattern?</div>' +
        '<div id="pm-grid" style="display: inline-grid; gap: 4px; margin-bottom: 24px; background: var(--kc-border); padding: 4px; border-radius: var(--kc-radius-lg);"></div>' +
        '<div id="pm-options" style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;"></div>' +
        '<div id="pm-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
      '</div>';
  }

  function presentTrial() {
    if (state.currentTrial >= config.trials) { finishGame(); return; }

    var progressEl = document.getElementById('pm-progress');
    var barEl = document.getElementById('pm-bar');
    var feedbackEl = document.getElementById('pm-feedback');
    var gridEl = document.getElementById('pm-grid');
    var optionsEl = document.getElementById('pm-options');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.trials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.trials) * 100) + '%';
    if (feedbackEl) feedbackEl.textContent = '';

    var pattern = generatePattern(config.gridSize);
    var missingR = config.gridSize - 1;
    var missingC = config.gridSize - 1;
    var correctPiece = pattern[missingR][missingC];

    // Render grid
    if (gridEl) {
      gridEl.style.gridTemplateColumns = 'repeat(' + config.gridSize + ', 70px)';
      gridEl.innerHTML = '';
      for (var r = 0; r < config.gridSize; r++) {
        for (var c = 0; c < config.gridSize; c++) {
          var cell = document.createElement('div');
          cell.style.cssText = 'width:70px;height:70px;background:var(--kc-white);border-radius:4px;display:flex;align-items:center;justify-content:center;';
          if (r === missingR && c === missingC) {
            cell.innerHTML = '<span style="font-size:24px;color:var(--kc-text-light);">?</span>';
          } else {
            var p = pattern[r][c];
            cell.innerHTML = SHAPES_FN[p.shape](p.color, p.size);
          }
          gridEl.appendChild(cell);
        }
      }
    }

    // Generate options (correct + distractors)
    var options = [{ piece: correctPiece, correct: true }];
    for (var i = 1; i < config.optionCount; i++) {
      var distractor = {
        shape: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)],
        color: FILLS[Math.floor(Math.random() * FILLS.length)],
        size: correctPiece.size + (Math.random() > 0.5 ? 6 : -6)
      };
      // Make sure distractor differs from correct
      if (distractor.shape === correctPiece.shape && distractor.color === correctPiece.color) {
        distractor.color = FILLS[(FILLS.indexOf(correctPiece.color) + 1) % FILLS.length];
      }
      options.push({ piece: distractor, correct: false });
    }

    // Shuffle options
    for (var k = options.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = options[k]; options[k] = options[j]; options[j] = tmp;
    }

    // Render options
    if (optionsEl) {
      optionsEl.innerHTML = '';
      options.forEach(function(opt) {
        var btn = document.createElement('div');
        btn.style.cssText = 'width:60px;height:60px;background:var(--kc-white);border:2px solid var(--kc-border);border-radius:var(--kc-radius);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 150ms ease;';
        btn.innerHTML = SHAPES_FN[opt.piece.shape](opt.piece.color, opt.piece.size);
        btn.addEventListener('mouseenter', function() { btn.style.borderColor = 'var(--kc-strawberry)'; });
        btn.addEventListener('mouseleave', function() { btn.style.borderColor = 'var(--kc-border)'; });
        btn.addEventListener('click', function() { handleResponse(opt.correct); });
        optionsEl.appendChild(btn);
      });
    }

    state.trialStart = performance.now();
  }

  function handleResponse(correct) {
    var rt = performance.now() - state.trialStart;

    state.results.push({
      trial: state.currentTrial,
      correct: correct,
      rt: rt
    });

    var feedbackEl = document.getElementById('pm-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ Incorrect';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;
    setTimeout(presentTrial, 500);
  }

  function finishGame() {
    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: 0,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: state.results.map(function(r) { return r.correct ? 1 : 0; }),
      completed: true
    });
  }

  window.KCGames['pattern-matrix'] = { init: init };
})();
