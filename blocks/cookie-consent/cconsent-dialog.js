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

function consentButtonsPanelHTML(placeholders) {
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

function consentCategoriesButtonsPanelHTML(placeholders) {
  return document.createRange().createContextualFragment(`
    <div class='consent-buttons-preferences'>
      <button class="consent-button decline secondary">${placeholders.consentDeclineAll || 'Decline All'}</button>
      <button class="consent-button only-selected primary">${placeholders.consentSavePrefernces || 'Save my preferences'}</button>
    </div>`);
}

function acceptCategoriesButtonsPanelHTML() {
  return document.createRange().createContextualFragment(`
  <button class="consent-button accept primary">Accept All</button>`);
}

function declineCategoriesButtonsPanelHTML() {
  return document.createRange().createContextualFragment(`
  <button class="consent-button accept primary">Decline All</button>`);
}

function consentCategoriesmoreinfo() {
  return document.createRange().createContextualFragment(`
<a href=/more_information/> More Information</a>`);
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
  //div.querySelector('#show-preferences').addEventListener('click', '');
  //div.querySelector('#accept-all').addEventListener('click', '');
  return div;
}

function generateCategoriesPanel(consentSections, selectedCategories, placeholders) {
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

function consentUpdated(mode, dialogContainer, consentUpdateCallback) {
  const selectedCategories = [...document.querySelectorAll('input[type=checkbox][data-cc-code]')]
    .filter((cat) => mode === 'ALL' || (mode === 'NONE' && cat.disabled) || (mode === 'SELECTED' && cat.checked))
    .map((cat) => cat.value);
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
  dialogContainer.querySelector('.consent-button.accept').addEventListener('click', () => consentUpdated('ALL', dialogContainer, consentUpdateCallback));
  dialogContainer.querySelectorAll('.consent-button.decline').forEach((b) => b.addEventListener('click', () => consentUpdated('NONE', dialogContainer, consentUpdateCallback)));
  dialogContainer.querySelector('.consent-button.only-selected').addEventListener('click', () => consentUpdated('SELECTED', dialogContainer, consentUpdateCallback));
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
// eslint-disable-next-line import/prefer-default-export
export async function showDialog(path, consentUpdateCallback) {
  const fragment = await loadFragment(path);
  if (!fragment) {
    return;
  }
  const placeholders = fetchPlaceholders();
  // eslint-disable-next-line max-len
  const selectedCategories = (window.hlx && window.hlx.consent) ? window.hlx.consent.categories : [];

  const cmpSections = [...fragment.querySelectorAll('div.section')];

  const firstSection = cmpSections.shift();
  if (firstSection.classList.contains('minimal')) {
    const minimalDialog = createMinimalBanner(firstSection.childNodes, firstSection.getAttribute('data-buttons'),placeholders);
    //console.log(minimalDialog);
    console.log(firstSection);
    //console.log(firstSection.getAttribute('data-buttons'));
    document.querySelector('main').append(minimalDialog);
  } else {
    const ccInfoPanel = firstSection;
    ccInfoPanel.classList = 'consent-info-panel';
    ccInfoPanel.append(consentButtonsPanelHTML(placeholders));
    // eslint-disable-next-line max-len
    const ccCategoriesPanel = generateCategoriesPanel(cmpSections, selectedCategories, placeholders);
    fragment.append(ccInfoPanel);
    fragment.append(ccCategoriesPanel);
    const stylingOptions = getStylingOptions(firstSection.dataset);
    const { dialogContainer, show } = await createDialog(fragment.childNodes, stylingOptions);
    addListeners(dialogContainer, consentUpdateCallback);
    show();
  }
}
