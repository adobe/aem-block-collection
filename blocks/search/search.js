import { decorateIcons, readBlockConfig } from '../../scripts/aem.js';

function debounce(func, delay) {
  let debounceTimer;
  // eslint-disable-next-line func-names
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export async function fetchData(config) {
  const source = config.source || '/query-index.json';
  const response = await fetch(source);
  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error('error loading API response', response);
    return null;
  }

  const json = await response.json();
  if (!json) {
    // eslint-disable-next-line no-console
    console.error('empty API response', path);
    return null;
  }

  return json;
}

function renderResultLink(result) {
  const link = document.createElement('a');
  link.href = result.path;
  link.textContent = result.header || result.title;

  const listItem = document.createElement('li');
  listItem.classList.add('search-result');
  listItem.append(link);
  return link;
}

function renderResults(block, filteredData) {
  const searchResultsContainer = block.querySelector('.search-results');
  searchResultsContainer.innerHTML = '';

  filteredData.forEach((result) => {
    if(block.classList.contains('cards')) {
      // TODO
    } else {
      const list = document.createElement('ol');
      list.append(...filterData.map(renderResultLink));
      searchResultsContainer.append(list);
    }
  });
}

function filterData(block, searchTerms, data) {
  console.log('Searching for ', searchTerms, ' in ', config.source);

  const foundInHeader = [];
  const foundInMeta = [];

  data.forEach((result) => {
    if (searchTerms.some((term) => (result.header || result.title).toLowerCase().includes(term))) {
      foundInHeader.push(result);
      return;
    }

    const metaContents = `${result.title} ${result.description} ${result.path.split('/').pop()}`.toLowerCase();
    if (searchTerms.some((term) => metaContents.includes(term))) {
      foundInMeta.push(result);
      return;
    }
  });

  return [...foundInHeader, ...foundInMeta];
}

async function handleSearch(block, config) {
  console.log('searching...');
  const data = await fetchData(config);
  const searchTerms = block.querySelector('input').value.toLowerCase().split(/\s+/);
  const filteredData = filterData(block, searchTerms, data);
  renderResults(block, filteredData);
}

function searchResults() {
  const results = document.createElement('div');
  results.classList.add('search-results');
  return results;
}

function searchInput(block, config) {
  const input = document.createElement('input');
  input.setAttribute('type', 'text');
  input.classList.add('search-input');

  input.addEventListener('input', () => {
    // debounce(() => {
      handleSearch(block, config);
    // }, 350);
  });

  return input;
}

function searchIcon() {
  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-search');
  return icon;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.innerHTML = '';
  block.append(
    searchIcon(),
    searchInput(block, config),
    searchResults(),
  );

  decorateIcons(block);
}