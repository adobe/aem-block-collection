// Import SDK
// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  // eslint-disable-next-line no-unused-vars
  const { context, token } = await DA_SDK;

  Object.keys(context).forEach((key) => {
    document.body.insertAdjacentHTML('beforeend', `<p>${key}: ${context[key]}</p>`);
  });
}());
