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
  });
  const activeIndicator = indicators[realSlideIndex];
  activeIndicator.querySelector('button').setAttribute('disabled', 'true');

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

function createSlide(row) {
  const slide = document.createElement('li');
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  return slide;
}

export default async function decorate(block) {
  const carouselItems = block.querySelectorAll('picture');
  if (carouselItems.length < 2) return;

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  const slideIndicators = document.createElement('ul');
  slideIndicators.classList.add('carousel-slide-indicators');
  block.append(slideIndicators);

  const buttons = document.createElement('div');
  buttons.classList.add('carousel-navigation-buttons');
  buttons.innerHTML = `
    <button type = "button" class= "slide-prev"><span>Previous Item</span></button>
    <button type="button" class="slide-next"><span>Next Item</span></button>
  `;

  const rows = block.querySelectorAll(':scope > div');
  rows.forEach((row, idx) => {
    const slide = createSlide(row);
    slidesWrapper.append(slide);

    const indicator = document.createElement('li');
    indicator.classList.add('carousel-slide-indicator');
    indicator.dataset.targetSlide = idx;
    indicator.innerHTML = `<button type = "button"><span>${idx + 1}</span></button>`;
    slideIndicators.append(indicator);
    row.remove();
  });

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');
  container.append(slidesWrapper);
  container.append(buttons);
  block.prepend(container);

  bindEvents(block);

  showSlide(block);
}
