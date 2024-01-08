/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */

function hasWrapper(el) {
  return !!el.firstElementChild && window.getComputedStyle(el.firstElementChild).display === 'block';
}

function toggleAccordionContent(e) {
  const target = e.target.closest('button');
  const expanded = target.getAttribute('aria-expanded') === 'true';
  // toggle button properties
  target.setAttribute('aria-expanded', !expanded);
  // toggle related content properties
  const block = target.closest('.block');
  const content = block.querySelector(`#${target.getAttribute('aria-controls')}`);
  content.hidden = expanded;
}

export default async function decorate(block) {
  const lastAccordion = [...document.querySelectorAll('.accordion[data-num]')].pop();
  const id = lastAccordion ? parseInt(lastAccordion.dataset.num, 10) + 1 : 1;
  block.dataset.num = id;
  [...block.children].forEach((row, i) => {
    const [title, content] = row.children;
    // build accordion title
    const button = document.createElement('button');
    button.className = 'accordion-title';
    button.id = `accordionTitle${id}${i + 1}`;
    button.setAttribute('type', 'button');
    button.setAttribute('aria-expanded', false);
    button.setAttribute('aria-controls', `accordionContent${id}${i + 1}`);
    if (!hasWrapper(title)) {
      button.innerHTML = `<p>${title.innerHTML}</p>`;
    } else {
      button.innerHTML = title.innerHTML;
    }
    title.replaceWith(button);
    button.addEventListener('click', toggleAccordionContent);
    // decorate accordion content
    content.className = 'accordion-content';
    content.id = `accordionContent${id}${i + 1}`;
    content.setAttribute('role', 'region');
    content.setAttribute('aria-labelledby', `accordionTitle${id}${i + 1}`);
    if (!hasWrapper(content)) {
      content.innerHTML = `<p>${content.innerHTML}</p>`;
    }
    content.hidden = true;
  });
}
