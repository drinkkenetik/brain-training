/* ==========================================================================
   Kenetik Circuit — Trail Connect
   Connect dots in alternating numerical/alphabetical order (1-A-2-B-3-C...).
   Domain: Processing speed + cognitive flexibility
   Score type: Reaction time
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { nodeCount: 8, timeLimit: 60 },   // 1-A-2-B-3-C-4-D
    2: { nodeCount: 10, timeLimit: 60 },
    3: { nodeCount: 12, timeLimit: 75 },
    4: { nodeCount: 16, timeLimit: 75 },
    5: { nodeCount: 20, timeLimit: 90 }
  };

  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  var state, config, container, onComplete, normalizeRT, timerInterval;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;
    normalizeRT = options.normalizeRT || function(rt) { return rt; };

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      nodes: [],
      sequence: [], // correct order: 1, A, 2, B, 3, C...
      currentIndex: 0,
      errors: 0,
      times: [],
      segmentStart: 0,
      timeLeft: config.timeLimit,
      completed: false
    };

    generateNodes();
    render();
    startTimer();
  }

  function generateNodes() {
    var halfCount = config.nodeCount / 2;
    state.sequence = [];

    // Build correct sequence: 1, A, 2, B, 3, C...
    for (var i = 0; i < halfCount; i++) {
      state.sequence.push({ label: String(i + 1), type: 'number' });
      state.sequence.push({ label: LETTERS[i], type: 'letter' });
    }

    // Generate random positions
    var positions = [];
    var fieldW = 520;
    var fieldH = 380;
    var padding = 30;
    var minDist = 55;

    for (var j = 0; j < state.sequence.length; j++) {
      var attempts = 0;
      var x, y, valid;
      do {
        x = padding + Math.floor(Math.random() * (fieldW - padding * 2));
        y = padding + Math.floor(Math.random() * (fieldH - padding * 2));
        valid = true;
        for (var k = 0; k < positions.length; k++) {
          var dx = x - positions[k].x;
          var dy = y - positions[k].y;
          if (Math.sqrt(dx * dx + dy * dy) < minDist) { valid = false; break; }
        }
        attempts++;
      } while (!valid && attempts < 200);
      positions.push({ x: x, y: y });
    }

    state.nodes = state.sequence.map(function(s, i) {
      return {
        label: s.label,
        type: s.type,
        x: positions[i].x,
        y: positions[i].y,
        visited: false
      };
    });
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
          '<div><span class="kc-caption">TIME</span> <span id="tc-timer" style="font-family: var(--kc-font-heading); font-size: 24px; font-weight: 500;">' + config.timeLimit + '</span></div>' +
          '<span class="kc-caption" id="tc-next">Next: <strong>1</strong></span>' +
          '<div><span class="kc-caption">ERRORS</span> <span id="tc-errors" style="font-family: var(--kc-font-heading); font-size: 24px; font-weight: 500;">0</span></div>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 12px;">' +
          '<div class="kc-progress-bar__fill" id="tc-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 13px; color: var(--kc-text-muted); margin-bottom: 12px;">Connect: 1 → A → 2 → B → 3 → C...</div>' +
        '<div id="tc-field" style="position: relative; width: 100%; height: 380px; background: var(--kc-white); border-radius: var(--kc-radius-lg); border: 1px solid var(--kc-border); overflow: hidden;">' +
          '<svg id="tc-lines" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></svg>' +
        '</div>' +
        '<div id="tc-feedback" style="height: 24px; font-size: 14px; font-weight: 700; margin-top: 8px;"></div>' +
      '</div>';

    renderNodes();
    state.segmentStart = performance.now();
  }

  function renderNodes() {
    var field = document.getElementById('tc-field');
    if (!field) return;

    // Remove old node elements (keep SVG)
    var oldNodes = field.querySelectorAll('.tc-node');
    oldNodes.forEach(function(n) { n.remove(); });

    state.nodes.forEach(function(node, i) {
      var el = document.createElement('div');
      el.className = 'tc-node';
      el.setAttribute('data-index', i);
      var isNumber = node.type === 'number';
      var visited = node.visited;
      var isCurrent = i === state.currentIndex;

      el.style.cssText =
        'position: absolute; left: ' + (node.x - 20) + 'px; top: ' + (node.y - 20) + 'px; ' +
        'width: 40px; height: 40px; border-radius: 50%; ' +
        'display: flex; align-items: center; justify-content: center; ' +
        'font-family: var(--kc-font-heading); font-size: 16px; font-weight: 700; ' +
        'cursor: pointer; transition: all 150ms ease; user-select: none; -webkit-tap-highlight-color: transparent; ' +
        'background: ' + (visited ? 'var(--kc-success)' : (isNumber ? 'var(--kc-blackberry)' : 'var(--kc-warm-white)')) + '; ' +
        'color: ' + (visited ? 'white' : (isNumber ? 'white' : 'var(--kc-blackberry)')) + '; ' +
        'border: 2px solid ' + (visited ? 'var(--kc-success)' : (isCurrent ? 'var(--kc-pineapple)' : (isNumber ? 'var(--kc-blackberry)' : 'var(--kc-border)'))) + '; ' +
        (isCurrent ? 'box-shadow: 0 0 0 3px rgba(251, 177, 27, 0.3);' : '');

      el.textContent = node.label;
      el.addEventListener('click', function() { handleNodeClick(i); });
      field.appendChild(el);
    });
  }

  function startTimer() {
    timerInterval = setInterval(function() {
      state.timeLeft--;
      var timerEl = document.getElementById('tc-timer');
      if (timerEl) {
        timerEl.textContent = state.timeLeft;
        if (state.timeLeft <= 10) timerEl.style.color = 'var(--kc-strawberry)';
      }
      if (state.timeLeft <= 0) {
        clearInterval(timerInterval);
        finishGame();
      }
    }, 1000);
  }

  function handleNodeClick(index) {
    if (state.completed) return;

    if (index === state.currentIndex) {
      // Correct!
      var now = performance.now();
      var segmentTime = now - state.segmentStart;
      state.times.push(normalizeRT(segmentTime));
      state.segmentStart = now;

      state.nodes[index].visited = true;
      state.currentIndex++;

      // Draw line to this node from previous
      if (index > 0) {
        var prev = state.nodes[index - 1];
        var curr = state.nodes[index];
        var svg = document.getElementById('tc-lines');
        if (svg) {
          var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', prev.x);
          line.setAttribute('y1', prev.y);
          line.setAttribute('x2', curr.x);
          line.setAttribute('y2', curr.y);
          line.setAttribute('stroke', '#2D9D4E');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('stroke-linecap', 'round');
          svg.appendChild(line);
        }
      }

      // Update progress
      var barEl = document.getElementById('tc-bar');
      if (barEl) barEl.style.width = ((state.currentIndex / state.nodes.length) * 100) + '%';

      var nextEl = document.getElementById('tc-next');
      if (nextEl) {
        if (state.currentIndex < state.nodes.length) {
          nextEl.innerHTML = 'Next: <strong>' + state.nodes[state.currentIndex].label + '</strong>';
        } else {
          nextEl.innerHTML = '<strong>Done!</strong>';
        }
      }

      renderNodes();

      if (state.currentIndex >= state.nodes.length) {
        state.completed = true;
        clearInterval(timerInterval);
        var feedbackEl = document.getElementById('tc-feedback');
        if (feedbackEl) {
          feedbackEl.textContent = '✓ Complete!';
          feedbackEl.style.color = 'var(--kc-success)';
        }
        setTimeout(finishGame, 800);
      }
    } else {
      // Error
      state.errors++;
      var errorsEl = document.getElementById('tc-errors');
      if (errorsEl) errorsEl.textContent = state.errors;

      var feedbackEl = document.getElementById('tc-feedback');
      if (feedbackEl) {
        feedbackEl.textContent = '✗ Wrong — find ' + state.nodes[state.currentIndex].label;
        feedbackEl.style.color = 'var(--kc-error)';
        setTimeout(function() { if (feedbackEl) feedbackEl.textContent = ''; }, 1000);
      }
    }
  }

  function finishGame() {
    clearInterval(timerInterval);

    var totalNodes = state.nodes.length;
    var nodesCompleted = state.currentIndex;
    var accuracy = (nodesCompleted / totalNodes) * 100;
    var avgRT = state.times.length > 0 ? state.times.reduce(function(a, b) { return a + b; }, 0) / state.times.length : 999;

    // Penalize errors
    var adjustedAccuracy = Math.max(0, accuracy - (state.errors * 3));

    onComplete({
      score: Math.round(adjustedAccuracy),
      accuracy: adjustedAccuracy,
      avgRT: avgRT,
      nodesCompleted: nodesCompleted,
      totalNodes: totalNodes,
      errors: state.errors,
      timeRemaining: state.timeLeft,
      difficulty: config.level,
      trialAccuracies: state.times.map(function() { return 1; }),
      completed: state.completed
    });
  }

  window.KCGames['trail-connect'] = { init: init };
})();
