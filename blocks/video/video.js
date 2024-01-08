/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

const getVideoElement = (source, autoplay) => {
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  if (autoplay) video.setAttribute('autoplay', '');

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', `video/${source.split('.').pop()}`);
  video.append(sourceEl);

  return video;
};

export default async function decorate(block) {
  const a = block.querySelector('a');
  if (a) {
    const source = a.href;
    const pic = block.querySelector('picture');
    block.innerHTML = '';
    if (pic) {
      const wrapper = document.createElement('div');
      wrapper.className = 'video-placeholder';
      wrapper.innerHTML = '<div class="video-placeholder-play"><button type="button" title="Play"></button></div>';
      wrapper.prepend(pic);
      wrapper.querySelector('.video-placeholder-play button').addEventListener('click', () => {
        wrapper.replaceWith(getVideoElement(source, true));
      });
      block.append(wrapper);
    } else {
      block.append(getVideoElement(source, false));
    }
  }
}
