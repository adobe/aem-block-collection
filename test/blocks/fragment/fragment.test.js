/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

const sectionLoaded = async (section) => new Promise((resolve) => {
  // wait for section to finish loading
  const check = setInterval(() => {
    if (section.dataset.sectionStatus === 'loaded') {
      clearInterval(check);
      resolve();
    }
  }, 100);
});

describe('Fragment block', () => {
  it('Replaces fragment block with fragment content', async () => {
    document.body.innerHTML = await readFile({ path: './block.html' });
    await import('../../../scripts/scripts.js');
    const section = document.querySelector('.section');
    await sectionLoaded(section);
    expect(section.textContent.trim()).to.equal('Hello world!');
    expect(section.classList.contains('example-container')).to.be.true;
    expect(section.classList.contains('example-style')).to.be.true;
    expect(section.dataset.exampleData).to.equals('Example Value');
    expect(document.querySelectorAll('.fragment').length).to.equal(1);
  });
});
