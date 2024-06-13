import {
  decorateIcons, fetchPlaceholders,
} from '../../scripts/aem.js';

/**
 *
 * @param {String} mode type of consent selected { ALL | NONE | SELECTED }
 * @param {Element} dialogContainer
 * @param {*} consentUpdateCallback
 * @param {*} categoriesMap
 */
function consentUpdated(mode, dialogContainer, consentUpdateCallback) {
  // category list is not passed as a parameter, we get it from the checkboxes
  const selectedCategories = [...dialogContainer.querySelectorAll('input[type=checkbox][data-cc-code]')]
    .filter((cat) => mode === 'ALL' || (mode === 'NONE' && cat.disabled) || (mode === 'SELECTED' && cat.checked))
    .map((cat) => cat.value);

  // invoke the consent update logic
  consentUpdateCallback(selectedCategories);
  // close the dialog
  dialogContainer.remove();
}

/** FULL DIALOG functions */
function consentButtonsPanelHTML() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
    <div class='consent-buttons'>
      <button class="consent-button decline secondary">${placeholders.consentDeclineAll || 'Decline All'}</button>
      <button class="consent-button accept primary">${placeholders.consentAcceptAll || 'Accept All'}</button>
    </div>`);
}

function consentCategoriesButtonsPanelHTML() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
    <div class='consent-buttons-preferences'>
      <button class="consent-button only-selected primary">${placeholders.consentSavePrefernces || 'Save my preferences'}</button>
    </div>`);
}

function categoryHeaderHTML(title, code, optional, selected) {
  return `
  <div>
    <p>${title}</p>
  </div>
  <div class="consent-category-switch">
    <label class="switch">
      <input type="checkbox" data-cc-code="${code}" value="${code}"
              ${!optional || selected ? ' checked ' : ''}
              ${!optional ? 'disabled' : ''}  tabindex=0 />
      <span class="slider round"></span>
    </label>
  </div>`;
}

function addCloseButton(banner) {
  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  closeButton.innerHTML = '<span class="icon icon-close"></span>';
  closeButton.addEventListener('click', () => (banner.close ? banner.close() : banner.remove()));
  banner.append(closeButton);
  decorateIcons(closeButton);
}

function generateCategoriesPanel(consentSections, selectedCategories) {
  const placeholders = fetchPlaceholders();
  const ccCategoriesSection = document.createElement('div');
  ccCategoriesSection.classList = 'consent-categories-panel';
  const ccCategoriesDetails = document.createElement('div');
  ccCategoriesDetails.classList = 'accordion';
  consentSections.forEach((category) => {
    const optional = ['yes', 'true'].includes(category.dataset.optional.toLowerCase().trim());
    const title = category.querySelector('h2') || category.firstElementChild.firstElementChild;
    const categoryHeader = document.createElement('div');
    categoryHeader.classList = 'consent-category-header';
    const selected = selectedCategories && selectedCategories.includes(category.dataset.code);
    // eslint-disable-next-line max-len
    categoryHeader.innerHTML = categoryHeaderHTML(title.innerHTML, category.dataset.code, optional, selected);

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(categoryHeader);

    // decorate accordion item body
    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    const bodyContent = [...category.firstElementChild.children].slice(1);
    body.append(...bodyContent);

    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    ccCategoriesDetails.append(details);
    category.remove();
  });

  const ccCategoriesSectionTitle = document.createElement('div');
  ccCategoriesSectionTitle.innerHTML = `<h2>${placeholders.consentCookieSettings || 'Cookie Settings'}</h2>`;
  ccCategoriesSection.append(ccCategoriesSectionTitle);
  ccCategoriesSection.append(ccCategoriesDetails);
  ccCategoriesSection.append(consentCategoriesButtonsPanelHTML(placeholders));
  return ccCategoriesSection;
}

function addListeners(dialogContainer, consentUpdateCallback) {
  dialogContainer.querySelector('.consent-button.accept').addEventListener('click', () => consentUpdated('ALL', dialogContainer, consentUpdateCallback));
  dialogContainer.querySelector('.consent-button.decline').addEventListener('click', () => consentUpdated('NONE', dialogContainer, consentUpdateCallback));
  dialogContainer.querySelector('.consent-button.only-selected').addEventListener('click', () => consentUpdated('SELECTED', dialogContainer, consentUpdateCallback));
}

/**
 * Shows a modal dialog with detail information about the different
 * categories of cookies the website uses, and enables the users
 * to select individually the different categories they want to
 * allow or reject
 * @param {*} categoriesSections array of div sections containing the categories.
 * The first section is considered the introduction, the rest are considered
 * a category of cookies each
 * @param {Function} consentUpdateCallback callback to invoke when consent is updated
 */
// eslint-disable-next-line import/prefer-default-export
export function buildAndShowDialog(categoriesSections, consentUpdateCallback) {
  // eslint-disable-next-line max-len
  const selectedCategories = window.consent ? window.consent.categories : [];
  // eslint-disable-next-line object-curly-newline, max-len
  const infoSection = categoriesSections.shift();
  infoSection.classList = 'consent-info-panel';
  infoSection.append(consentButtonsPanelHTML());
  const ccCategoriesPanel = generateCategoriesPanel(categoriesSections, selectedCategories);
  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('dialog-content');
  dialogContent.append(infoSection, ccCategoriesPanel);
  dialog.append(dialogContent);

  addCloseButton(dialog);

  const dialogContainer = document.createElement('div');
  dialogContainer.classList = 'consent';
  dialog.addEventListener('close', () => dialogContainer.remove());
  document.querySelector('main').append(dialogContainer);
  dialogContainer.append(dialog);

  addListeners(dialogContainer, consentUpdateCallback);
  dialog.showModal();
}
