/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Define a type for the gtag function on the window object for type safety.
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

/**
 * Sends a custom event to Google Analytics.
 * This function checks if the gtag function is available on the window object before
 * attempting to send an event, preventing errors if the script is blocked or fails to load.
 *
 * @param {string} action - The name of the event (e.g., 'generate_storyboard').
 * @param {object} [params] - An optional object of key-value pairs for event parameters.
 */
export const trackEvent = (action: string, params?: {[key: string]: any}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  } else {
    // Fallback for development or if gtag is not available
    console.log(`Analytics Event (not sent): ${action}`, params);
  }
};
