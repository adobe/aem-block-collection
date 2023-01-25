/*
 * Example Franklin Fragment
 */

import { FranklinFragment } from '../franklin-fragment/franklin-fragment.js';

export default async function decorate(block) {
  customElements.define('franklin-fragment', FranklinFragment);
  block.innerHTML = /* html */'<franklin-fragment url="https://main--helix-playground--dylandepass.hlx.page/fragments/carousel.plain.html"></franklin-fragment>';
}
