import { readBlockConfig } from '../../scripts/aem.js';
import { manageConsentUpdate } from '../../scripts/scripts.js';

function consentButtonsPanel() {
  return document.createRange().createContextualFragment(`
    <div class='consent-controls'>
      <div class='consent-select-preferences'>
        <a class="consent-select-preferences-link" href='#'>Select my preferences</a>
      </div>
      <div class='consent-buttons'>
        <button class="consent-button decline secondary">Decline All</button>
        <button class="consent-button accept primary">Accept All</button>
      </div>
    </div>`);
}

function consentCategoriesButtonsPanel() {
  return document.createRange().createContextualFragment(`
    <div class='consent-buttons-preferences'>
      <button class="consent-button decline secondary">Decline All</button>
      <button class="consent-button only-selected primary">Save my preferences</button>
    </div>`);
}

function categoryHeaderHTML(title, code, optional) {
  return `
  <div>
    <p>${title}</p>
  </div>
  <div class="consent-category-switch">
    <label class="switch">
      <input type="checkbox" data-cc-code="${code}" value="${code}" ${!optional ? ' checked disabled' : ''}/>
      <span class="slider round"></span>
    </label>
  </div>`;
}

function consentUpdated(mode, block) {
  const selectedCategories = [...document.querySelectorAll('input[type=checkbox][data-cc-code]')]
    .filter((cat) => mode === 'ALL' || (mode === 'NONE' && cat.disabled) || (mode === 'SELECTED' && cat.checked))
    .map((cat) => cat.value);
  // invoke the consent update logic
  manageConsentUpdate(selectedCategories);
  // close the dialog
  const dialog = block.closest('dialog');
  if (dialog) {
    dialog.remove();
  }
}

function toggleCategoriesPanel(block) {
  block.querySelector('.consent-info-panel').style.display = 'none';
  block.querySelector('.consent-categories-panel').style.display = 'block';
}
function addListeners(block) {
  block.querySelector('.consent-select-preferences-link').addEventListener('click', () => toggleCategoriesPanel(block));
  block.querySelector('.consent-button.accept').addEventListener('click', () => consentUpdated('ALL', block));
  block.querySelectorAll('.consent-button.decline').forEach((b) => b.addEventListener('click', () => consentUpdated('NONE', block)));
  block.querySelector('.consent-button.only-selected').addEventListener('click', () => consentUpdated('SELECTED', block));
}

export default function decorate(block) {
  const cmpSections = [...block.querySelectorAll('h2')].map((title) => title.parentElement);
  const cookiesInfoContent = cmpSections.shift();
  const ccInfoSection = document.createElement('div');
  ccInfoSection.classList = 'consent-info-panel';
  ccInfoSection.append(cookiesInfoContent);
  ccInfoSection.append(consentButtonsPanel());

  const ccCategoriesSection = document.createElement('div');
  ccCategoriesSection.classList = 'consent-categories-panel';
  const ccCategoriesDetails = document.createElement('div');
  ccCategoriesDetails.classList = 'accordion';
  cmpSections.forEach((category) => {
    const metadataDiv = category.querySelector('.category-metadata');
    const categoryConfig = readBlockConfig(metadataDiv);
    metadataDiv.remove();
    const optional = ['yes', 'true'].includes(categoryConfig.optional.toLowerCase().trim());
    const categoryTitle = category.children[0].innerHTML;
    const categoryHeader = document.createElement('div');
    categoryHeader.classList = 'consent-category-header';
    categoryHeader.innerHTML = categoryHeaderHTML(categoryTitle, categoryConfig.code, optional);

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(categoryHeader);

    // decorate accordion item body
    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    const bodyContent = [...category.children].slice(1);
    body.append(...bodyContent);

    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    ccCategoriesDetails.append(details);
    category.remove();
  });

  const ccCategoriesSectionTitle = document.createElement('div');
  ccCategoriesSectionTitle.innerHTML = '<h2>Cookie Settings</h2>';
  ccCategoriesSection.append(ccCategoriesSectionTitle);
  ccCategoriesSection.append(ccCategoriesDetails);
  ccCategoriesSection.append(consentCategoriesButtonsPanel());
  block.firstElementChild.remove();
  block.append(ccInfoSection);
  block.append(ccCategoriesSection);

  addListeners(block);
}
