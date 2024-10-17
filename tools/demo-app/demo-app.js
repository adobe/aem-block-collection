// Import SDK
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { context, token } = await DA_SDK;

  Object.keys(context).forEach((key) => {
    document.body.insertAdjacentHTML('beforeend', `<p>${key}: ${context[key]}</p>`)
  });
}());