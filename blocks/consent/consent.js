import {
  sampleRUM,
  buildBlock,
} from '../../scripts/aem.js';

const LOCAL_STORAGE_AEM_CONSENT = 'aem-consent';

function getStoredPreference() {
  // eslint-disable-next-line max-len
  const storage = localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT) ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT)) : {};
  return storage.categories;
}

function setStoredPreference(categories) {
  // eslint-disable-next-line max-len
  const storage = localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT) ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT)) : {};
  storage.categories = categories;
  localStorage.setItem(LOCAL_STORAGE_AEM_CONSENT, JSON.stringify(storage));
}

/**
 * updates consent categories in local storage,
 * triggers downstream consent-update event,
 * tracks the selection in RUM
 * @param {Array} selCategories
 */
function manageConsentUpdate(selCategories) {
  const newCategories = Array.isArray(selCategories) ? selCategories : [selCategories];
  window.consent = window.consent || {};
  window.consent.status = 'done';
  window.consent.categories = newCategories;
  setStoredPreference(newCategories);
  sampleRUM('consentupdate', { source: newCategories });
  const consentUpdateEvent = new CustomEvent('consent-updated', newCategories);
  dispatchEvent(consentUpdateEvent);
}

function manageConsentRead(categories) {
  window.consent = window.consent || {};
  window.consent.status = 'done';
  window.consent.categories = categories;
  sampleRUM('consent', { source: categories });
  const consentReadEvent = new CustomEvent('consent', categories);
  dispatchEvent(consentReadEvent);
}

export function init(consentName) {
  const selectedCategories = getStoredPreference();
  if (selectedCategories && selectedCategories.length > 0) {
    // If user already has the consent stored in the browser don't show any banner
    manageConsentRead(selectedCategories);
  } else {
    sampleRUM('showconsent', { source: consentName });
    import('./consent-banner.js').then((ccBanner) => ccBanner.showConsentBanner(consentName, manageConsentUpdate));
  }
}

/*
export default function decorate(block) {
  block.closest('.section').remove();
  const consentName = block.textContent.trim();
  const selectedCategories = getStoredPreference();
  if (selectedCategories && selectedCategories.length > 0) {
    // If user already has the consent stored in the browser don't show any banner
    manageConsentRead(selectedCategories);
  } else {
    sampleRUM('showconsent', { source: consentName });
    import('./consent-banner.js').then((ccBanner) => ccBanner.showConsentBanner(consentName, manageConsentUpdate));
  }
  block.remove();
}
*/
/**
 * shows the consent dialog to update the preferences once they have been selected
 * @param {String} path to the document with the dialog information
 */
export function showUpdateConsent(path) {
  import('./consent-banner.js').then((ccdialog) => ccdialog.showConsentBannerForUpdate(path, manageConsentUpdate));
}
