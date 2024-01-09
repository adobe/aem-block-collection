import { loadFragment } from '../fragment/fragment.js';
import { decorateButtons, decorateIcons } from '../../scripts/aem.js';

function getCell(table, key) {
  const resultRow = Array.from(table.children)
    .find((row) => row.firstElementChild.textContent.toLowerCase() === key.toLowerCase());
  return resultRow?.lastElementChild;
}

function formatButton(button) {
  if (button.classList.contains('button-container')) return button;

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button-container');
  buttonContainer.innerHTML = '<a href="#" class="button"></a></div>';
  buttonContainer.querySelector('a').textContent = button.textContent;
  return buttonContainer;
}

export function createDialog() {
  const dialog = document.createElement('dialog');

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.innerHTML = '<span class="icon icon-close"></span>';
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

  return dialog;
}

export default async function decorate(block) {
  const button = formatButton(getCell(block, 'button'));
  const content = getCell(block, 'content');
  const fragmentUrl = getCell(block, 'fragment')?.querySelector('a')?.href;
  let fragmentContentAdded = false;
  block.textContent = '';

  const dialog = createDialog();
  if (content) {
    dialog.append(...content.childNodes);
  }
  block.append(dialog);

  block.append(button);
  button.firstElementChild.addEventListener('click', async (e) => {
    e.preventDefault();

    if (fragmentUrl && !fragmentContentAdded) {
      const fragment = await loadFragment(new URL(fragmentUrl.trim()).pathname);
      dialog.append(...fragment.childNodes);
      fragmentContentAdded = true;
    }
    dialog.showModal();
  });
  decorateIcons(block);
  decorateButtons(block);
}
