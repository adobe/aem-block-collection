/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */
import { moveInstrumentation } from '../../scripts/scripts.js';

function handleSelection(event) {
  const { detail } = event;
  const resource = detail?.resource;
  if (resource) {
    const element = document.querySelector(`[data-aue-resource="${resource}"]`);
    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');
    block.querySelectorAll('details').forEach((details) => {
      details.open = false;
    });
    element.open = true;
  }
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    moveInstrumentation(label, summary);
    summary.append(...label.childNodes);
    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    moveInstrumentation(row, details);
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });

  block.addEventListener('aue:ui-select', handleSelection);
}
