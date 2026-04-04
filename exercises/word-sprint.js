/* ==========================================================================
   Kenetik Circuit — Word Sprint
   Generate words from a set of letters before time runs out.
   Domain: Language processing + executive function
   Score type: Mixed (60% accuracy + 40% speed)
   ========================================================================== */

(function() {
  'use strict';

  window.KCGames = window.KCGames || {};

  var DIFFICULTY = {
    1: { duration: 60, letterCount: 6, minWordLength: 3 },
    2: { duration: 60, letterCount: 7, minWordLength: 3 },
    3: { duration: 75, letterCount: 7, minWordLength: 3 },
    4: { duration: 75, letterCount: 8, minWordLength: 4 },
    5: { duration: 60, letterCount: 8, minWordLength: 4 }
  };

  // Common letter distributions for generating solvable letter sets
  var VOWELS = 'AEIOU';
  var CONSONANTS = 'BCDFGHLMNPRST';

  // Simple word list for validation (common 3-6 letter words)
  var WORDS = new Set([
    'the','and','for','are','but','not','you','all','her','was','one','our','out','has','his',
    'how','man','new','now','old','see','way','who','boy','did','get','let','say','she','too',
    'use','act','add','age','ago','air','art','ask','ate','bad','bag','bar','bat','bed','big',
    'bit','box','bus','buy','can','cap','car','cat','cup','cut','dad','day','did','dog','dot',
    'dry','ear','eat','egg','end','eye','fan','far','fat','few','fit','fly','fun','gap','gas',
    'god','got','gun','gut','guy','had','hat','her','him','hit','hot','ice','ill','its','job',
    'joy','key','kid','kit','lab','law','lay','led','leg','let','lie','lip','log','lot','low',
    'map','may','men','met','mix','mom','mud','net','nor','not','now','nut','odd','off','oil',
    'old','one','our','out','own','pan','pay','pen','per','pet','pin','pit','pop','pot','pub',
    'pull','push','put','ran','rat','raw','red','rid','rip','rod','row','run','sad','sat','set',
    'ship','shot','shut','side','sign','site','size','slip','slow','snow','soft','soil','sold',
    'some','song','soon','sort','spot','star','stay','step','stop','such','sure','swim','tail',
    'take','talk','tall','tank','tape','task','team','tell','term','test','text','than','that',
    'them','then','they','thin','this','thus','tied','till','time','tiny','told','tone','took',
    'tool','tops','tore','torn','tour','town','trap','tree','trim','trip','true','tube','tune',
    'turn','twin','type','unit','upon','used','user','vast','very','vote','wage','wait','wake',
    'walk','wall','want','warm','warn','wash','wave','weak','wear','week','well','went','were',
    'west','what','when','whom','wide','wife','wild','will','wind','wine','wing','wire','wise',
    'wish','with','wood','word','wore','work','worm','worn','wrap','yard','year','zone',
    'able','back','band','bank','bare','barn','base','bath','bean','bear','beat','been','bell',
    'belt','bend','best','bike','bill','bind','bird','bite','blow','blue','boat','body','bold',
    'bomb','bond','bone','book','boot','bore','born','boss','both','bowl','burn','busy','cafe',
    'cage','cake','call','calm','came','camp','card','care','case','cash','cast','cave','chat',
    'chip','cite','city','clan','clap','clay','clip','club','clue','coal','coat','code','coin',
    'cold','cole','come','cook','cool','cope','copy','core','corn','cost','crew','crop','dare',
    'dark','data','date','dawn','dead','deaf','deal','dear','debt','deck','deep','deer','dial',
    'dice','diet','dirt','dish','disk','dock','does','dome','done','door','dose','down','drag',
    'draw','drew','drop','drug','drum','dual','dull','dumb','dump','dust','duty','each','earn',
    'ease','east','easy','edge','else','even','ever','evil','exam','exit','face','fact','fade',
    'fail','fair','fake','fall','fame','fare','farm','fast','fate','fear','feed','feel','feet',
    'fell','felt','file','fill','film','find','fine','fire','firm','fish','fist','five','flag',
    'flame','flat','fled','flew','flip','flow','fold','folk','fond','font','food','fool','foot',
    'ford','fore','fork','form','fort','foul','four','free','from','fuel','full','fund','fury',
    'fuse','gain','game','gang','gave','gear','gene','gift','girl','give','glad','glow','glue',
    'goal','goes','gold','golf','gone','good','grab','gray','grew','grey','grid','grin','grip',
    'grow','gulf','hair','half','hall','halt','hand','hang','hard','harm','hate','haul','have',
    'head','heal','heap','hear','heat','heel','held','help','here','hero','hide','high','hike',
    'hill','hint','hire','hold','hole','holy','home','hood','hook','hope','horn','host','hour',
    'huge','hung','hunt','hurt','idea','inch','into','iron','item','jack','jail','joke','jump',
    'june','jury','just','keen','keep','kept','kick','kill','kind','king','kiss','knee','knew',
    'knit','knot','know','lack','laid','lake','lamp','land','lane','last','late','lawn','lead',
    'leaf','lean','leap','left','lend','lens','less','lied','life','lift','like','limb','lime',
    'limp','line','link','lion','list','live','load','loan','lock','lone','long','look','loop',
    'lord','lose','loss','lost','lots','loud','love','luck','lung','made','mail','main','make',
    'male','mall','mark','mask','mass','mate','meal','mean','meat','meet','melt','mild','mile',
    'milk','mill','mind','mine','miss','mode','mood','moon','more','most','move','much','must',
    'myth','nail','name','navy','near','neat','neck','need','news','next','nice','nine','node',
    'none','noon','norm','nose','note','noun','odds','once','only','onto','open','oral','ours',
    'pace','pack','page','paid','pain','pair','pale','palm','park','part','pass','past','path',
    'peak','peer','pick','pile','pine','pink','pipe','plan','play','plea','plot','plug','plus',
    'poem','poet','pole','poll','pond','pool','poor','pope','pork','port','pose','post','pour',
    'pray','pure','push','race','rack','rage','raid','rail','rain','rank','rare','rate','read',
    'real','rear','rely','rent','rest','rice','rich','ride','ring','rise','risk','road','rock',
    'role','roll','roof','room','root','rope','rose','ruin','rule','rush','safe','said','sake',
    'sale','salt','same','sand','sang','save','scan','seal','seat','seed','seek','seem','seen',
    'self','sell','send','sent','shed','ship','shop','show','shut','sick','side','sigh','sign',
    'silk','sing','sink','site','size','skin','slam','slid','slim','slip','slot','slow','snap',
    'snow','soak','sock','sofa','soil','sole','solo','some','soon','soul','spin','spit','spot',
    'star','stay','stem','step','stir','stop','such','suit','sure','swim','tail','take','tale',
    'talk','tall','tank','tape','tear','tell','tend','tent','term','test','text','than','that',
    'thee','them','then','they','thin','this','thus','tide','till','time','tiny','tire','toad',
    'told','toll','tone','took','tool','tops','tore','torn','toss','tour','town','trap','tray',
    'tree','trim','trio','trip','true','tube','tuck','tune','turn','twin','type','ugly','unit',
    'upon','urge','used','user','vale','vary','vast','verb','very','view','vine','visa','void',
    'volt','vote','wade','wage','wait','wake','walk','wall','ward','warm','warn','wary','wash',
    'vast','wave','weak','wear','weed','week','well','went','were','west','what','when','wide',
    'wife','wild','will','wind','wine','wing','wipe','wire','wise','wish','with','woke','wolf',
    'wood','wool','word','wore','work','worm','worn','wrap','writ','yard','yarn','yeah','year',
    'yell','your','zero','zone'
  ]);

  var state, config, container, onComplete, timerInterval;

  function init(area, options) {
    container = area;
    onComplete = options.onComplete;

    var level = options.difficulty || 1;
    config = DIFFICULTY[level] || DIFFICULTY[1];
    config.level = level;

    state = {
      letters: generateLetters(),
      wordsFound: [],
      timeLeft: config.duration,
      currentInput: ''
    };

    render();
    startTimer();
  }

  function generateLetters() {
    var letters = [];
    // Ensure at least 2 vowels
    var vowelCount = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < vowelCount; i++) {
      letters.push(VOWELS[Math.floor(Math.random() * VOWELS.length)]);
    }
    for (var j = vowelCount; j < config.letterCount; j++) {
      letters.push(CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)]);
    }
    // Shuffle
    for (var k = letters.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = letters[k]; letters[k] = letters[r]; letters[r] = tmp;
    }
    return letters;
  }

  function render() {
    container.innerHTML =
      '<div style="width: 100%; max-width: 560px; text-align: center;">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">' +
          '<div><span class="kc-caption">TIME</span> <span id="ws-timer" style="font-family: var(--kc-font-heading); font-size: 28px; font-weight: 500;">' + config.duration + '</span></div>' +
          '<div><span class="kc-caption">WORDS</span> <span id="ws-count" style="font-family: var(--kc-font-heading); font-size: 28px; font-weight: 500;">0</span></div>' +
        '</div>' +
        '<div class="kc-progress-bar" style="margin-bottom: 24px;">' +
          '<div class="kc-progress-bar__fill" id="ws-timer-bar" style="width: 100%;"></div>' +
        '</div>' +
        '<div style="font-size: 15px; color: var(--kc-text-muted); margin-bottom: 16px;">Make words from these letters. Longer words = more points.</div>' +
        '<div id="ws-letters" style="display: flex; gap: 8px; justify-content: center; margin-bottom: 24px;">' +
          state.letters.map(function(l) {
            return '<div style="width: 48px; height: 48px; background: var(--kc-blackberry); color: white; border-radius: var(--kc-radius); display: flex; align-items: center; justify-content: center; font-family: var(--kc-font-heading); font-size: 22px; font-weight: 700;">' + l + '</div>';
          }).join('') +
        '</div>' +
        '<div style="display: flex; gap: 8px; max-width: 360px; margin: 0 auto 16px;">' +
          '<input type="text" id="ws-input" placeholder="Type a word..." autocomplete="off" autocapitalize="off" style="flex: 1; padding: 12px 16px; border: 2px solid var(--kc-border); border-radius: var(--kc-radius-pill); font-family: var(--kc-font-body); font-size: 16px; text-transform: uppercase; outline: none;" />' +
          '<button class="kc-btn kc-btn--primary" id="ws-submit" style="padding: 12px 24px;">Go</button>' +
        '</div>' +
        '<div id="ws-feedback" style="height: 24px; font-size: 14px; font-weight: 700; margin-bottom: 16px;"></div>' +
        '<div id="ws-found" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;"></div>' +
      '</div>';

    var input = document.getElementById('ws-input');
    var submitBtn = document.getElementById('ws-submit');

    input.focus();

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitWord();
      }
    });

    submitBtn.addEventListener('click', submitWord);
  }

  function startTimer() {
    timerInterval = setInterval(function() {
      state.timeLeft--;
      var timerEl = document.getElementById('ws-timer');
      var barEl = document.getElementById('ws-timer-bar');
      if (timerEl) {
        timerEl.textContent = state.timeLeft;
        if (state.timeLeft <= 10) timerEl.style.color = 'var(--kc-strawberry)';
      }
      if (barEl) barEl.style.width = ((state.timeLeft / config.duration) * 100) + '%';
      if (state.timeLeft <= 0) {
        clearInterval(timerInterval);
        finishGame();
      }
    }, 1000);
  }

  function submitWord() {
    var input = document.getElementById('ws-input');
    var word = input.value.trim().toLowerCase();
    input.value = '';
    input.focus();

    if (word.length < config.minWordLength) {
      showFeedback('Too short (min ' + config.minWordLength + ' letters)', false);
      return;
    }

    // Check if word uses only available letters
    var availableLetters = state.letters.map(function(l) { return l.toLowerCase(); });
    var letterPool = availableLetters.slice();
    for (var i = 0; i < word.length; i++) {
      var idx = letterPool.indexOf(word[i]);
      if (idx === -1) {
        showFeedback('Letter "' + word[i].toUpperCase() + '" not available', false);
        return;
      }
      letterPool.splice(idx, 1);
    }

    // Check if already found
    if (state.wordsFound.indexOf(word) !== -1) {
      showFeedback('Already found!', false);
      return;
    }

    // Check if valid word
    if (!WORDS.has(word)) {
      showFeedback('Not a recognized word', false);
      return;
    }

    // Valid word!
    state.wordsFound.push(word);
    var points = word.length; // Longer words = more points
    showFeedback('✓ ' + word.toUpperCase() + ' (+' + points + ')', true);

    // Update found words display
    var countEl = document.getElementById('ws-count');
    if (countEl) countEl.textContent = state.wordsFound.length;

    var foundEl = document.getElementById('ws-found');
    if (foundEl) {
      var tag = document.createElement('span');
      tag.style.cssText = 'padding: 4px 12px; background: var(--kc-bg-panel); border-radius: var(--kc-radius-pill); font-size: 13px; font-weight: 500; text-transform: uppercase;';
      tag.textContent = word;
      foundEl.appendChild(tag);
    }
  }

  function showFeedback(msg, success) {
    var el = document.getElementById('ws-feedback');
    if (el) {
      el.textContent = msg;
      el.style.color = success ? 'var(--kc-success)' : 'var(--kc-error)';
    }
  }

  function finishGame() {
    clearInterval(timerInterval);

    var totalLetterScore = 0;
    state.wordsFound.forEach(function(w) { totalLetterScore += w.length; });
    var accuracy = Math.min(100, (state.wordsFound.length / 10) * 100); // 10 words = 100%
    var speedScore = Math.min(100, (totalLetterScore / 30) * 100); // 30 total letters = 100%

    onComplete({
      score: state.wordsFound.length,
      accuracy: accuracy,
      avgRT: config.duration * 1000, // total time as proxy
      wordsFound: state.wordsFound.length,
      totalLetterScore: totalLetterScore,
      difficulty: config.level,
      trialAccuracies: state.wordsFound.map(function() { return 1; }),
      completed: true
    });
  }

  window.KCGames['word-sprint'] = { init: init };
})();
