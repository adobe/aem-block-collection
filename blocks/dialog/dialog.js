import {loadFragment} from "../fragment/fragment.js";
import {decorateButtons} from "../../scripts/aem.js";

export default async function decorate(block) {
  decorateButtons(block);
  const button = getCell(block, 'button');
  const content = getCell(block, 'content');
  const fragmentUrl = getCell(block, 'fragment')?.querySelector('a')?.href
  block.textContent = '';

  const dialog = document.createElement('dialog');

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.append(closeButton);

  // close dialog on clicks outside the dialog. https://stackoverflow.com/a/70593278/79461
  dialog.addEventListener('click', (event) => {
    const dialogDimensions = dialog.getBoundingClientRect();
    if (event.clientX < dialogDimensions.left || event.clientX > dialogDimensions.right
      || event.clientY < dialogDimensions.top || event.clientY > dialogDimensions.bottom) {
      dialog.close();
    }
  });

  await addContent(dialog, content, fragmentUrl);
  block.append(dialog);

  block.append(button);
  button.addEventListener('click', () => dialog.showModal());
}


async function addContent(dialog, content, fragmentUrl) {
  if (content) {
    dialog.append(...content.childNodes);
  } else if (fragmentUrl) {
    const fragment = await loadFragment(new URL(fragmentUrl.trim()).pathname);
    dialog.append(...fragment.childNodes);
  }
}

function getCell(table, key) {
  const resultRow = Array.from(table.children)
    .find(row => row.firstElementChild.textContent.toLowerCase() === key.toLowerCase());
  return resultRow?.lastElementChild;
}
