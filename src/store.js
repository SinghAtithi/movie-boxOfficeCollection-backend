'use strict';

/**
 * In-memory data store with linear interpolation engine.
 * 
 * Stores two data snapshots (current & next24Hours) and smoothly
 * interpolates between them over a 24-hour window, ticking every second.
 */

const SECONDS_IN_24H = 86400;

const defaultData = {
  totalRevenue: 0,
  lastTwentyFourHourRevenue: 0,
  totalTicketSales: 0,
};

// ── State ──────────────────────────────────────────────
let current = { ...defaultData };
let next24Hours = { ...defaultData };
let interpolated = { ...defaultData };
let lastUpdatedAt = null;         // Date when POST was last called
let interpolationTimer = null;

// ── Public API ────────────────────────────────────────

/**
 * Update the stored data. Called by the POST endpoint.
 * @param {Object} newCurrent      - Baseline values right now
 * @param {Object} newNext24Hours  - Target values to reach in 24h
 */
function updateData(newCurrent, newNext24Hours) {
  current = {
    totalRevenue: Number(newCurrent.totalRevenue) || 0,
    lastTwentyFourHourRevenue: Number(newCurrent.lastTwentyFourHourRevenue) || 0,
    totalTicketSales: Number(newCurrent.totalTicketSales) || 0,
  };

  next24Hours = {
    totalRevenue: Number(newNext24Hours.totalRevenue) || 0,
    lastTwentyFourHourRevenue: Number(newNext24Hours.lastTwentyFourHourRevenue) || 0,
    totalTicketSales: Number(newNext24Hours.totalTicketSales) || 0,
  };

  lastUpdatedAt = Date.now();

  // Immediately set interpolated to current baseline
  interpolated = { ...current };
}

/**
 * Recalculate interpolated values.  Called every 1 second by the timer.
 * 
 * Formula:  display = current + (next24Hours - current) * (elapsed / 86400)
 * Clamped so it never overshoots the target.
 */
function tick() {
  if (!lastUpdatedAt) return;  // No data yet

  const elapsedMs = Date.now() - lastUpdatedAt;
  const elapsedSeconds = elapsedMs / 1000;

  // Progress ratio: 0 → 1 over 24 hours, clamped at 1
  const progress = Math.min(elapsedSeconds / SECONDS_IN_24H, 1);

  interpolated = {
    totalRevenue: Math.floor(
      current.totalRevenue + (next24Hours.totalRevenue - current.totalRevenue) * progress
    ),
    lastTwentyFourHourRevenue: Math.floor(
      current.lastTwentyFourHourRevenue +
        (next24Hours.lastTwentyFourHourRevenue - current.lastTwentyFourHourRevenue) * progress
    ),
    totalTicketSales: Math.floor(
      current.totalTicketSales + (next24Hours.totalTicketSales - current.totalTicketSales) * progress
    ),
  };
}

/**
 * Returns the current display-ready interpolated data.
 */
function getInterpolated() {
  return {
    totalRevenue: interpolated.totalRevenue,
    lastTwentyFourHourRevenue: interpolated.lastTwentyFourHourRevenue,
    totalTicketSales: interpolated.totalTicketSales,
    _meta: {
      lastUpdatedAt: lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : null,
      elapsedSeconds: lastUpdatedAt ? Math.floor((Date.now() - lastUpdatedAt) / 1000) : 0,
    },
  };
}

/**
 * Start the 1-second interpolation timer.
 */
function startInterpolation() {
  if (interpolationTimer) clearInterval(interpolationTimer);
  interpolationTimer = setInterval(tick, 1000);
}

/**
 * Stop the interpolation timer (for graceful shutdown).
 */
function stopInterpolation() {
  if (interpolationTimer) {
    clearInterval(interpolationTimer);
    interpolationTimer = null;
  }
}

module.exports = {
  updateData,
  getInterpolated,
  startInterpolation,
  stopInterpolation,
  tick,
};
