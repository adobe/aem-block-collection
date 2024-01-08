
export default async function decorate(block) {
  const button = block.querySelector('.button-container');
  button.remove();

  const dialog = document.createElement('dialog');
  const closeButton = document.createElement('button');
  closeButton.classList.add('modal-close');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.append(closeButton);

  dialog.append(...block.childNodes);


  block.append(dialog);


  dialog.addEventListener('click', (event) => {
    // react to clicks outside the dialog. https://stackoverflow.com/a/70593278/79461
    const dialogDimensions = dialog.getBoundingClientRect();
    if (event.clientX < dialogDimensions.left || event.clientX > dialogDimensions.right
      || event.clientY < dialogDimensions.top || event.clientY > dialogDimensions.bottom) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => document.body.style.overflow = "");

  block.append(button);
  button.addEventListener('click', () => {
    dialog.showModal();
    document.body.style.overflow = "hidden"
  });

}

