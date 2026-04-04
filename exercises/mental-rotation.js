/* ==========================================================================
   Kenetik Circuit — Mental Rotation
   Rotate 3D shapes to determine if two objects are the same or mirror images.
   Domain: Spatial reasoning
   Score type: Accuracy
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { trials: 14, maxRotation: 90, shapeComplexity: 1 },
    2: { trials: 16, maxRotation: 135, shapeComplexity: 2 },
    3: { trials: 18, maxRotation: 180, shapeComplexity: 2 },
    4: { trials: 20, maxRotation: 270, shapeComplexity: 3 },
    5: { trials: 22, maxRotation: 360, shapeComplexity: 3 }
  };

  // Shape templates as SVG path segments
  var SHAPES = [
    // L-shape
    function(color) { return '<svg viewBox="0 0 80 80" width="100" height="100"><rect x="10" y="10" width="20" height="60" fill="' + color + '" rx="3"/><rect x="10" y="50" width="60" height="20" fill="' + color + '" rx="3"/></svg>'; },
    // T-shape
    function(color) { return '<svg viewBox="0 0 80 80" width="100" height="100"><rect x="10" y="10" width="60" height="20" fill="' + color + '" rx="3"/><rect x="30" y="10" width="20" height="60" fill="' + color + '" rx="3"/></svg>'; },
    // Z-shape
    function(color) { return '<svg viewBox="0 0 80 80" width="100" height="100"><rect x="10" y="10" width="40" height="20" fill="' + color + '" rx="3"/><rect x="30" y="30" width="20" height="20" fill="' + color + '" rx="3"/><rect x="30" y="40" width="40" height="20" fill="' + color + '" rx="3"/></svg>'; },
    // Plus shape
    function(color) { return '<svg viewBox="0 0 80 80" width="100" height="100"><rect x="30" y="10" width="20" height="60" fill="' + color + '" rx="3"/><rect x="10" y="30" width="60" height="20" fill="' + color + '" rx="3"/></svg>'; },
    // Arrow shape
    function(color) { return '<svg viewBox="0 0 80 80" width="100" height="100"><polygon points="40,5 70,35 55,35 55,75 25,75 25,35 10,35" fill="' + color + '"/></svg>'; }
  ];

  var COLORS = ['#E03D1A', '#269DD2', '#13286D', '#D01483', '#2D9D4E'];

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

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption">MENTAL ROTATION</span>' +
          '<span class="kc-caption" id="mr-progress">1 / ' + config.trials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 24px;">' +
          '<div class="kc-progress-bar__fill" id="mr-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 15px; color: var(--kc-text-muted); margin-bottom: 20px;">Are these the <strong>same shape</strong> or <strong>mirror images</strong>?</div>' +
        '<div id="mr-shapes" style="display: flex; gap: 32px; justify-content: center; align-items: center; margin-bottom: 32px; min-height: 150px;"></div>' +
        '<div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 16px;">' +
          '<button class="kc-response-btn" id="mr-same" style="padding: 16px 40px; background: var(--kc-blueberry); color: white; border-color: var(--kc-blueberry);">Same</button>' +
          '<button class="kc-response-btn" id="mr-mirror" style="padding: 16px 40px;">Mirror</button>' +
        '</div>' +
        '<div id="mr-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
        '<div class="kc-caption" style="margin-top: 8px;">Keys: <kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">S</kbd> same ' +
          '<kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">M</kbd> mirror</div>' +
      '</div>';

    document.getElementById('mr-same').addEventListener('click', function() { handleResponse(true); });
    document.getElementById('mr-mirror').addEventListener('click', function() { handleResponse(false); });
    document.addEventListener('keydown', keyHandler);
  }

  function keyHandler(e) {
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleResponse(true); }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); handleResponse(false); }
  }

  function presentTrial() {
    if (state.currentTrial >= config.trials) { finishGame(); return; }

    var progressEl = document.getElementById('mr-progress');
    var barEl = document.getElementById('mr-bar');
    var feedbackEl = document.getElementById('mr-feedback');
    var shapesEl = document.getElementById('mr-shapes');

    if (progressEl) progressEl.textContent = (state.currentTrial + 1) + ' / ' + config.trials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.trials) * 100) + '%';
    if (feedbackEl) feedbackEl.textContent = '';

    var shapeIdx = Math.floor(Math.random() * Math.min(SHAPES.length, config.shapeComplexity + 2));
    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    var rotation = Math.floor(Math.random() * (config.maxRotation / 45)) * 45;
    var isMirror = Math.random() < 0.5;

    state.currentAnswer = !isMirror; // same = true, mirror = false

    if (shapesEl) {
      var leftTransform = 'transform: rotate(0deg);';
      var rightTransform = 'transform: rotate(' + rotation + 'deg)' + (isMirror ? ' scaleX(-1)' : '') + ';';

      shapesEl.innerHTML =
        '<div style="padding: 16px; background: var(--kc-white); border: 1px solid var(--kc-border); border-radius: var(--kc-radius-lg); ' + leftTransform + '">' +
          SHAPES[shapeIdx](color) +
        '</div>' +
        '<div style="font-size: 24px; color: var(--kc-text-light);">↔</div>' +
        '<div style="padding: 16px; background: var(--kc-white); border: 1px solid var(--kc-border); border-radius: var(--kc-radius-lg); ' + rightTransform + '">' +
          SHAPES[shapeIdx](color) +
        '</div>';
    }

    state.trialStart = performance.now();
  }

  function handleResponse(saidSame) {
    var rt = performance.now() - state.trialStart;
    var correct = saidSame === state.currentAnswer;

    state.results.push({
      trial: state.currentTrial,
      correct: correct,
      isMirror: !state.currentAnswer,
      response: saidSame ? 'same' : 'mirror',
      rt: rt
    });

    var feedbackEl = document.getElementById('mr-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ Incorrect';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentTrial++;
    setTimeout(presentTrial, 500);
  }

  function finishGame() {
    document.removeEventListener('keydown', keyHandler);
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

  window.KCGames['mental-rotation'] = { init: init };
})();
