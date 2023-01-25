/*
 * Example Franklin Fragment
 */

import { FranklinFragment } from '../franklin-fragment/franklin-fragment.js';

export default async function decorate(block) {
  customElements.define('franklin-fragment', FranklinFragment);
  const fragmentContainer = document.createElement('div');
  fragmentContainer.innerHTML = /* html */'<franklin-fragment url="https://main--helix-playground--dylandepass.hlx.page/fragments/carousel.plain.html"></franklin-fragment>';
  block.replaceWith(fragmentContainer);
}
