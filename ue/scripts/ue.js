import { moveInstrumentation } from './ue-utils.js';

const setupCardsObserver = () => {
  const cardsBlocks = document.querySelectorAll('div.cards.block');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const addedUlElements = mutation.addedNodes;
      if (mutation.type === 'childList' && mutation.target.tagName === 'DIV') {
        // handle card div > li replacements
        if (addedUlElements.length === 1 && addedUlElements[0].tagName === 'UL') {
          const ulEl = addedUlElements[0];
          const removedDivEl = [...mutation.removedNodes].filter((node) => node.tagName === 'DIV');
          removedDivEl.forEach((div, index) => {
            if (index < ulEl.children.length) {
              moveInstrumentation(div, ulEl.children[index]);
            }
          });
        }

        // handle card-image picture replacements
        if (mutation.target.classList.contains('card-image')) {
          const addedPictureEl = [...mutation.addedNodes].filter((node) => node.tagName === 'PICTURE');
          const removedPictureEl = [...mutation.removedNodes].filter((node) => node.tagName === 'PICTURE');
          if (addedPictureEl.length === 1 && removedPictureEl.length === 1) {
            const oldImgEL = removedPictureEl[0].querySelector('img');
            const newImgEl = addedPictureEl[0].querySelector('img');
            if (oldImgEL && newImgEl) {
              moveInstrumentation(oldImgEL, newImgEl);
            }
          }
        }
      }
    });
  });

  cardsBlocks.forEach((cardsBlock) => {
    observer.observe(cardsBlock, { childList: true, subtree: true });
  });
};

const setupAccordionObserver = () => {
  const accordionBlocks = document.querySelectorAll('div.accordion.block');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const addedUlElements = mutation.addedNodes;
      console.log(mutation);
    });
  });

  accordionBlocks.forEach((accordionBlock) => {
    observer.observe(accordionBlock, { childList: true, subtree: true });
  });
};

export default () => {
  setupCardsObserver();
  setupAccordionObserver();
};
