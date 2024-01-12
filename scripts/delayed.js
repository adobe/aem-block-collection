// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './aem.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here
document.addEventListener('consent', () => {
  // eslint-disable-next-line max-len
  const consentedCategories = window.hlx && Array.isArray(window.hlx.consent) ? window.hlx.consent : [];

  if (consentedCategories.includes('CC_ANALYTICS')) {
    // LOAD ANALYTICS MARTECH
  }
});
