/**
 * admin.js — Gnoke College
 * Developer emergency bypass. Load this in login.html only.
 *
 * Credentials:  username = admin  |  password = admin
 *
 * What it does:
 *   1. Overrides hasAdmin() → always returns true so the login card
 *      always shows (even on a fresh install with no DB yet).
 *   2. Wraps verifyCredentials() → checks the hardcoded admin pair
 *      first, then falls through to the real DB lookup as normal.
 *
 * REMOVE this file (and its <script> tag) before going to production.
 */

(function () {
  'use strict';

  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'admin';

  /* ── 1. Ensure login card always shows ── */
  const _hasAdmin = window.hasAdmin;
  window.hasAdmin = function () {
    return true;                   // admin.js guarantees an admin always exists
  };

  /* ── 2. Inject hardcoded credentials ── */
  const _verifyCredentials = window.verifyCredentials;
  window.verifyCredentials = function (username, password) {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return {
        id:       0,
        role:     'Other',
        subject:  'Developer',
        classes:  'N/A',
        name:     'Admin (dev)',
        username: ADMIN_USER,
      };
    }
    /* Fall through to normal DB check */
    return typeof _verifyCredentials === 'function'
      ? _verifyCredentials(username, password)
      : null;
  };

  console.info('[admin.js] Developer bypass active. Remove before production.');
})();
