import { loadFragment } from '../fragment/fragment.js';
import {
  decorateIcons, fetchPlaceholders,
} from '../../scripts/aem.js';

async function createDialog(contentNodes, { modal, position, showCloseButton, closeOnClick }) {
  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('dialog-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  let closeButton;
  if (showCloseButton) {
    closeButton = document.createElement('button');
    closeButton.classList.add('close-button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.type = 'button';
    closeButton.innerHTML = '<span class="icon icon-close"></span>';
    closeButton.addEventListener('click', () => dialog.close());
    dialog.append(closeButton);
  }

  if (closeOnClick) {
    // close dialog on clicks outside the dialog. https://stackoverflow.com/a/70593278/79461
    dialog.addEventListener('click', (event) => {
      const dialogDimensions = dialog.getBoundingClientRect();
      if (event.clientX < dialogDimensions.left || event.clientX > dialogDimensions.right
        || event.clientY < dialogDimensions.top || event.clientY > dialogDimensions.bottom) {
        dialog.close();
      }
    });
  }

  const dialogContainer = document.createElement('div');
  dialog.addEventListener('close', () => dialogContainer.remove());
  dialogContainer.classList.add('cconsent', position);
  if (!modal) {
    dialogContainer.classList.add('nomodal');
  }
  document.querySelector('main').append(dialogContainer);

  if (closeButton) {
    decorateIcons(closeButton);
  }

  dialogContainer.append(dialog);

  return { dialogContainer, show: () => (modal ? dialog.showModal() : dialog.show()) };
}

/** DIALOG METHODS */

function consentButtonsPanelHTML() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
    <div class='consent-controls'>
      <div class='consent-select-preferences'>
        <a class="consent-select-preferences-link" href='#'>${placeholders.consentSelectPreferences || 'Select my preferences'}</a>
      </div>
      <div class='consent-buttons'>
        <button class="consent-button decline secondary">${placeholders.consentDeclineAll || 'Decline All'}</button>
        <button class="consent-button accept primary">${placeholders.consentAcceptAll || 'Accept All'}</button>
      </div>
    </div>`);
}

function consentCategoriesButtonsPanelHTML() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
    <div class='consent-buttons-preferences'>
      <button class="consent-button decline secondary">${placeholders.consentDeclineAll || 'Decline All'}</button>
      <button class="consent-button only-selected primary">${placeholders.consentSavePrefernces || 'Save my preferences'}</button>
    </div>`);
}

function acceptCategoriesButtonsPanelHTML() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
  <button class="consent-button accept primary">${placeholders.consentAcceptAll || 'Accept All'}</button>`);
}

function declineCategoriesButtonsPanelHTML() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
  <button class="consent-button decline primary">${placeholders.consentDeclineAll || 'Decline All'}</button>`);
}

