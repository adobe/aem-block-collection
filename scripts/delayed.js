// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './aem.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

const martechMap = {
  CC_ANALYTICS: ['WebSDK', 'GA'],
  CC_MARKETING: ['AdobeDataCollection', 'GTM'],
};
// eslint-disable-next-line max-len
const getConsentCategories = () => (window.hlx && Array.isArray(window.hlx.consent) ? window.hlx.consent : []);

function loadMartech() {
  getConsentCategories().forEach((category) => {
    //Load martech from map
  });
}

loadMartech();

document.addEventListener('consent', () => {
  // eslint-disable-next-line max-len
  loadMartech();
});

document.addEventListener('consent-updated', () => {
  // Reload page??
  loadMartech();
});
