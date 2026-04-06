/* ==========================================================================
   Kenetik Circuit — Domain Charts (Section 3.5)
   Brain Score domain breakdown as bar chart and radar chart.
   Uses Canvas API — no dependencies.
   ========================================================================== */

(function() {
  'use strict';

  var DOMAIN_CONFIG = [
    { key: 'processing-speed', label: 'Speed', color: '#269DD2' },
    { key: 'working-memory', label: 'Memory', color: '#D01483' },
    { key: 'executive-function', label: 'Executive', color: '#FBB11B' },
    { key: 'cognitive-flexibility', label: 'Flexibility', color: '#A3C3D9' },
    { key: 'attention', label: 'Attention', color: '#F06925' },
    { key: 'spatial-language', label: 'Spatial', color: '#E03D1A' }
  ];

  // Compact horizontal bar chart for results screen
  function renderDomainBars(containerId, domains) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    DOMAIN_CONFIG.forEach(function(d) {
      var score = domains[d.key] || 0;
      var hasScore = domains[d.key] !== undefined && domains[d.key] !== null;
      html += '<div style="display: flex; align-items: center; gap: 8px;">' +
        '<div style="width: 70px; font-size: 12px; color: var(--kc-text-muted); text-align: right;">' + d.label + '</div>' +
        '<div style="flex: 1; height: 12px; background: var(--kc-border); border-radius: 6px; overflow: hidden;">' +
          (hasScore ? '<div style="height: 100%; width: ' + score + '%; background: ' + d.color + '; border-radius: 6px; transition: width 0.6s ease;"></div>' : '') +
        '</div>' +
        '<div style="width: 28px; font-size: 13px; font-weight: 700; color: ' + (hasScore ? 'var(--kc-text-primary)' : 'var(--kc-text-light)') + ';">' +
          (hasScore ? score : '—') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  // Canvas radar chart for dashboard
  function renderRadarChart(containerId, domains, size) {
    var el = document.getElementById(containerId);
    if (!el) return;

    size = size || 240;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.cssText = 'width: ' + size + 'px; height: ' + size + 'px;';
    el.innerHTML = '';
    el.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var cx = size / 2;
    var cy = size / 2;
    var radius = size / 2 - 30;
    var sides = DOMAIN_CONFIG.length;
    var angleStep = (Math.PI * 2) / sides;

    // Draw grid rings
    [0.25, 0.5, 0.75, 1.0].forEach(function(pct) {
      ctx.beginPath();
      for (var i = 0; i <= sides; i++) {
        var angle = (i * angleStep) - Math.PI / 2;
        var x = cx + Math.cos(angle) * radius * pct;
        var y = cy + Math.sin(angle) * radius * pct;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw axes
    for (var i = 0; i < sides; i++) {
      var angle = (i * angleStep) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    var hasData = false;
    DOMAIN_CONFIG.forEach(function(d, i) {
      var score = domains[d.key] || 0;
      if (score > 0) hasData = true;
      var angle = (i * angleStep) - Math.PI / 2;
      var r = (score / 100) * radius;
      var x = cx + Math.cos(angle) * r;
      var y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    if (hasData) {
      ctx.fillStyle = 'rgba(224, 61, 26, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#E03D1A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw data points
      DOMAIN_CONFIG.forEach(function(d, i) {
        var score = domains[d.key] || 0;
        var angle = (i * angleStep) - Math.PI / 2;
        var r = (score / 100) * radius;
        var x = cx + Math.cos(angle) * r;
        var y = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw labels
    ctx.font = '500 11px "Jost", "Century Gothic", Arial, sans-serif';
    ctx.textAlign = 'center';
    DOMAIN_CONFIG.forEach(function(d, i) {
      var angle = (i * angleStep) - Math.PI / 2;
      var labelR = radius + 18;
      var x = cx + Math.cos(angle) * labelR;
      var y = cy + Math.sin(angle) * labelR;

      ctx.fillStyle = '#999999';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.label, x, y);
    });
  }

  // Sparkline trend chart for Brain Score history
  function renderSparkline(containerId, history, width, height) {
    var el = document.getElementById(containerId);
    if (!el || !history || history.length < 2) {
      if (el) el.innerHTML = '<div class="kc-caption kc-text-center" style="padding: 16px;">Complete more sessions to see your trend.</div>';
      return;
    }

    width = width || 300;
    height = height || 80;

    var canvas = document.createElement('canvas');
    canvas.width = width * 2; // 2x for retina
    canvas.height = height * 2;
    canvas.style.cssText = 'width: ' + width + 'px; height: ' + height + 'px;';
    el.innerHTML = '';
    el.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    var scores = history.map(function(h) { return h.score; });
    var minScore = Math.max(0, Math.min.apply(null, scores) - 10);
    var maxScore = Math.min(100, Math.max.apply(null, scores) + 10);
    var range = maxScore - minScore || 1;
    var padding = 8;
    var drawW = width - padding * 2;
    var drawH = height - padding * 2;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#E03D1A';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    scores.forEach(function(score, i) {
      var x = padding + (i / (scores.length - 1)) * drawW;
      var y = padding + drawH - ((score - minScore) / range) * drawH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under line
    var lastX = padding + drawW;
    var lastY = padding + drawH - ((scores[scores.length - 1] - minScore) / range) * drawH;
    ctx.lineTo(lastX, padding + drawH);
    ctx.lineTo(padding, padding + drawH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(224, 61, 26, 0.08)';
    ctx.fill();

    // Draw dots on last 3 points
    var dotStart = Math.max(0, scores.length - 3);
    for (var i = dotStart; i < scores.length; i++) {
      var x = padding + (i / (scores.length - 1)) * drawW;
      var y = padding + drawH - ((scores[i] - minScore) / range) * drawH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = i === scores.length - 1 ? '#E03D1A' : '#F5F0E8';
      ctx.fill();
      ctx.strokeStyle = '#E03D1A';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Score label on last point
    ctx.font = '700 11px "Jost", sans-serif';
    ctx.fillStyle = '#E03D1A';
    ctx.textAlign = 'center';
    ctx.fillText(scores[scores.length - 1], lastX, lastY - 10);
  }

  window.KCCharts = {
    renderDomainBars: renderDomainBars,
    renderRadarChart: renderRadarChart,
    renderSparkline: renderSparkline,
    DOMAIN_CONFIG: DOMAIN_CONFIG
  };

})();
