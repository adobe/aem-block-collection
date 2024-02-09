import {
  sampleRUM,
} from '../../scripts/aem.js';

const LOCAL_STORAGE_AEM_CONSENT = 'aem-consent';

function userCookiePreferences(categories) {
  // eslint-disable-next-line max-len
  const storage = localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT) ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT)) : {};
  if (!categories) {
    window.hlx.consent.categories = categories;
    return storage.categories;
  }
  storage.categories = categories;
  localStorage.setItem(LOCAL_STORAGE_AEM_CONSENT, JSON.stringify(storage));
  window.hlx = window.hlx || [];
  window.hlx.consent.categories = categories;
  return categories;
}

/**
 * updates consent categories in local storage,
 * triggers downstream consent-update event,
 * tracks the selection in RUM
 * @param {Array} selCategories
 */
export function manageConsentUpdate(selCategories) {
  const newCategories = Array.isArray(selCategories) ? selCategories : [selCategories];
  userCookiePreferences(newCategories);
  sampleRUM('consentupdate', newCategories);
  const consentUpdateEvent = new CustomEvent('consent-updated', newCategories);
  dispatchEvent(consentUpdateEvent);
}

function manageConsentRead(categories) {
  sampleRUM('consent', categories);
  const consentReadEvent = new CustomEvent('consent', categories);
  dispatchEvent(consentReadEvent);
}

export default function decorate(block) {
  block.closest('.section').remove();
  const path = block.textContent.trim();
  const selectedCategories = userCookiePreferences();
  if (selectedCategories && selectedCategories.length > 0) {
    window.hlx = window.hlx || {};
    window.hlx.consent.categories = selectedCategories;
    manageConsentRead(selectedCategories);
  } else {
    block.remove();
    import('./consent-dialog.js').then((ccdialog) => ccdialog.showConsentBanner(path, manageConsentUpdate));
  }
}

/**
 * shows the consent dialog to update the preferences once they have been selected
 * @param {String} path to the document with the dialog information
 */
export function showUpdateConsentDialog(path) {
  import('./consent-dialog.js').then((ccdialog) => ccdialog.showConsentBannerForUpdate(path, manageConsentUpdate));
}
