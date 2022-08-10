import {
  decorateMain,
  loadBlocks,
} from '../../scripts/scripts.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
async function loadFragment(path) {
  const resp = await fetch(`${path}.plain.html`);
  if (resp.ok) {
    const main = document.createElement('main');
    main.innerHTML = await resp.text();
    decorateMain(main);
    await loadBlocks(main);
    return main;
  }
  return null;
}

export default async function decorate(block) {
  const ref = block.textContent.trim();
  const path = new URL(ref, window.location.href).pathname.split('.')[0];
  const main = await loadFragment(path);
  const blockSection = block.closest('.section');
  const fragmentSection = main.querySelector(':scope .section');
  while (fragmentSection && fragmentSection.firstChild) {
    blockSection.insertBefore(fragmentSection.firstChild, block.closest('.fragment-wrapper'));
  }
  block.closest('.fragment-wrapper').remove();
}
