import {
  fetchPlaceholders,
} from '../../scripts/aem.js';

import { loadFragment } from '../fragment/fragment.js';
import { buildAndShowDialog } from './consent-dialog.js';

const BASE_CONSENT_PATH = '/block-collection/cookie-consent';

function addListeners(bannerDiv, consentUpdateCallback, arrayCategories, categoriesSections) {
  const acceptAll = bannerDiv.querySelector('.consent.banner .accept');
  const rejectAll = bannerDiv.querySelector('.consent.banner .decline');
  const moreInformation = bannerDiv.querySelector('.consent.banner .more-info');

  if (acceptAll) {
    acceptAll.addEventListener('click', () => {
      consentUpdateCallback(arrayCategories.map((c) => c.code));
      bannerDiv.remove();
    });
  }
  if (rejectAll) {
    rejectAll.addEventListener('click', () => {
      consentUpdateCallback(arrayCategories.filter((c) => !c.optional)
        .map((c) => c.code));
      bannerDiv.remove();
    });
  }
  if (moreInformation && categoriesSections) {
    moreInformation.addEventListener('click', () => {
      buildAndShowDialog(categoriesSections, consentUpdateCallback);
      bannerDiv.remove();
    });
  }
}
/**
 * Returns the categories from the banner.
 * Categories can come from:
 * the section metadata properties: 'required cookies' and 'optional cookies'
 * or if categories sections are available from their metadata.
 * @param {*} bannerSection the section where banner is defined
 * @param {*} categoriesSections array of sections where categories are defined.
 * @returns array of categories, where each entry has category code and the optional flag
 */
function getCategoriesInBanner(bannerSection, categoriesSections) {
  // If banner section has metadata about the cookie categories
  if (bannerSection.getAttribute('data-required-cookies') || bannerSection.getAttribute('data-optional-cookies')) {
    const categories = [];
    if (bannerSection.getAttribute('data-required-cookies')) {
      bannerSection.getAttribute('data-required-cookies').split(',')
        .map((c) => c.trim())
        .forEach((c) => categories.push({ code: c, optional: false }));
    }

    if (bannerSection.getAttribute('data-optional-cookies')) {
      bannerSection.getAttribute('data-optional-cookies').split(',')
        .map((c) => c.trim())
        .forEach((c) => categories.push({ code: c, optional: true }));
    }
    return categories;
  }
  // Banner section doesn't have metadata about cookie categories,
  // but the document contains categories sections => extract categories metadata from the sections
  if (categoriesSections && categoriesSections.length) {
    return categoriesSections
      .filter((category) => category.dataset && category.dataset.code && category.dataset.optional)
      .map((category) => ({ code: category.dataset.code, optional: ['yes', 'true'].includes(category.dataset.optional.toLowerCase().trim()) }));
  }
  return [{ code: 'CC_ESSENTIAL', optional: false }];
}

/**
 * Creates the consent banner HTML
 * @param {*} bannerSection the section where banner is defined
 * @returns HTMLElement of the consent banner div
 */
function createBanner(bannerSection) {
  const content = bannerSection.childNodes;
  const buttonString = bannerSection.getAttribute('data-buttons') || 'accept_all';
  const buttonsArray = buttonString.toLowerCase().split(',').map((s) => s.trim());
  const placeholders = fetchPlaceholders();
  const div = document.createElement('div');
  div.classList.add('consent', 'banner');
  div.append(...content);
  const acceptAllButton = `<button class="consent-button accept primary">${placeholders.consentAcceptAll || 'Accept All'}</button>`;
  const rejectAllButton = `<button class="consent-button decline secondary">${placeholders.consentDeclineAll || 'Decline All'}</button>`;
  const moreInfoLink = `&nbsp;<a class="more-info">${placeholders.moreInformation || 'More Information'}</a>`;
  if (buttonsArray.includes('more_info')) {
    div.querySelector('p').append(document.createRange().createContextualFragment(moreInfoLink));
  }
  const buttonsHTML = `${buttonsArray.includes('accept_all') ? acceptAllButton : ''}${buttonsArray.includes('deny_all') ? rejectAllButton : ''}`;
  if (buttonsHTML) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList = 'controls';
    buttonsDiv.innerHTML = buttonsHTML;
    div.append(buttonsDiv);
  }

  return div;
}

function buildAndShowBanner(consentSections, callback) {
  const bannerSection = consentSections.shift();
  const bannerElement = createBanner(bannerSection);
  const categoriesMap = getCategoriesInBanner(bannerSection, consentSections);
  addListeners(bannerElement, callback, categoriesMap, consentSections);
  document.querySelector('main').append(bannerElement);
}

/**
 * Gets the sections in a consent banner passed fragment.
 * @param {String} consentName name of the consent banner
 * @returns Array of sections in the consent banner section
 */
async function getSectionsFromConsentFragment(consentName) {
  const path = `${BASE_CONSENT_PATH}/${consentName}`;
  const fragment = await loadFragment(path);
  if (!fragment) {
    // eslint-disable-next-line no-console
    console.debug('could not find consent fragment in path ', path);
    return [];
  }
  return [...fragment.querySelectorAll('div.section')];
}

/**
 * Shows a non-intrusive consent banner
 * @param {String} consentName name of the consent banner to show, a document
 * with that name should exist in the /cookie-consent folder
 * @param {Function} consentUpdateCallback callback to execute when consent is updated
 */
export async function showConsentBanner(consentName, consentUpdateCallback) {
  const consentSections = await getSectionsFromConsentFragment(consentName);
  buildAndShowBanner(consentSections, consentUpdateCallback);
}

/**
 * Shows the consent for update.
 * If the consent banner fragment passed as a parameter has detailed consent categories
 * defined, shows the modal dialog with the categories. If not shows the non-intrusive banner.
 * @param {String} consentName name of the consent banner fragment to show, a document
 * with that name should exist in the /cookie-consent folder
 * @param {Function} consentUpdateCallback callback to execute when consent is updated
 */
export async function showConsentBannerForUpdate(consentName, consentUpdateCallback) {
  const consentSections = await getSectionsFromConsentFragment(consentName);
  if (consentSections && (consentSections.length > 1)) {
    // If there are more than one section means that the fragment
    // has defined cookie category sections
    // We skip the banner section, and go to the category sections
    consentSections.shift();
    buildAndShowDialog(consentSections, consentUpdateCallback);
  } else {
    buildAndShowBanner(consentSections, consentUpdateCallback);
  }
}
