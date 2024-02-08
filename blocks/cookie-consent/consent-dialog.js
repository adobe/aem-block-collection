import { loadFragment } from '../fragment/fragment.js';
import {
  decorateIcons, fetchPlaceholders,
} from '../../scripts/aem.js';

function consentUpdated(mode, dialogContainer, consentUpdateCallback, categoriesMap) {
  let selectedCategories;
  if (categoriesMap) {
    selectedCategories = categoriesMap.filter((cat) => (mode === 'ALL' || !cat.optional))
      .map((cat) => cat.code);
  } else {
    // category list is not passed as a parameter, we get it from the checkboxes
    selectedCategories = [...dialogContainer.querySelectorAll('input[type=checkbox][data-cc-code]')]
      .filter((cat) => mode === 'ALL' || (mode === 'NONE' && cat.disabled) || (mode === 'SELECTED' && cat.checked))
      .map((cat) => cat.value);
  }
  // invoke the consent update logic
  consentUpdateCallback(selectedCategories);
  // close the dialog
  dialogContainer.remove();
}

/** FULL DIALOG functions */
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

function categoryHeaderHTML(title, code, optional, selected) {
  return `
  <div>
    <p>${title}</p>
  </div>
  <div class="consent-category-switch">
    <label class="switch">
      <input type="checkbox" data-cc-code="${code}" value="${code}"
              ${!optional || selected ? ' checked ' : ''}
              ${!optional ? 'disabled' : '' }  tabindex=0 />
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

function closeOnClickOutside(dialog) {
  // close dialog on clicks outside the dialog. https://stackoverflow.com/a/70593278/79461
  dialog.addEventListener('click', (event) => {
    const dialogDimensions = dialog.getBoundingClientRect();
    if (event.clientX < dialogDimensions.left || event.clientX > dialogDimensions.right
      || event.clientY < dialogDimensions.top || event.clientY > dialogDimensions.bottom) {
      dialog.close();
    }
  });
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

function getStylingOptions(ds) {
  const trueStrs = ['true', 'yes'];
  return {
    modal: ds.modal ? trueStrs.includes(ds.modal.toLowerCase().trim()) : true,
    showCloseButton: ds.closeButton && trueStrs.includes(ds.closeButton.toLowerCase().trim()),
    position: ds.position ? ds.position.toLowerCase().trim() : 'center',
    // eslint-disable-next-line max-len
    closeOnClick: ds.closeOnClickOutside && trueStrs.includes(ds.closeOnClickOutside.toLowerCase().trim()),
    // eslint-disable-next-line max-len
    displayCategories: ds.displayCategories && trueStrs.includes(ds.displayCategories.toLowerCase().trim()),
  };
}

function buildAndShowDialog(infoSection, categoriesSections, consentUpdateCallback) {
  // eslint-disable-next-line max-len
  const selectedCategories = (window.hlx && window.hlx.consent) ? window.hlx.consent.categories : [];
  // eslint-disable-next-line object-curly-newline, max-len
  const { modal, position, showCloseButton, closeOnClick, displayCategories } = getStylingOptions(infoSection.dataset);
  infoSection.classList = 'consent-info-panel';
  infoSection.append(consentButtonsPanelHTML());
  const ccCategoriesPanel = generateCategoriesPanel(categoriesSections, selectedCategories);

  if (displayCategories) {
    ccCategoriesPanel.style.display = 'block';
    infoSection.querySelector('.consent-select-preferences').style.visibility = 'hidden';
    ccCategoriesPanel.querySelector('.consent-button.decline').style.display = 'none';
  }

  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('dialog-content');
  dialogContent.append(infoSection, ccCategoriesPanel);
  dialog.append(dialogContent);

  if (showCloseButton) {
    addCloseButton(dialog);
  }
  if (closeOnClick) {
    closeOnClickOutside(dialog);
  }

  const dialogContainer = document.createElement('div');
  dialog.addEventListener('close', () => dialogContainer.remove());
  dialogContainer.classList.add('consent', position);
  if (!modal) {
    dialogContainer.classList.add('nomodal');
  }
  document.querySelector('main').append(dialogContainer);
  dialogContainer.append(dialog);

  addListeners(dialogContainer, consentUpdateCallback);
  if (modal) {
    dialog.showModal();
  } else {
    dialog.show();
  }
}

/** MINIMAL BANNER functions */
function addListenersMinimal(container, consentUpdateCallback, categoriesMap, cmpSections) {
  const acceptAll = container.querySelector('.consent.minimal .accept');
  const rejectAll = container.querySelector('.consent.minimal .decline');
  const moreInformation = container.querySelector('.consent.minimal .more-info');

  if (acceptAll) {
    acceptAll.addEventListener('click', () => consentUpdated('ALL', container, consentUpdateCallback, categoriesMap));
  }
  if (rejectAll) {
    rejectAll.addEventListener('click', () => consentUpdated('NONE', container, consentUpdateCallback, categoriesMap));
  }
  if (moreInformation && cmpSections) {
    moreInformation.addEventListener('click', () => {
      buildAndShowDialog(cmpSections.shift(), cmpSections, consentUpdateCallback);
      container.remove();
    });
  }
}

function getCategoriesInMinimalBanner(minimalSection, categoriesSections) {
  if (minimalSection.getAttribute('data-required-cookies') || minimalSection.getAttribute('data-optional-cookies')) {
    const categories = [];
    if (minimalSection.getAttribute('data-required-cookies')) {
      minimalSection.getAttribute('data-required-cookies').split(',')
        .map((c) => c.trim())
        .forEach((c) => categories.push({ code: c, optional: false }));
    }

    if (minimalSection.getAttribute('data-optional-cookies')) {
      minimalSection.getAttribute('data-optional-cookies').split(',')
        .map((c) => c.trim())
        .forEach((c) => categories.push({ code: c, optional: true }));
    }
    return categories;
  }

  if (categoriesSections && categoriesSections.length) {
    return categoriesSections
      .filter((category) => category.dataset && category.dataset.code && category.dataset.optional)
      .map((category) => ({ code: category.dataset.code, optional: ['yes', 'true'].includes(category.dataset.optional.toLowerCase().trim()) }));
  }
  return [{ code: 'CC_ESSENTIAL', optional: false }];
}

function createMinimalBanner(section) {
  const content = section.childNodes;
  const buttonString = section.getAttribute('data-buttons') || 'accept_all';
  const buttonsArray = buttonString.toLowerCase().split(',').map((s) => s.trim());
  const placeholders = fetchPlaceholders();
  const div = document.createElement('div');
  div.classList.add('consent', 'minimal');
  div.append(...content);
  const acceptAllButton = `<button class="consent-button accept primary">${placeholders.consentAcceptAll || 'Accept All'}</button>`;
  const rejectAllButton = `<button class="consent-button decline secondary">${placeholders.consentDeclineAll || 'Decline All'}</button>`;
  const moreInfoLink = `<a class="more-info">${placeholders.moreInformation || 'More Information'}</a>`;
  if (buttonsArray.includes('more_info')) {
    div.querySelector('p').append(document.createRange().createContextualFragment(moreInfoLink));
  }
  const buttonsHTML = `${buttonsArray.includes('accept_all') ? acceptAllButton : ''}${buttonsArray.includes('deny_all') ? rejectAllButton : ''}`;
  if (buttonsHTML) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList = 'controls';
    buttonsDiv.innerHTML = buttonsHTML;
    div.append(buttonsDiv);
  }

  addCloseButton(div);
  return div;
}
/** END MINIMAL BANNER */
// eslint-disable-next-line import/prefer-default-export
export async function showConsentBanner(path, consentUpdateCallback) {
  const fragment = await loadFragment(path);
  if (!fragment) {
    return;
  }
  const cmpSections = [...fragment.querySelectorAll('div.section')];
  const firstSection = cmpSections.shift();
  if (firstSection.classList.contains('minimal')) {
    const minimalDialog = createMinimalBanner(firstSection);
    document.querySelector('main').append(minimalDialog);
    const categoriesMap = getCategoriesInMinimalBanner(firstSection, cmpSections);
    addListenersMinimal(minimalDialog, consentUpdateCallback, categoriesMap, cmpSections);
  } else {
    buildAndShowDialog(firstSection, cmpSections, consentUpdateCallback);
  }
}
