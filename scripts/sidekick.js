/* eslint-disable import/no-cycle */
import { NX_ORIGIN } from './scripts.js';

let expMod;

async function loadExp() {
  if (!expMod) {
    // First import will run automatically
    expMod = await import(`${NX_ORIGIN}/nx/public/plugins/exp/exp.js`);
    return;
  }
  // 2nd time, call the func
  expMod.default();
}

(async function sidekick() {
  const sk = document.querySelector('aem-sidekick');
  if (!sk) return;
  sk.addEventListener('custom:experimentation', loadExp);
}());
