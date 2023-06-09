import { loadCSS } from '../lib-franklin.js';

/**
 * Creates a modal with id modalId, or if that id already exists, returns the existing modal.
 * To show the modal, call `modal.showModal()`.
 * @param modalId
 * @param createContent Callback called when the modal is first opened; should return html string
 * for the modal content
 * @param addEventListeners Optional callback called when the modal is first opened;
 * should add event listeners to body if needed
 * @returns {Promise<HTMLElement>} The <dialog> element, after loading css
 */
export default async function getModal(modalId, createContent, addEventListeners) {
  // TODO: update lib franklin, so we can await loadCSS directly.
  await new Promise((res) => {
    loadCSS('/styles/modal/modal.css', () => res());
  });

  let dialogElement = document.getElementById(modalId);
  if (!dialogElement) {
    dialogElement = document.createElement('dialog');
    dialogElement.id = modalId;

    const contentHTML = createContent?.() || '';

    dialogElement.innerHTML = `
          <button name="close"><span class="close-x"></span></button>
          ${contentHTML}
      `;

    document.body.appendChild(dialogElement);

    dialogElement.querySelector('button[name="close"]')
      .addEventListener('click', () => {
        dialogElement.close();
      });

    addEventListeners?.(dialogElement);
  }
  return dialogElement;
}
