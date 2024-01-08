/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */

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
  [...block.children].forEach((row, i) => {
    const [title, content] = row.children;
    // build accordion title
    const button = document.createElement('button');
    button.className = 'accordion-title';
    button.id = `accordionTitle${i + 1}`;
    button.setAttribute('type', 'button');
    button.setAttribute('aria-expanded', false);
    button.setAttribute('aria-controls', `accordionContent${i + 1}`);
    const titleHasWrapper = title.firstElementChild;
    if (!titleHasWrapper) {
      button.innerHTML = `<p>${title.innerHTML}</p>`;
    } else {
      button.innerHTML = title.innerHTML;
    }
    title.replaceWith(button);
    button.addEventListener('click', toggleAccordionContent);
    // decorate accordion content
    content.className = 'accordion-content';
    content.id = `accordionContent${i + 1}`;
    content.setAttribute('role', 'region');
    content.setAttribute('aria-labelledby', `accordionTitle${i + 1}`);
    const contentHasWrapper = content.firstElementChild;
    if (!contentHasWrapper) {
      content.innerHTML = `<p>${content.innerHTML}</p>`;
    }
    content.hidden = true;
  });
}
