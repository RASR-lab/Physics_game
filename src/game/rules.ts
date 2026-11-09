/**
 * Launches a student gets to reach the goal in one situation (one set of numbers).
 * Out of tries → Launch locks; "🎲 Try new numbers" deals a fresh situation with a new count.
 * Launches after a win don't count, and neither does the tutorial's scripted demo launch.
 */
export const MAX_ATTEMPTS = 3;
