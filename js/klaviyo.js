/* ==========================================================================
   Kenetik Circuit — Klaviyo Integration (Section 8.1)
   Event firing with retry (Section 11.7.2)
   3 attempts over 15 minutes
   ========================================================================== */

(function() {
  'use strict';

  // TODO: Replace with actual Klaviyo public API key
  var PUBLIC_KEY = '';

  function identify(email) {
    if (typeof _learnq !== 'undefined') {
      _learnq.push(['identify', { '$email': email }]);
    }
  }

  function trackEvent(eventName, properties) {
    properties = properties || {};
    properties.timestamp = new Date().toISOString();

    if (typeof _learnq !== 'undefined') {
      _learnq.push(['track', eventName, properties]);
    }

    // Also queue for retry via Supabase cron
    queueEvent(eventName, properties);
  }

  function trackSessionComplete(data) {
    trackEvent('Brain Training Session Complete', {
      exercises: data.exercises ? data.exercises.map(function(r) { return r.exercise; }) : [],
      scores: data.exercises ? data.exercises.map(function(r) { return r.normalizedScore; }) : [],
      points_earned: data.points || 0,
      brain_score: data.brainScore || 0,
      streak_count: window.KCGamification ? window.KCGamification.getStreak() : 0
    });
  }

  function trackBaselineComplete(brainScore) {
    trackEvent('Brain Score Baseline Complete', {
      score: brainScore,
      exercises_available: 5
    });
  }

  function trackLevelUp(level, title) {
    trackEvent('Brain Level Up', {
      new_level: level,
      title: title
    });
  }

  function trackStreakMilestone(days) {
    trackEvent('Brain Streak Milestone', {
      streak_days: days
    });
  }

  function queueEvent(eventName, properties) {
    if (window.KCEngine) {
      window.KCEngine.dbPut('eventQueue', {
        target: 'klaviyo',
        eventName: eventName,
        properties: properties,
        attempts: 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  }

  window.KCKlaviyo = {
    identify: identify,
    trackEvent: trackEvent,
    trackSessionComplete: trackSessionComplete,
    trackBaselineComplete: trackBaselineComplete,
    trackLevelUp: trackLevelUp,
    trackStreakMilestone: trackStreakMilestone
  };

})();
