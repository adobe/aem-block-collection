import { moveInstrumentation } from './ue-utils.js';

const setupCardsObserver = () => {
  const cardsBlocks = document.querySelectorAll('div.cards');
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
        if (mutation.target.classList.contains('cards-card-image')) {
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
  const accordionBlocks = document.querySelectorAll('div.accordion');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.tagName === 'DIV' && mutation.target.attributes['data-aue-model']?.value === 'accordion') {
        const addedElements = mutation.addedNodes;
        const removedElements = mutation.removedNodes;
        if (addedElements.length === 1 && addedElements[0].tagName === 'DETAILS') {
          moveInstrumentation(removedElements[0], addedElements[0]);
          moveInstrumentation(removedElements[0].querySelector('div'), addedElements[0].querySelector('summary'));
        }
      }
    });
  });

  accordionBlocks.forEach((accordionBlock) => {
    observer.observe(accordionBlock, { childList: true, subtree: true, attributes: true });
  });
};

const setupCarouselObserver = () => {
  const carouselBlocks = document.querySelectorAll('div.carousel');
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.tagName === 'DIV' && mutation.target.attributes['data-aue-model']?.value === 'carousel') {
        const removedElements = mutation.removedNodes;
        if (removedElements.length === 1 && removedElements[0].attributes['data-aue-model']?.value === 'carousel-item') {
          const resourceAttr = removedElements[0].getAttribute('data-aue-resource');
          if (resourceAttr) {
            const itemMatch = resourceAttr.match(/item-(\d+)/);
            if (itemMatch && itemMatch[1]) {
              const slideIndex = parseInt(itemMatch[1], 10);
              const slides = mutation.target.querySelectorAll('li.carousel-slide');
              const targetSlide = Array.from(slides).find((slide) => parseInt(slide.getAttribute('data-slide-index'), 10) === slideIndex);
              if (targetSlide) {
                moveInstrumentation(removedElements[0], targetSlide);
              }
            }
          }
        }
      }
    });
  });

  carouselBlocks.forEach((carouselBlock) => {
    observer.observe(carouselBlock, { childList: true, subtree: true, attributes: true });
  });
};

export default () => {
  setupCardsObserver();
  setupAccordionObserver();
  setupCarouselObserver();
};
