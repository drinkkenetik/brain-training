/* ==========================================================================
   Kenetik Circuit — Identity Lifecycle (Section 11.6)
   Three states: anonymous → email-captured → Shopify-linked
   ========================================================================== */

(function() {
  'use strict';

  var IDENTITY_STATES = { ANONYMOUS: 'anonymous', EMAIL_CAPTURED: 'email-captured', SHOPIFY_LINKED: 'shopify-linked' };

  var identity = {
    state: IDENTITY_STATES.ANONYMOUS,
    email: null,
    userId: null,
    shopifyCustomerId: null
  };

  function loadIdentity() {
    try {
      var stored = localStorage.getItem('kc_identity');
      if (stored) {
        var data = JSON.parse(stored);
        identity.state = data.state || IDENTITY_STATES.ANONYMOUS;
        identity.email = data.email || null;
        identity.userId = data.userId || null;
        identity.shopifyCustomerId = data.shopifyCustomerId || null;
      }
    } catch (e) {}
    return identity;
  }

  function saveIdentity() {
    try {
      localStorage.setItem('kc_identity', JSON.stringify(identity));
    } catch (e) {}
  }

  function captureEmail(email) {
    identity.email = email;
    identity.state = IDENTITY_STATES.EMAIL_CAPTURED;
    identity.userId = 'local_' + Date.now();
    saveIdentity();

    // Update engine state
    if (window.KCEngine) {
      window.KCEngine.dbPut('state', {
        key: 'user',
        identityState: identity.state,
        email: identity.email
      });
    }

    // Fire Klaviyo identify
    if (window.KCKlaviyo) {
      window.KCKlaviyo.identify(email);
    }

    // TODO: Check Shopify Admin API for existing customer
    // TODO: Supabase magic link auth
  }

  function linkShopify(shopifyCustomerId) {
    identity.shopifyCustomerId = shopifyCustomerId;
    identity.state = IDENTITY_STATES.SHOPIFY_LINKED;
    saveIdentity();

    // Backfill points to LoyaltyLion (Section 11.6.2)
    if (window.KCLoyaltyLion) {
      window.KCLoyaltyLion.backfillPoints(shopifyCustomerId);
    }
  }

  function getIdentity() {
    return identity;
  }

  function isAuthenticated() {
    return identity.state !== IDENTITY_STATES.ANONYMOUS;
  }

  // Initialize
  loadIdentity();

  window.KCIdentity = {
    STATES: IDENTITY_STATES,
    captureEmail: captureEmail,
    linkShopify: linkShopify,
    getIdentity: getIdentity,
    isAuthenticated: isAuthenticated
  };

})();
