/* ==========================================================================
   Kenetik Circuit — Sequence Memory
   Remember and reproduce increasingly long sequences (Simon-style).
   Domain: Short-term memory
   Score type: Accuracy
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var PAD_COLORS = [
    { id: 0, color: '#E03D1A', light: '#F06925', label: 'Red' },
    { id: 1, color: '#269DD2', light: '#7CC4E8', label: 'Blue' },
    { id: 2, color: '#2D9D4E', light: '#6FCF8B', label: 'Green' },
    { id: 3, color: '#FBB11B', light: '#FCCF5C', label: 'Yellow' }
  ];

  var DIFFICULTY = {
    1: { startLength: 3, maxLength: 7, displaySpeed: 800 },
    2: { startLength: 3, maxLength: 8, displaySpeed: 700 },
    3: { startLength: 4, maxLength: 9, displaySpeed: 600 },
    4: { startLength: 4, maxLength: 10, displaySpeed: 500 },
    5: { startLength: 5, maxLength: 12, displaySpeed: 400 }
  };

  var state, config, container, onComplete;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      sequence: [],
      playerInput: [],
      currentLength: config.startLength,
      round: 0,
      maxRounds: 10,
      results: [],
      inputEnabled: false,
      showingSequence: false
    };

    render();
    nextRound();
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 400px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption">SEQUENCE: <strong id="seq-len">' + config.startLength + '</strong></span>' +
          '<span class="kc-caption" id="seq-progress">Round 1</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 24px;">' +
          '<div class="kc-progress-bar__fill" id="seq-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div id="seq-status" style="font-size: 16px; font-weight: 500; color: var(--kc-blackberry); margin-bottom: 24px;">Watch the sequence...</div>' +
        '<div id="seq-pads" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 280px; margin: 0 auto 24px;">' +
          PAD_COLORS.map(function(pad) {
            return '<div class="seq-pad" data-pad="' + pad.id + '" style="' +
              'width: 100%; aspect-ratio: 1; background: ' + pad.color + '; border-radius: var(--kc-radius-lg); ' +
              'cursor: pointer; opacity: 0.6; transition: all 150ms ease; display: flex; align-items: center; justify-content: center; ' +
              'font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.5); user-select: none; -webkit-tap-highlight-color: transparent; min-height: 100px;">' +
              pad.label + '</div>';
          }).join('') +
        '</div>' +
        '<div id="seq-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
      '</div>';

    // Click handlers
    container.querySelectorAll('.seq-pad').forEach(function(pad) {
      pad.addEventListener('click', function() {
        handlePadClick(parseInt(pad.getAttribute('data-pad')));
      });
    });
  }

  function flashPad(padId, duration) {
    var pad = container.querySelector('[data-pad="' + padId + '"]');
    if (!pad) return;
    var color = PAD_COLORS[padId];
    pad.style.opacity = '1';
    pad.style.background = color.light;
    pad.style.transform = 'scale(1.05)';
    setTimeout(function() {
      pad.style.opacity = '0.6';
      pad.style.background = color.color;
      pad.style.transform = 'scale(1)';
    }, duration * 0.6);
  }

  function nextRound() {
    if (state.round >= state.maxRounds) { finishGame(); return; }

    state.inputEnabled = false;
    state.showingSequence = true;
    state.playerInput = [];

    // Generate sequence
    state.sequence = [];
    for (var i = 0; i < state.currentLength; i++) {
      state.sequence.push(Math.floor(Math.random() * PAD_COLORS.length));
    }

    var progressEl = document.getElementById('seq-progress');
    var barEl = document.getElementById('seq-bar');
    var statusEl = document.getElementById('seq-status');
    var lenEl = document.getElementById('seq-len');

    if (progressEl) progressEl.textContent = 'Round ' + (state.round + 1);
    if (barEl) barEl.style.width = ((state.round / state.maxRounds) * 100) + '%';
    if (statusEl) statusEl.textContent = 'Watch the sequence...';
    if (lenEl) lenEl.textContent = state.currentLength;

    // Play sequence
    var delay = 500;
    state.sequence.forEach(function(padId, idx) {
      setTimeout(function() {
        flashPad(padId, config.displaySpeed);
      }, delay + (idx * config.displaySpeed));
    });

    // Enable input after sequence finishes
    setTimeout(function() {
      state.showingSequence = false;
      state.inputEnabled = true;
      if (statusEl) statusEl.textContent = 'Your turn — repeat the sequence';
    }, delay + (state.sequence.length * config.displaySpeed) + 200);
  }

  function handlePadClick(padId) {
    if (!state.inputEnabled || state.showingSequence) return;

    flashPad(padId, 200);
    state.playerInput.push(padId);

    var idx = state.playerInput.length - 1;
    var correct = state.playerInput[idx] === state.sequence[idx];

    if (!correct) {
      // Wrong — round failed
      state.results.push({ round: state.round, length: state.currentLength, correct: false });
      state.inputEnabled = false;

      var feedbackEl = document.getElementById('seq-feedback');
      if (feedbackEl) {
        feedbackEl.textContent = '✗ Wrong sequence';
        feedbackEl.style.color = 'var(--kc-error)';
      }

      // Don't increase length on failure
      state.round++;
      setTimeout(nextRound, 800);
      return;
    }

    if (state.playerInput.length === state.sequence.length) {
      // Completed sequence correctly
      state.results.push({ round: state.round, length: state.currentLength, correct: true });
      state.inputEnabled = false;

      var feedbackEl2 = document.getElementById('seq-feedback');
      if (feedbackEl2) {
        feedbackEl2.textContent = '✓ Correct!';
        feedbackEl2.style.color = 'var(--kc-success)';
      }

      // Increase length for next round
      if (state.currentLength < config.maxLength) state.currentLength++;
      state.round++;
      setTimeout(nextRound, 800);
    }
  }

  function finishGame() {
    var correct = state.results.filter(function(r) { return r.correct; });
    var accuracy = (correct.length / state.results.length) * 100;
    var maxSequence = 0;
    correct.forEach(function(r) { if (r.length > maxSequence) maxSequence = r.length; });

    onComplete({
      score: Math.round(accuracy),
      accuracy: accuracy,
      avgRT: 0,
      maxSequenceLength: maxSequence,
      totalTrials: state.results.length,
      correctTrials: correct.length,
      difficulty: config.level,
      trialAccuracies: state.results.map(function(r) { return r.correct ? 1 : 0; }),
      completed: true
    });
  }

  window.KCGames['sequence-memory'] = { init: init };
})();
