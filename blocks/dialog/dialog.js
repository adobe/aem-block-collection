// todo: support fragments
export default async function decorate(block) {
  const button = block.querySelector('.button-container');
  button.remove();

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

  dialog.append(...block.childNodes);
  block.append(dialog);

  block.append(button);
  button.addEventListener('click', () => dialog.showModal());
}

