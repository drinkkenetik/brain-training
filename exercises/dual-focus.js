/* ==========================================================================
   Kenetik Circuit — Dual Focus
   Track a moving object while answering rapid-fire questions about it.
   Domain: Divided attention
   Score type: Mixed (60% accuracy + 40% speed)
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { trials: 16, speed: 1.5, questionDelay: 2500, objectCount: 1 },
    2: { trials: 18, speed: 2.0, questionDelay: 2200, objectCount: 1 },
    3: { trials: 20, speed: 2.5, questionDelay: 2000, objectCount: 2 },
    4: { trials: 22, speed: 3.0, questionDelay: 1800, objectCount: 2 },
    5: { trials: 24, speed: 3.5, questionDelay: 1500, objectCount: 3 }
  };

  var OBJECT_COLORS = ['#E03D1A', '#269DD2', '#2D9D4E', '#D01483', '#FBB11B'];
  var OBJECT_SHAPES = ['circle', 'square', 'triangle'];

  var state, config, container, onComplete, normalizeRT, animFrame, questionTimer;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;
    normalizeRT = options.normalizeRT || function(rt) { return rt; };

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      objects: [],
      results: [],
      currentTrial: 0,
      questionActive: false,
      trialStart: 0,
      fieldWidth: 0,
      fieldHeight: 0
    };

    render();
    initObjects();
    startAnimation();
    scheduleQuestion();
  }

  function initObjects() {
    state.objects = [];
    for (var i = 0; i < config.objectCount; i++) {
      state.objects.push({
        x: 50 + Math.random() * 200,
        y: 50 + Math.random() * 200,
        vx: (Math.random() - 0.5) * config.speed * 2,
        vy: (Math.random() - 0.5) * config.speed * 2,
        color: OBJECT_COLORS[i % OBJECT_COLORS.length],
        shape: OBJECT_SHAPES[i % OBJECT_SHAPES.length],
        size: 30 + Math.floor(Math.random() * 20)
      });
    }
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 16px;">' +
          '<span class="kc-caption">DUAL FOCUS</span>' +
          '<span class="kc-caption" id="df-progress">0 / ' + config.trials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 16px;">' +
          '<div class="kc-progress-bar__fill" id="df-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 14px; color: var(--kc-text-muted); margin-bottom: 12px;">Track the objects. Answer questions about them.</div>' +
        '<div id="df-field" style="position: relative; width: 100%; height: 320px; background: var(--kc-white); border-radius: var(--kc-radius-lg); border: 1px solid var(--kc-border); overflow: hidden; margin-bottom: 16px;"></div>' +
        '<div id="df-question" style="min-height: 80px; margin-bottom: 8px;"></div>' +
        '<div id="df-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
      '</div>';

    var field = document.getElementById('df-field');
    if (field) {
      state.fieldWidth = field.offsetWidth;
      state.fieldHeight = field.offsetHeight;
    }
  }

  function startAnimation() {
    function animate() {
      var field = document.getElementById('df-field');
      if (!field) return;

      // Update positions
      state.objects.forEach(function(obj) {
        obj.x += obj.vx;
        obj.y += obj.vy;

        // Bounce off walls
        if (obj.x < 10 || obj.x > state.fieldWidth - obj.size - 10) obj.vx *= -1;
        if (obj.y < 10 || obj.y > state.fieldHeight - obj.size - 10) obj.vy *= -1;
        obj.x = Math.max(10, Math.min(state.fieldWidth - obj.size - 10, obj.x));
        obj.y = Math.max(10, Math.min(state.fieldHeight - obj.size - 10, obj.y));
      });

      // Render objects
      field.innerHTML = '';
      state.objects.forEach(function(obj) {
        var el = document.createElement('div');
        el.style.cssText = 'position:absolute;left:' + obj.x + 'px;top:' + obj.y + 'px;width:' + obj.size + 'px;height:' + obj.size + 'px;transition:none;';

        if (obj.shape === 'circle') {
          el.style.borderRadius = '50%';
          el.style.background = obj.color;
        } else if (obj.shape === 'square') {
          el.style.borderRadius = '4px';
          el.style.background = obj.color;
        } else if (obj.shape === 'triangle') {
          el.style.width = '0';
          el.style.height = '0';
          el.style.borderLeft = (obj.size / 2) + 'px solid transparent';
          el.style.borderRight = (obj.size / 2) + 'px solid transparent';
          el.style.borderBottom = obj.size + 'px solid ' + obj.color;
          el.style.background = 'none';
        }

        field.appendChild(el);
      });

      animFrame = requestAnimationFrame(animate);
    }
    animate();
  }

  function scheduleQuestion() {
    questionTimer = setTimeout(function() {
      if (state.currentTrial >= config.trials) { finishGame(); return; }
      askQuestion();
    }, config.questionDelay);
  }

  function askQuestion() {
    state.questionActive = true;
    var targetObj = state.objects[Math.floor(Math.random() * state.objects.length)];

    // Generate question about the tracked object
    var questionType = Math.floor(Math.random() * 3);
    var question, options, correctAnswer;

    if (questionType === 0) {
      // What color?
      question = 'What color is the ' + targetObj.shape + '?';
      correctAnswer = getColorName(targetObj.color);
      options = [correctAnswer];
      OBJECT_COLORS.forEach(function(c) {
        var name = getColorName(c);
        if (options.indexOf(name) === -1 && options.length < 3) options.push(name);
      });
    } else if (questionType === 1) {
      // What shape?
      question = 'What shape is the ' + getColorName(targetObj.color) + ' object?';
      correctAnswer = targetObj.shape;
      options = OBJECT_SHAPES.slice(0, 3);
    } else {
      // Position question
      var isLeft = targetObj.x < state.fieldWidth / 2;
      question = 'Is the ' + getColorName(targetObj.color) + ' ' + targetObj.shape + ' on the left or right?';
      correctAnswer = isLeft ? 'left' : 'right';
      options = ['left', 'right'];
    }

    // Shuffle options
    for (var i = options.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = options[i]; options[i] = options[j]; options[j] = tmp;
    }

    state.currentCorrectAnswer = correctAnswer;
    state.trialStart = performance.now();

    var questionEl = document.getElementById('df-question');
    if (questionEl) {
      questionEl.innerHTML =
        '<div style="font-size: 16px; font-weight: 500; color: var(--kc-blackberry); margin-bottom: 12px;">' + question + '</div>' +
        '<div style="display: flex; gap: 10px; justify-content: center;">' +
          options.map(function(opt) {
            return '<button class="kc-response-btn df-answer" data-answer="' + opt + '" style="padding: 10px 24px; text-transform: capitalize;">' + opt + '</button>';
          }).join('') +
        '</div>';

      questionEl.querySelectorAll('.df-answer').forEach(function(btn) {
        btn.addEventListener('click', function() {
          handleAnswer(btn.getAttribute('data-answer'));
        });
      });
    }
  }

  function getColorName(hex) {
    var map = { '#E03D1A': 'red', '#269DD2': 'blue', '#2D9D4E': 'green', '#D01483': 'pink', '#FBB11B': 'yellow' };
    return map[hex] || 'unknown';
  }

  function handleAnswer(answer) {
    if (!state.questionActive) return;
    state.questionActive = false;

    var rt = performance.now() - state.trialStart;
    var correct = answer === state.currentCorrectAnswer;

    state.results.push({
      trial: state.currentTrial,
      correct: correct,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('df-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓ Correct' : '✗ ' + state.currentCorrectAnswer;
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    // Clear question
    var questionEl = document.getElementById('df-question');
    if (questionEl) questionEl.innerHTML = '';

    state.currentTrial++;

    var progressEl = document.getElementById('df-progress');
    var barEl = document.getElementById('df-bar');
    if (progressEl) progressEl.textContent = state.currentTrial + ' / ' + config.trials;
    if (barEl) barEl.style.width = ((state.currentTrial / config.trials) * 100) + '%';

    if (state.currentTrial >= config.trials) {
      setTimeout(finishGame, 500);
    } else {
      scheduleQuestion();
    }
  }

  function finishGame() {
    cancelAnimationFrame(animFrame);
    clearTimeout(questionTimer);

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

  window.KCGames['dual-focus'] = { init: init };
})();
