import { getMetadata } from '../../scripts/aem.js';
import { sampleRUM } from '../../scripts/aem.js';

/**
 * loads and decorates the consent management
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const cmpElements = [...block.children];
  const cookiesInfoContent = cmpElements.shift();
  const categoriesData = cmpElements.map((c) => readCategory(c))
    .filter((c) => c);

  const mainDiv = document.createElement('div');
  mainDiv.classList.add('consent-dialog');
  mainDiv.appendChild(cookiesInfoContent);
  mainDiv.appendChild(consentButtonsPanel());
  block.appendChild(mainDiv);
  block.appendChild(consentCategoriesPanel(categoriesData));
  addListeners(categoriesData);
}

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

function consentCategoriesPanel(categories) {
  const categoriesPanel = document.createElement('div');
  categoriesPanel.classList.add('consent-categories');
  categories.forEach((c) => {
    const catDiv = document.createElement('div');
    catDiv.classList.add('consent-category');
    catDiv.appendChild(c.description);
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('consent-category-header');
    headerDiv.appendChild(c.title);
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.value = c.code;
    check.checked = !c.optional;
    check.disabled = !c.optional;
    headerDiv.appendChild(check);
    const descriptionDiv = document.createElement('div');
    descriptionDiv.classList.add('consent-category-desc');
    descriptionDiv.appendChild(c.description);
    catDiv.appendChild(headerDiv);
    catDiv.appendChild(descriptionDiv);
    categoriesPanel.appendChild(catDiv);
  });
  categoriesPanel.appendChild(consentCategoriesButtonsPanel());
  return categoriesPanel;

}

function consentCategoriesButtonsPanel() {
  return document.createRange().createContextualFragment(`
    <div class='consent-controls'>
      <div class='consent-buttons-preferences'>
        <button class="consent-button decline secondary">Decline All</button>
        <button class="consent-button only-selected primary">Save my preferences</button>
      </div>
    </div>`);
}

function readCategory(category) {
  category.remove();
  if (category.childElementCount <= 1) {
    //Categories marker
    return undefined;
  }

  if ('code' === category.firstElementChild.innerText.toLowerCase()) {
    // column header
    return undefined;
  }

  return {
    code: category.children[0].innerText,
    title: category.children[1],
    description: category.children[2],
    optional: ['yes', 'true'].includes(category.children[3].innerText.toLowerCase().trim()),
  };
}

function addListeners(categoriesData) {
  document.querySelector('.consent-button.accept').addEventListener('click', () => manageConsent('ALL', categoriesData));
  document.querySelectorAll('.consent-button.decline').forEach((b) => b.addEventListener('click', () => manageConsent('NONE', categoriesData)));
  document.querySelector('.consent-button.only-selected').addEventListener('click', () => manageConsent('SELECTED', categoriesData));
}

function manageConsent(selection, categoriesData) {

  const selectedCategories = [];
  if (selection === 'ALL') {
    categoriesData.map((c) => c.code)
                  .forEach((cat) => selectedCategories.push(cat));
  } else if (selection === 'NONE') {
    categoriesData.filter((c) => !c.optional)
                  .map((c) => c.code)
                  .forEach((cat) => selectedCategories.push(cat));
  } else {
    [...document.querySelectorAll('.consent-category input[type="checkbox"]:checked')]
                  .map((check) => check.value)
                  .forEach((cat) => selectedCategories.push(cat));
  }
  console.log('manageConsent', selectedCategories);
  sampleRUM('consent', selectedCategories);
  const consentUpdateEvent = new CustomEvent('consent-updated', selectedCategories);
  
  dispatchEvent(consentUpdateEvent);
}