import {
  createOptimizedPicture,
  decorateIcons,
  fetchPlaceholders,
} from '../../scripts/aem.js';

function highlightTextElements(terms, elements) {
  elements.forEach((element) => {
    if (!element || !element.textContent) return;

    const matches = [];
    const { textContent } = element;
    terms.forEach((term) => {
      const offset = textContent.toLowerCase().indexOf(term.toLowerCase());
      if (offset >= 0) {
        matches.push({ offset, term: textContent.substring(offset, offset + term.length) });
      }
    });

    if (!matches.length) {
      return;
    }

    matches.sort((a, b) => a.offset - b.offset);
    let currentIndex = 0;
    const fragment = matches.reduce((acc, { offset, term }) => {
      const textBefore = textContent.substring(currentIndex, offset);
      if (textBefore) {
        acc.appendChild(document.createTextNode(textBefore));
      }
      const markedTerm = document.createElement('mark');
      markedTerm.textContent = term;
      acc.appendChild(markedTerm);
      currentIndex = offset + term.length;
      return acc;
    }, document.createDocumentFragment());
    const textAfter = textContent.substring(currentIndex);
    if (textAfter) {
      fragment.appendChild(document.createTextNode(textAfter));
    }
    element.innerHTML = '';
    element.appendChild(fragment);
  });
}

export async function fetchData(source) {
  const response = await fetch(source);
  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error('error loading API response', response);
    return null;
  }

  const json = await response.json();
  if (!json) {
    // eslint-disable-next-line no-console
    console.error('empty API response', source);
    return null;
  }

  return json.data;
}

function renderResultCard(result, searchTerms) {
  const card = document.createElement('li');
  const cardLink = document.createElement('a');
  cardLink.href = result.path;

  card.appendChild(cardLink);

  if (result.image) {
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('card-image');
    imageContainer.append(
      createOptimizedPicture(result.image),
    );
    cardLink.appendChild(imageContainer);
  }

  const cardTitleParagraph = document.createElement('p');
  const cardTitle = document.createElement('strong');
  cardTitle.textContent = result.header || result.title;
  cardTitleParagraph.appendChild(cardTitle);

  const cardDescription = document.createElement('p');
  cardDescription.textContent = result.description;

  const cardBody = document.createElement('div');
  cardBody.classList.add('card-body');
  cardBody.append(
    cardTitleParagraph,
    cardDescription,
  );
  cardLink.append(cardBody);
  highlightTextElements(searchTerms, [cardTitle, cardDescription]);
  return card;
}

function renderResultLink(result, searchTerms) {
  const link = document.createElement('a');
  link.href = result.path;
  link.textContent = result.header || result.title;

  const description = document.createElement('p');
  description.classList.add('description');
  description.textContent = result.description;

  const listItem = document.createElement('li');
  listItem.classList.add('search-result');
  listItem.append(link, description);
  highlightTextElements(searchTerms, [link, description]);

  return listItem;
}

function clearResults(block) {
  const searchResults = block.querySelector('.search-results');
  searchResults.innerHTML = '';
}

async function renderResults(block, config, filteredData, searchTerms) {
  clearResults(block);
  const searchResults = block.querySelector('.search-results');

  if (filteredData.length) {
    const list = document.createElement('ul');
    const renderer = block.classList.contains('minimal') ? renderResultLink : renderResultCard;
    list.append(
      ...filteredData.map((result) => renderer(result, searchTerms)),
    );
    searchResults.append(list);
  } else {
    const noResultMessage = document.createElement('p');
    noResultMessage.classList.add('no-results');
    noResultMessage.textContent = config.placeholders.searchNoResults || 'No results found.';
    searchResults.append(noResultMessage);
  }
}

function filterData(searchTerms, data) {
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
    }
  });

  return [...foundInHeader, ...foundInMeta];
}

async function handleSearch(block, config) {
  const searchValue = block.querySelector('input').value;
  const searchTerms = searchValue.toLowerCase().split(/\s+/);
  if (searchValue.length < 3) {
    clearResults(block);
    return;
  }

  const data = await fetchData(config.source);
  const filteredData = filterData(searchTerms, data);
  await renderResults(block, config, filteredData, searchTerms);
}

function searchResultsContainer() {
  const results = document.createElement('div');
  results.classList.add('search-results');
  return results;
}

function searchInput(block, config) {
  const input = document.createElement('input');
  input.setAttribute('type', 'search');
  input.classList.add('search-input');

  const searchPlaceholder = config.placeholders.searchPlaceholder || 'Search...';
  input.placeholder = searchPlaceholder;
  input.setAttribute('aria-label', searchPlaceholder);

  input.addEventListener('input', () => {
    handleSearch(block, config);
  });

  input.addEventListener('keyup', (e) => { if (e.code === 'Escape') { clearResults(block); } });

  return input;
}

function searchIcon() {
  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-search');
  return icon;
}

function searchBox(block, config) {
  const box = document.createElement('div');
  box.classList.add('search-box');
  box.append(
    searchIcon(),
    searchInput(block, config),
  );

  return box;
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const source = document.querySelector('a').href.toString() || '/query-index.json';
  block.innerHTML = '';
  block.append(
    searchBox(block, { source, placeholders }),
    searchResultsContainer(),
  );

  decorateIcons(block);
}
