/* ==========================================================================
   Kenetik Circuit — Consumption Protocol (Section 9)
   Post-session logging, restock estimation
   ========================================================================== */

(function() {
  'use strict';

  var PROTOCOL_WEEKS = {
    1: { target: 1, timing: '30 min before training', points: 25 },
    2: { target: 2, timing: 'Morning + pre-training', points: 35 },
    3: { target: 3, timing: 'Morning + pre-training + afternoon', points: 45 },
    4: { target: 3, timing: 'Morning + pre-training + afternoon', points: 50 }
  };

  var consumptionState = {
    optedIn: false,
    protocolWeek: 1,
    todayLogged: false,
    logs: []
  };

  function loadState() {
    try {
      var stored = localStorage.getItem('kc_consumption');
      if (stored) {
        var data = JSON.parse(stored);
        Object.keys(data).forEach(function(key) { consumptionState[key] = data[key]; });
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem('kc_consumption', JSON.stringify(consumptionState));
    } catch (e) {}
  }

  function logServings(count) {
    var log = {
      servings: count,
      date: new Date().toISOString(),
      protocolWeek: consumptionState.protocolWeek,
      pairedWithTraining: true
    };

    consumptionState.logs.push(log);
    consumptionState.todayLogged = true;
    saveState();

    // Award points
    var weekConfig = PROTOCOL_WEEKS[Math.min(consumptionState.protocolWeek, 4)];
    var points = weekConfig ? weekConfig.points : 25;

    // Fire Klaviyo event
    if (window.KCKlaviyo) {
      window.KCKlaviyo.trackEvent('Brain Kenetik Consumption Log', {
        servings: count,
        time_of_day: getTimeOfDay(),
        paired_with_training: true,
        protocol_week: consumptionState.protocolWeek,
        adherence_pct: getAdherencePct()
      });
    }

    return points;
  }

  function getTimeOfDay() {
    var hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  function getAdherencePct() {
    var weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var weekLogs = consumptionState.logs.filter(function(l) {
      return new Date(l.date) >= weekStart;
    });
    return Math.min(100, (weekLogs.length / 7) * 100);
  }

  function shouldShowLog() {
    return consumptionState.optedIn && !consumptionState.todayLogged;
  }

  function optIn() {
    consumptionState.optedIn = true;
    saveState();
  }

  function getEstimatedDaysRemaining() {
    // TODO: Integrate with Shopify order data
    return null;
  }

  loadState();

  window.KCConsumption = {
    logServings: logServings,
    shouldShowLog: shouldShowLog,
    optIn: optIn,
    getEstimatedDaysRemaining: getEstimatedDaysRemaining,
    getState: function() { return consumptionState; }
  };

})();
