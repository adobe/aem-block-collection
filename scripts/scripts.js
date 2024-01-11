import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  getMetadata,
} from './aem.js';

// eslint-disable-next-line import/no-cycle
import { openModal } from '../blocks/modal/modal.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
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
async function cookieConsent() {
  const cookieConsentPath = getMetadata('cookie-consent');
  if (!cookieConsentPath) {
    return;
  }
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

/**
 * Builds cookie consent block and prepends to main in a new section.
 * @param {Element} main The container element

async function cookieConsent() {
  const cookieConsentPath = getMetadata('cookie-consent');
  if (cookieConsentPath) {
    import('./consent-management.js').then((cc) => cc.loadConsent(cookieConsentPath));
  }
}  */

function buildCookieConsentDialog(main) {
  if (window.location.href.includes('/cookie-consent/')
    || (main.getAttribute('data-fragment-path') && main.getAttribute('data-fragment-path').includes('/cookie-consent/'))) {
    main.classList.add('consent');
    const cmpSections = [...main.children];
    const section = document.createElement('div');
    const ccBlock = document.createElement('div');
    ccBlock.append(...cmpSections);
    section.append(buildBlock('cookie-consent', ccBlock));
    main.append(section);
  }
}


/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(main) {
  main.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');

    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    buildCookieConsentDialog(main);
    autolinkModals(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  cookieConsent();
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
