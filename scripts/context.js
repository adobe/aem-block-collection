import { loadCSS } from './aem.js';

const EDITABLE_SELECTORS = 'h1, h2, p';

function handleEditable(editable) {
  const childEdits = editable.querySelectorAll(EDITABLE_SELECTORS);
  if (childEdits.length > 0) return;
  editable.dataset.edit = true;
  editable.addEventListener('click', (e) => {
    // If it's already editable, do nothing
    const isEditable = e.target.getAttribute('contenteditable');
    if (isEditable) return;

    // Turn off all other editables
    const prevEditables = document.body.querySelectorAll('[contenteditable]');
    prevEditables.forEach((prev) => { prev.removeAttribute('contenteditable'); });

    // Set the editable attr and set focus
    editable.setAttribute('contenteditable', true);
    setTimeout(() => { editable.focus(); }, 150);
  });
}

// eslint-disable-next-line no-unused-vars
export default async function init(html) {
  await loadCSS('/styles/context.css');
  const editables = document.body.querySelectorAll(EDITABLE_SELECTORS);
  editables.forEach((editable) => { handleEditable(editable); });
}
