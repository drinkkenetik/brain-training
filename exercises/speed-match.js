/* ==========================================================================
   Kenetik Circuit — Speed Match
   "Does the current card match the previous one?" Yes/No as fast as possible.
   Domain: Processing speed + working memory
   Score type: Reaction time
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var SYMBOLS = ['◆', '★', '●', '▲', '■', '♦', '♣', '♠', '♥', '⬟', '⬡', '△'];
  var COLORS = ['#E03D1A', '#269DD2', '#2D9D4E', '#D01483', '#F06925', '#FBB11B', '#13286D'];

  var DIFFICULTY = {
    1: { totalTrials: 20, matchRatio: 0.4, symbolCount: 4, colorCount: 1 },
    2: { totalTrials: 24, matchRatio: 0.4, symbolCount: 5, colorCount: 1 },
    3: { totalTrials: 26, matchRatio: 0.45, symbolCount: 6, colorCount: 3 },
    4: { totalTrials: 28, matchRatio: 0.45, symbolCount: 7, colorCount: 4 },
    5: { totalTrials: 30, matchRatio: 0.5, symbolCount: 8, colorCount: 5 }
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
      cards: generateCards(),
      results: [],
      currentCard: 0,
      previousSymbol: null,
      previousColor: null,
      trialStart: 0,
      awaitingResponse: false
    };

    render();
    presentCard();
  }

  function generateCards() {
    var cards = [];
    var matchCount = Math.round(config.totalTrials * config.matchRatio);
    var symbols = SYMBOLS.slice(0, config.symbolCount);
    var colors = COLORS.slice(0, config.colorCount);

    // Generate match positions
    var matchPositions = {};
    while (Object.keys(matchPositions).length < matchCount) {
      var idx = 1 + Math.floor(Math.random() * (config.totalTrials - 1));
      matchPositions[idx] = true;
    }

    var prevSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    var prevColor = colors[Math.floor(Math.random() * colors.length)];
    cards.push({ symbol: prevSymbol, color: prevColor, isMatch: false });

    for (var i = 1; i < config.totalTrials; i++) {
      if (matchPositions[i]) {
        cards.push({ symbol: prevSymbol, color: prevColor, isMatch: true });
      } else {
        var newSymbol;
        do { newSymbol = symbols[Math.floor(Math.random() * symbols.length)]; }
        while (newSymbol === prevSymbol);
        var newColor = colors[Math.floor(Math.random() * colors.length)];
        cards.push({ symbol: newSymbol, color: newColor, isMatch: false });
        prevSymbol = newSymbol;
        prevColor = newColor;
      }
    }
    return cards;
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 24px;">' +
          '<span class="kc-caption">SPEED MATCH</span>' +
          '<span class="kc-caption" id="sm-progress">1 / ' + config.totalTrials + '</span>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 24px;">' +
          '<div class="kc-progress-bar__fill" id="sm-bar" style="width: 0%;"></div>' +
        '</div>' +
        '<div style="font-size: 15px; color: var(--kc-text-muted); margin-bottom: 16px;">Does this match the <strong>previous card</strong>?</div>' +
        '<div id="sm-card" style="width: 160px; height: 200px; margin: 0 auto 32px; background: var(--kc-white); border: 2px solid var(--kc-border); border-radius: var(--kc-radius-lg); display: flex; align-items: center; justify-content: center; font-size: 72px; box-shadow: var(--kc-shadow); transition: all 200ms ease;">' +
          '?' +
        '</div>' +
        '<div style="display: flex; gap: 16px; justify-content: center; margin-bottom: 16px;">' +
          '<button class="kc-response-btn" id="sm-yes" style="padding: 16px 48px; background: var(--kc-success); color: white; border-color: var(--kc-success); font-size: 18px;">Yes</button>' +
          '<button class="kc-response-btn" id="sm-no" style="padding: 16px 48px; font-size: 18px;">No</button>' +
        '</div>' +
        '<div id="sm-feedback" style="height: 24px; font-size: 14px; font-weight: 700;"></div>' +
        '<div class="kc-caption" style="margin-top: 8px;">Keys: <kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">Y</kbd> yes ' +
          '<kbd style="padding: 2px 6px; background: #f0ebe3; border: 1px solid var(--kc-border); border-radius: 4px; font-size: 11px;">N</kbd> no</div>' +
      '</div>';

    document.getElementById('sm-yes').addEventListener('click', function() { handleResponse(true); });
    document.getElementById('sm-no').addEventListener('click', function() { handleResponse(false); });
    document.addEventListener('keydown', keyHandler);
  }

  function keyHandler(e) {
    if (!state.awaitingResponse) return;
    if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); handleResponse(true); }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleResponse(false); }
  }

  function presentCard() {
    if (state.currentCard >= state.cards.length) { finishGame(); return; }

    var card = state.cards[state.currentCard];
    var cardEl = document.getElementById('sm-card');
    var progressEl = document.getElementById('sm-progress');
    var barEl = document.getElementById('sm-bar');
    var feedbackEl = document.getElementById('sm-feedback');

    if (progressEl) progressEl.textContent = (state.currentCard + 1) + ' / ' + config.totalTrials;
    if (barEl) barEl.style.width = ((state.currentCard / config.totalTrials) * 100) + '%';
    if (feedbackEl) feedbackEl.textContent = '';

    if (cardEl) {
      cardEl.style.opacity = '0';
      setTimeout(function() {
        cardEl.textContent = card.symbol;
        cardEl.style.color = card.color;
        cardEl.style.opacity = '1';
        state.trialStart = performance.now();
        state.awaitingResponse = true;
      }, 150);
    }
  }

  function handleResponse(saidYes) {
    if (!state.awaitingResponse) return;
    state.awaitingResponse = false;

    var rt = performance.now() - state.trialStart;
    var card = state.cards[state.currentCard];
    // First card can't be a match response
    var correct = state.currentCard === 0 ? !saidYes : (saidYes === card.isMatch);

    state.results.push({
      trial: state.currentCard,
      symbol: card.symbol,
      isMatch: card.isMatch,
      response: saidYes,
      correct: correct,
      rt: rt,
      normalizedRT: normalizeRT(rt)
    });

    var feedbackEl = document.getElementById('sm-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = correct ? '✓' : '✗';
      feedbackEl.style.color = correct ? 'var(--kc-success)' : 'var(--kc-error)';
    }

    state.currentCard++;
    setTimeout(presentCard, 300);
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

  window.KCGames['speed-match'] = { init: init };
})();
