import {
  sampleRUM,
  loadCSS,
  getMetadata,
  fetchPlaceholders,
} from '../../scripts/aem.js';

const LOCAL_STORAGE_AEM_CONSENT = 'aem-consent';

// This is not a traditional block, so there is no decorate function.
// Instead the init() function is to be invoked.
// For projects based on the boilerplate, the init() method is invoked
// directly from scripts.js in the lazy phase, if the page has
// configured a `cookie-consent` metadata field.
// The block can be invoked from other blocks to update the consent preferences
// using the function showContentForUpdate()

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

/**
 * Inits the consent for a page.
 * Checks if the user has selected cookie preferences in the local storage.
 * If not it displays the consent banner passed as a parameter.
 * @param {String} consentName name of the consent banner configuration file
 * which is normally located in /cookie-consent/consentName
 */
export function init(consentName) {
  const selectedCategories = getStoredPreference();
  if (selectedCategories && selectedCategories.length > 0) {
    // If user already has the consent stored in the browser don't show any banner
    manageConsentRead(selectedCategories);
  } else {
    sampleRUM('showconsent', { source: consentName });
    loadCSS(`${window.hlx.codeBasePath}/blocks/consent/consent.css`);
    import('./consent-banner.js').then((ccBanner) => ccBanner.showConsentBanner(consentName, manageConsentUpdate));
  }
}

/**
 * Shows the consent banner to update the preferences.
 * If config has category details, it will directly show the categoty details dialog.
 * Otherwise it will show the minimal banner.
 * @param {String} consentName name of the consent banner configuration file.
 * which is normally located in /cookie-consent/consentName
 */
export function showConsentForUpdate(consentName) {
  loadCSS(`${window.hlx.codeBasePath}/blocks/consent/consent.css`);
  import('./consent-banner.js').then((ccdialog) => ccdialog.showConsentBannerForUpdate(consentName, manageConsentUpdate));
}

/**
 * Updates the Cookie Preference link inside the provided element:
 * on click, the link will open the consent dialog
 * if the 'cookie-consent' metadata is set on the page.
 * @param {Element} el the DOM element in which the consent preference link is to be set up
 */
export function setupConsentPreferenceLink(el = document) {
  if (getMetadata('cookie-consent')) {
    const consentLinkText = fetchPlaceholders()['cookie-preferences-link'] || 'Cookie preferences';
    el.querySelector(`a[title="${consentLinkText}"]`).addEventListener('click', (e) => {
      showConsentForUpdate(getMetadata('cookie-consent'));
      e.preventDefault();
    });
  }
}