function consentCategoriesmoreinfo() {
  const placeholders = fetchPlaceholders();
  return document.createRange().createContextualFragment(`
    <a href="#" class="more-info">${placeholders.moreInformation || 'More Information'}</a>`);
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
              ${!optional ? 'disabled' : ''} />
      <span class="slider round"></span>
    </label>
  </div>`;
}

function createMinimalBanner(content, buttons) {
  const div = document.createElement('div');
  div.append(...content);
  //div.append(content);
  div.classList.add('cconsent', 'minimal');
  const div2 = document.createElement('div');
  //div2.append(buttons);
  if (buttons.toLowerCase().includes('accept_all'))
    div2.append(acceptCategoriesButtonsPanelHTML());
  if (buttons.toLowerCase().includes('deny_all'))
    div2.append(declineCategoriesButtonsPanelHTML());
  if (buttons.toLowerCase().includes('more_info'))
     div.querySelector('p').append(consentCategoriesmoreinfo());
  div.append(div2);
  return div;
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

function consentUpdated(mode, dialogContainer, consentUpdateCallback, categoriesMap) {
  let selectedCategories;
  if (categoriesMap) {
    selectedCategories = categoriesMap.filter((cat) => (mode === 'ALL' || !cat.optional))
      .map((cat) => cat.code);
  } else {
    selectedCategories = [dialogContainer.querySelectorAll('input[type=checkbox][data-cc-code]')]
      .filter((cat) => mode === 'ALL' || (mode === 'NONE' && cat.disabled) || (mode === 'SELECTED' && cat.checked))
      .map((cat) => cat.value);
  }
  // invoke the consent update logic
  consentUpdateCallback(selectedCategories);
  // close the dialog
  dialogContainer.remove();
}

function toggleCategoriesPanel(dialogContainer) {
  dialogContainer.querySelector('.consent-info-panel').style.display = 'none';
  dialogContainer.querySelector('.consent-categories-panel').style.display = 'block';
}

function addListeners(dialogContainer, consentUpdateCallback) {
  dialogContainer.querySelector('.consent-select-preferences-link').addEventListener('click', () => toggleCategoriesPanel(dialogContainer, consentUpdateCallback));
  dialogContainer.querySelector('.consent-button.accept').addEventListener('click', () => consentUpdated('ALL', dialogContainer, consentUpdateCallback, dialogContainer));
  dialogContainer.querySelectorAll('.consent-button.decline').forEach((b) => b.addEventListener('click', () => consentUpdated('NONE', dialogContainer, consentUpdateCallback, dialogContainer)));
  dialogContainer.querySelector('.consent-button.only-selected').addEventListener('click', () => consentUpdated('SELECTED', dialogContainer, consentUpdateCallback, dialogContainer));
}

function addListenersMinimal(container, consentUpdateCallback, cmpSections) {
  // eslint-disable-next-line max-len
  const categoriesMap = cmpSections.filter((category) => category.dataset && category.dataset.code && category.dataset.optional)
    // eslint-disable-next-line max-len
    .map((category) => ({ code: category.dataset.code, optional: ['yes', 'true'].includes(category.dataset.optional.toLowerCase().trim()) }));

  const acceptAll = container.querySelector('.cconsent.minimal .accept');
  const rejectAll = container.querySelector('.cconsent.minimal .decline');
  const moreInformation = container.querySelector('.cconsent.minimal .more-info');

  if (acceptAll) {
    acceptAll.addEventListener('click', () => consentUpdated('ALL', container, consentUpdateCallback, categoriesMap));
  }
  if (rejectAll) {
    rejectAll.addEventListener('click', () => consentUpdated('NONE', container, consentUpdateCallback, categoriesMap));
  }
  if (moreInformation) {
    moreInformation.addEventListener('click', () => {
      buildAndShowDialog(cmpSections.shift(), cmpSections, consentUpdateCallback);
      container.remove();
    });
  }
}

function getStylingOptions(dataset) {
  return {
    modal: dataset.modal ? ['true', 'yes'].includes(dataset.modal.toLowerCase().trim()) : true,
    showCloseButton: dataset.closeButton && ['false', 'no'].includes(dataset.closeButton.toLowerCase().trim()),
    position: dataset.position ? dataset.position.toLowerCase().trim() : 'center',
    closeOnClick: dataset.closeOnClickOutside && ['false', 'no'].includes(dataset.closeOnClickOutside.toLowerCase().trim()),
    style: dataset.style,
  };
}

async function buildAndShowDialog(infoSection, categoriesSections, consentUpdateCallback) {
  // eslint-disable-next-line max-len
  const selectedCategories = (window.hlx && window.hlx.consent) ? window.hlx.consent.categories : [];
  const ccInfoPanel = infoSection;
  ccInfoPanel.classList = 'consent-info-panel';
  ccInfoPanel.append(consentButtonsPanelHTML());
  // eslint-disable-next-line max-len
  const ccCategoriesPanel = generateCategoriesPanel(categoriesSections, selectedCategories);
  const stylingOptions = getStylingOptions(infoSection.dataset);
  // eslint-disable-next-line max-len
  const { dialogContainer, show } = await createDialog([ccInfoPanel, ccCategoriesPanel], stylingOptions);
  addListeners(dialogContainer, consentUpdateCallback);
  show();
}
// eslint-disable-next-line import/prefer-default-export
export async function showDialog(path, consentUpdateCallback) {
  const fragment = await loadFragment(path);
  if (!fragment) {
    return;
  }
  const cmpSections = [...fragment.querySelectorAll('div.section')];
  const firstSection = cmpSections.shift();
  if (firstSection.classList.contains('minimal')) {
    const minimalDialog = createMinimalBanner(firstSection.childNodes, firstSection.getAttribute('data-buttons'));
    document.querySelector('main').append(minimalDialog);
    addListenersMinimal(minimalDialog, consentUpdateCallback, cmpSections);
  } else {
    buildAndShowDialog(firstSection, cmpSections);
  }
}
