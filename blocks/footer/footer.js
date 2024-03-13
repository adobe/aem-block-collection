import { getMetadata, fetchPlaceholders } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { showConsentForUpdate } from '../consent/consent.js';
/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  block.textContent = '';

  // load footer fragment
  const footerPath = footerMeta.footer || '/footer';
  const fragment = await loadFragment(footerPath);
  if (getMetadata('cookie-consent')) {
    const consentLinkText = fetchPlaceholders()['cookie-preferences-link'] || 'Cookie preferences';
    fragment.querySelector(`a[title="${consentLinkText}"]`).addEventListener('click', (e) => {
      showConsentForUpdate(getMetadata('cookie-consent'));
      e.preventDefault();
    });
  }

  // decorate footer DOM
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}
