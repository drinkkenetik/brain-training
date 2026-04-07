/* ==========================================================================
   Kenetik Circuit — Supabase Integration (Section 11.3)
   Auth + data sync + local queue fallback
   ========================================================================== */

(function() {
  'use strict';

  var SUPABASE_URL = 'https://tgoeecuynbzmoyngxkly.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_2BjI8__Uzv6n_40CYTsE6g_GSWzD1S6';

  var supabase = null;
  var currentUser = null;
  var syncInterval = null;
  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  // ===== SDK LOADING =====

  function loadSDK(callback) {
    if (window.supabase && window.supabase.createClient) {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.src = SDK_URL;
    script.onload = function() { callback(); };
    script.onerror = function() {
      console.warn('[KCSupabase] SDK failed to load, running offline');
      callback();
    };
    document.head.appendChild(script);
  }

  // ===== INITIALIZATION =====

  function init(callback) {
    loadSDK(function() {
      if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Check for existing session
        supabase.auth.getSession().then(function(resp) {
          if (resp.data && resp.data.session) {
            currentUser = resp.data.session.user;
          }
          startBackgroundSync();
          if (callback) callback(currentUser);
        });

        // Listen for auth changes
        supabase.auth.onAuthStateChange(function(event, session) {
          if (session && session.user) {
            currentUser = session.user;
            // Sync any offline data immediately on login
            syncPendingRecords();
          } else {
            currentUser = null;
          }
        });
      } else {
        startBackgroundSync();
        if (callback) callback(null);
      }
    });
  }

  // ===== AUTH (Section 11.6) =====

  function magicLinkAuth(email, callback) {
    if (!supabase) {
      callback({ error: 'Supabase not available' });
      return;
    }
    supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    }).then(function(resp) {
      if (resp.error) {
        callback({ error: resp.error.message });
      } else {
        callback({ success: true });
      }
    }).catch(function(err) {
      callback({ error: err.message });
    });
  }

  function getSession() {
    return currentUser;
  }

  function getUserId() {
    return currentUser ? currentUser.id : null;
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function signOut(callback) {
    if (!supabase) { if (callback) callback(); return; }
    supabase.auth.signOut().then(function() {
      currentUser = null;
      if (callback) callback();
    });
  }

  // ===== DATA SYNC (Section 11.7.1) =====
  // Local IndexedDB is the source of truth.
  // This module syncs pending records to Supabase in the background.

  function startBackgroundSync() {
    // Sync every 60 seconds per spec
    syncInterval = setInterval(syncPendingRecords, 60000);

    // Sync on app resume
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        syncPendingRecords();
      }
    });

    // Initial sync
    setTimeout(syncPendingRecords, 2000);
  }

  function syncPendingRecords() {
    if (!supabase || !currentUser) return;

    syncScores();
    syncSessions();
    syncProfile();
  }

  function syncScores() {
    if (!window.KCEngine || !window.KCEngine.dbGetAll) return;

    window.KCEngine.dbGetAll('scores', function(allScores) {
      var pending = allScores.filter(function(s) { return s.syncStatus === 'pending'; });
      if (pending.length === 0) return;

      var rows = pending.map(function(s) {
        return {
          user_id: currentUser.id,
          exercise: s.exercise,
          raw_score: s.rawScore || 0,
          accuracy: s.accuracy || 0,
          avg_rt: s.avgRT || 0,
          normalized_score: s.normalizedScore || 0,
          difficulty: s.difficulty || 1,
          input_device: s.inputDevice || 'touch',
          completed: s.completed !== false,
          is_pb: s.isPB || false,
          created_at: s.createdAt
        };
      });

      supabase.from('scores').insert(rows).then(function(resp) {
        if (!resp.error) {
          // Mark as synced in IndexedDB
          pending.forEach(function(s) {
            s.syncStatus = 'synced';
            window.KCEngine.dbPut('scores', s);
          });
        }
      });
    });
  }

  function syncSessions() {
    if (!window.KCEngine || !window.KCEngine.dbGetAll) return;

    window.KCEngine.dbGetAll('sessions', function(allSessions) {
      var pending = allSessions.filter(function(s) { return s.syncStatus === 'pending'; });
      if (pending.length === 0) return;

      var rows = pending.map(function(s) {
        return {
          user_id: currentUser.id,
          exercises: s.exercises,
          results: s.results || [],
          total_points: s.totalPoints || 0,
          brain_score: s.brainScore || null,
          created_at: s.createdAt
        };
      });

      supabase.from('sessions').insert(rows).then(function(resp) {
        if (!resp.error) {
          pending.forEach(function(s) {
            s.syncStatus = 'synced';
            window.KCEngine.dbPut('sessions', s);
          });
        }
      });
    });
  }

  function syncProfile() {
    if (!window.KCEngine || !window.KCEngine.dbGet) return;

    window.KCEngine.dbGet('state', 'user', function(userState) {
      if (!userState) return;

      supabase.from('profiles').update({
        level: userState.level || 1,
        total_points: userState.totalPoints || 0,
        streak: userState.streak || 0,
        session_day: userState.sessionDay || 0,
        last_session_date: userState.lastSessionDate || null
      }).eq('id', currentUser.id).then(function() {
        // Profile synced silently
      });
    });
  }

  // ===== BRAIN SCORE SYNC =====

  function saveBrainScore(score, domainScores) {
    if (!supabase || !currentUser) return;

    supabase.from('brain_score_history').insert({
      user_id: currentUser.id,
      score: score,
      domain_scores: domainScores || {}
    }).then(function() {
      // Saved silently
    });
  }

  // ===== LEADERBOARD (Section 6.5) =====

  function getLeaderboardGlobal(limit, callback) {
    if (!supabase) { callback([]); return; }

    supabase.from('leaderboard_global')
      .select('*')
      .limit(limit || 20)
      .then(function(resp) {
        callback(resp.data || []);
      });
  }

  function getLeaderboardWeekly(limit, callback) {
    if (!supabase) { callback([]); return; }

    supabase.from('leaderboard_weekly')
      .select('*')
      .limit(limit || 20)
      .then(function(resp) {
        callback(resp.data || []);
      });
  }

  function getUserRank(callback) {
    if (!supabase || !currentUser) { callback(null); return; }

    supabase.from('leaderboard_global')
      .select('*')
      .then(function(resp) {
        var data = resp.data || [];
        var rank = null;
        for (var i = 0; i < data.length; i++) {
          if (data[i].user_id === currentUser.id) {
            rank = i + 1;
            break;
          }
        }
        callback(rank);
      });
  }

  // ===== BADGES SYNC =====

  function saveBadge(badgeKey) {
    if (!supabase || !currentUser) return;

    supabase.from('badges').upsert({
      user_id: currentUser.id,
      badge_key: badgeKey,
      earned_at: new Date().toISOString()
    }, { onConflict: 'user_id,badge_key' }).then(function() {
      // Saved silently
    });
  }

  function getBadges(callback) {
    if (!supabase || !currentUser) { callback([]); return; }

    supabase.from('badges')
      .select('badge_key, earned_at')
      .eq('user_id', currentUser.id)
      .then(function(resp) {
        callback(resp.data || []);
      });
  }

  // ===== CONSUMPTION LOG (Section 9) =====

  function logConsumption(servings) {
    if (!supabase || !currentUser) return;

    supabase.from('consumption_log').insert({
      user_id: currentUser.id,
      servings: servings
    }).then(function() {
      // Logged silently
    });
  }

  // ===== CHALLENGE PROGRESS =====

  function saveChallengeProgress(challengeKey, weekStart, progress, completed) {
    if (!supabase || !currentUser) return;

    supabase.from('challenge_progress').upsert({
      user_id: currentUser.id,
      challenge_key: challengeKey,
      week_start: weekStart,
      progress: progress,
      completed: completed || false
    }, { onConflict: 'user_id,challenge_key,week_start' }).then(function() {
      // Saved silently
    });
  }

  // ===== PUBLIC API =====

  window.KCSupabase = {
    init: init,
    magicLinkAuth: magicLinkAuth,
    getSession: getSession,
    getUserId: getUserId,
    isAuthenticated: isAuthenticated,
    signOut: signOut,
    syncPendingRecords: syncPendingRecords,
    saveBrainScore: saveBrainScore,
    getLeaderboardGlobal: getLeaderboardGlobal,
    getLeaderboardWeekly: getLeaderboardWeekly,
    getUserRank: getUserRank,
    saveBadge: saveBadge,
    getBadges: getBadges,
    logConsumption: logConsumption,
    saveChallengeProgress: saveChallengeProgress
  };

})();
