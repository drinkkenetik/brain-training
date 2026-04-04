/* ==========================================================================
   Kenetik Circuit — LoyaltyLion Integration (Section 7.1)
   Activity tracking with retry (Section 11.7.2)
   3 attempts, exponential backoff: 5s, 30s, 5min
   ========================================================================== */

(function() {
  'use strict';

  // TODO: Replace with actual LoyaltyLion API credentials
  var API_BASE = '';
  var API_KEY = '';

  var RETRY_DELAYS = [5000, 30000, 300000]; // 5s, 30s, 5min

  function trackActivity(ruleName, points) {
    var identity = window.KCIdentity ? window.KCIdentity.getIdentity() : {};

    if (identity.state !== 'shopify-linked') {
      // Queue for backfill when Shopify linked
      queueActivity(ruleName, points);
      return;
    }

    postActivity(ruleName, points, identity.shopifyCustomerId, 0);
  }

  function postActivity(ruleName, points, customerId, attempt) {
    if (!API_BASE || !customerId) {
      queueActivity(ruleName, points);
      return;
    }

    // TODO: POST /v2/activities to LoyaltyLion
    // On failure: retry with exponential backoff
    // After 3 failures: flag for manual review, show points as "pending"
    queueActivity(ruleName, points);
  }

  function queueActivity(ruleName, points) {
    if (window.KCEngine) {
      window.KCEngine.dbPut('eventQueue', {
        target: 'loyaltylion',
        ruleName: ruleName,
        points: points,
        attempts: 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  }

  function backfillPoints(shopifyCustomerId) {
    // Read all pending LoyaltyLion events from queue and replay
    if (window.KCEngine) {
      window.KCEngine.dbGetAll('eventQueue', function(events) {
        events.forEach(function(evt) {
          if (evt.target === 'loyaltylion' && evt.status === 'pending') {
            postActivity(evt.ruleName, evt.points, shopifyCustomerId, 0);
          }
        });
      });
    }
  }

  window.KCLoyaltyLion = {
    trackActivity: trackActivity,
    backfillPoints: backfillPoints
  };

})();
