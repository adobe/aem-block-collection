let tId;
function debounce(method, delay) {
  clearTimeout(tId);
  tId = setTimeout(() => {
    method();
  }, delay);
}

function showSlide(block, slideIndex = 0, scroll = true) {
  const slides = block.querySelectorAll('.carousel-slide');
  slides.forEach((slide) => slide.setAttribute('aria-hidden', 'true'));

  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.setAttribute('aria-hidden', 'false');
  if (scroll) {
    block.querySelector('.carousel-slides').scrollTo({
      top: 0,
      left: activeSlide.offsetLeft,
      behavior: 'smooth',
    });
  }

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator) => {
    indicator.querySelector('button').removeAttribute('disabled');
    indicator.setAttribute('aria-selected', 'false');
  });
  const activeIndicator = indicators[realSlideIndex];
  activeIndicator.querySelector('button').setAttribute('disabled', 'true');
  activeIndicator.setAttribute('aria-selected', 'true');

  block.dataset.activeSlide = realSlideIndex;
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slidesWrapper = block.querySelector('.carousel-slides');
  slidesWrapper.addEventListener('scroll', () => {
    debounce(() => {
      const position = slidesWrapper.scrollLeft;
      const slideWidth = slidesWrapper.querySelector('.carousel-slide').scrollWidth;
      const slide = Math.round(position / slideWidth);
      showSlide(block, slide, false);
    }, 200);
  });
}

export default async function decorate(block) {
  const carouselItems = block.querySelectorAll('picture');
  if (carouselItems.length < 2) return;

  const blockDivs = block.querySelectorAll(':scope > div');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  const slideIndicators = document.createElement('ul');
  slideIndicators.classList.add('carousel-slide-indicators');
  block.append(slideIndicators);

  carouselItems.forEach((item, idx) => {
    const slide = document.createElement('li');
    slide.classList.add('carousel-slide');
    slide.setAttribute('tabindex', '-1');
    slide.append(item);
    slidesWrapper.append(slide);

    const indicator = document.createElement('li');
    indicator.classList.add('carousel-slide-indicator');
    indicator.dataset.targetSlide = idx;
    indicator.innerHTML = `<button type="button"><span>${idx + 1}</span></button>`;
    slideIndicators.append(indicator);
  });

  const buttons = document.createElement('div');
  buttons.classList.add('carousel-increment-buttons');
  block.append(buttons);
  const prev = document.createElement('button');
  prev.classList.add('slide-prev');
  prev.innerHTML = '<span>Previous Item</span>';
  buttons.prepend(prev);

  const next = document.createElement('button');
  next.classList.add('slide-next');
  next.innerHTML = '<span>Next Item</span>';
  buttons.append(next);

  bindEvents(block);

  const container = document.createElement('div');
  container.classList.add('carousel-container');
  container.append(slidesWrapper);
  container.append(buttons);
  block.prepend(container);

  showSlide(block);

  blockDivs.forEach((div) => div.remove());
}
