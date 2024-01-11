// eslint-disable-next-line import/no-cycle
import { openModal } from '../blocks/modal/modal.js';
import { sampleRUM } from './aem.js';

const LOCAL_STORAGE_AEM_CONSENT = 'aem-consent';

function userPreferences(categories) {
  // eslint-disable-next-line max-len
  const storage = localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT) ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_AEM_CONSENT)) : {};
  if (!categories) {
    return storage.categories;
  }
  storage.categories = categories;
  localStorage.setItem(LOCAL_STORAGE_AEM_CONSENT, JSON.stringify(storage));
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
  userPreferences(newCategories);
  sampleRUM('consentupdate', newCategories);
  const consentUpdateEvent = new CustomEvent('consent-updated', newCategories);
  dispatchEvent(consentUpdateEvent);
}

function manageConsentRead(categories) {
  sampleRUM('consent', categories);
  const consentReadEvent = new CustomEvent('consent', categories);
  dispatchEvent(consentReadEvent);
}

/**
 * Checks if user has preferences saved. If preferences are already saved
 * set categories in the window.hlx.consent property, trigger downstream events,
 * track in RUM, and continue execution.
 * If preferences are not available in localStorage, show consent dialog.
 * @param {*} path to the document which contains the consent dialog
 */
export async function loadConsent(path) {
  const selectedCategories = userPreferences();
  if (selectedCategories && selectedCategories.length > 0) {
    window.hlx = window.hlx || {};
    window.hlx.consent = selectedCategories;
    manageConsentRead(selectedCategories);
  } else if (path && path.startsWith('/') && path.indexOf('/cookie-consent/')) {
    await openModal(path);
    document.querySelector('dialog > .close-button').remove();
  }
}
