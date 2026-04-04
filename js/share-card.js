/* ==========================================================================
   Kenetik Circuit — Shareable Brain Score Card (Section 10.1, 3.6)
   Auto-generated share card with Brain Score, domains, level, streak.
   Formats: Instagram Stories (1080x1920) and Twitter/X (1200x675).
   ========================================================================== */

(function() {
  'use strict';

  var DOMAIN_COLORS = {
    'processing-speed': '#269DD2',
    'working-memory': '#D01483',
    'executive-function': '#FBB11B',
    'cognitive-flexibility': '#A3C3D9',
    'attention': '#F06925',
    'spatial-language': '#E03D1A'
  };

  var DOMAIN_LABELS = {
    'processing-speed': 'Processing Speed',
    'working-memory': 'Working Memory',
    'executive-function': 'Executive Function',
    'cognitive-flexibility': 'Cognitive Flexibility',
    'attention': 'Attention',
    'spatial-language': 'Spatial / Language'
  };

  function generateCard(brainData, userState, format) {
    format = format || 'twitter'; // 'twitter' (1200x675) or 'story' (1080x1920)

    var canvas = document.createElement('canvas');
    var isStory = format === 'story';
    canvas.width = isStory ? 1080 : 1200;
    canvas.height = isStory ? 1920 : 675;
    var ctx = canvas.getContext('2d');

    // Background: warm off-white
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Diagonal chevron stripe (brand pattern)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#E03D1A';
    ctx.translate(canvas.width * 0.3, 0);
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(0, -100, 200, canvas.height * 2);
    ctx.restore();

    // Second stripe
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#13286D';
    ctx.translate(canvas.width * 0.6, 0);
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(0, -100, 120, canvas.height * 2);
    ctx.restore();

    var centerX = canvas.width / 2;
    var y = isStory ? 400 : 80;

    // "BRAIN SCORE" eyebrow
    ctx.fillStyle = '#999999';
    ctx.font = '700 ' + (isStory ? '36px' : '20px') + ' "Jost", "Century Gothic", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText('BRAIN SCORE', centerX, y);

    // Brain Score number
    y += isStory ? 140 : 80;
    ctx.fillStyle = '#000000';
    ctx.font = '700 ' + (isStory ? '180px' : '100px') + ' "Jost", "Century Gothic", Arial, sans-serif';
    ctx.fillText(String(brainData.score || 0), centerX, y);

    // Level and streak
    y += isStory ? 80 : 50;
    var levelTitle = window.KCGamification ? window.KCGamification.getLevelTitle(userState.level || 1) : 'First Sip';
    ctx.fillStyle = '#555555';
    ctx.font = '500 ' + (isStory ? '32px' : '18px') + ' "Jost", "Century Gothic", Arial, sans-serif';
    ctx.fillText('Level ' + (userState.level || 1) + ': ' + levelTitle + '  •  ' + (userState.streak || 0) + '-day streak', centerX, y);

    // Domain bars
    y += isStory ? 100 : 50;
    var domains = brainData.domains || {};
    var domainKeys = Object.keys(DOMAIN_LABELS);
    var barWidth = isStory ? 600 : 400;
    var barHeight = isStory ? 24 : 14;
    var barGap = isStory ? 56 : 34;

    domainKeys.forEach(function(key) {
      var score = domains[key] || 0;
      var color = DOMAIN_COLORS[key] || '#999';
      var label = DOMAIN_LABELS[key];

      // Label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#555555';
      ctx.font = '400 ' + (isStory ? '24px' : '13px') + ' "Jost", "Century Gothic", Arial, sans-serif';
      ctx.fillText(label, centerX - barWidth / 2, y);

      // Score number
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.font = '700 ' + (isStory ? '24px' : '13px') + ' "Jost", "Century Gothic", Arial, sans-serif';
      ctx.fillText(String(score), centerX + barWidth / 2, y);

      // Bar background
      y += isStory ? 14 : 8;
      ctx.fillStyle = '#E0E0E0';
      roundRect(ctx, centerX - barWidth / 2, y, barWidth, barHeight, barHeight / 2);
      ctx.fill();

      // Bar fill
      ctx.fillStyle = color;
      var fillWidth = (score / 100) * barWidth;
      if (fillWidth > 0) {
        roundRect(ctx, centerX - barWidth / 2, y, fillWidth, barHeight, barHeight / 2);
        ctx.fill();
      }

      y += barHeight + barGap - (isStory ? 14 : 8);
    });

    // Badges (up to 3)
    var earnedBadges = window.KCBadges ? window.KCBadges.getEarnedBadges().slice(0, 3) : [];
    if (earnedBadges.length > 0) {
      y += isStory ? 40 : 20;
      ctx.textAlign = 'center';
      ctx.font = (isStory ? '48px' : '28px') + ' sans-serif';
      var badgeStr = earnedBadges.map(function(b) { return b.icon; }).join('  ');
      ctx.fillText(badgeStr, centerX, y);
    }

    // Footer: Kenetik branding
    var footerY = canvas.height - (isStory ? 120 : 50);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#13286D';
    ctx.font = '700 ' + (isStory ? '28px' : '16px') + ' "Jost", "Century Gothic", Arial, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('KENETIK', centerX, footerY);
    ctx.fillStyle = '#999999';
    ctx.font = '300 ' + (isStory ? '22px' : '12px') + ' "Jost", "Century Gothic", Arial, sans-serif';
    ctx.fillText('Clarity and Focus on Demand', centerX, footerY + (isStory ? 40 : 22));

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function shareCard(brainData, userState, format) {
    var canvas = generateCard(brainData, userState, format);

    canvas.toBlob(function(blob) {
      if (!blob) return;

      // Try Web Share API first
      if (navigator.share && navigator.canShare) {
        var file = new File([blob], 'kenetik-brain-score.png', { type: 'image/png' });
        var shareData = {
          title: 'My Brain Score: ' + brainData.score,
          text: 'I scored ' + brainData.score + ' on Kenetik Circuit brain training!',
          files: [file]
        };
        if (navigator.canShare(shareData)) {
          navigator.share(shareData).then(function() {
            // Award 50 Fuel Points for sharing (Section 6.1)
            if (window.KCLoyaltyLion) {
              window.KCLoyaltyLion.trackActivity('brain_share', 50);
            }
            if (window.KCKlaviyo) {
              window.KCKlaviyo.trackEvent('Brain Score Shared', { score: brainData.score, format: format });
            }
          }).catch(function() {});
          return;
        }
      }

      // Fallback: download
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'kenetik-brain-score.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function getCardPreview(brainData, userState) {
    var canvas = generateCard(brainData, userState, 'twitter');
    return canvas.toDataURL('image/png');
  }

  window.KCShareCard = {
    generateCard: generateCard,
    shareCard: shareCard,
    getCardPreview: getCardPreview
  };

})();
