/**
 * UI timing constants for view transitions, feedback messages and toasts.
 * Centralized here for consistency and easy tuning.
 */

/** Brief feedback in widgets: "Request sent!", "Friend added!" */
export const FEEDBACK_WIDGET_MS = 2500;

/** Lobby transitions: expired, rejected, timeout, gameover screen */
export const FEEDBACK_LOBBY_MS = 3500;

/** Post-action redirects: change password, reset password */
export const NAVIGATE_AFTER_MS = 2500;

/** Default toast duration (all types except ACTION) */
export const TOAST_GENERAL_MS = 3500;