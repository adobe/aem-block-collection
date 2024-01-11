import {
  getMetadata,
} from '../../scripts/aem.js';
import { showCookieConsentDialog } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

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
    fragment.querySelector('a[title="Cookie preferences"]').addEventListener('click', (e) => {
      showCookieConsentDialog();
      e.preventDefault();
    });
  }
  // decorate footer DOM
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}

async function cookiePreferences() {
  return await showCookieConsentDialog()
}