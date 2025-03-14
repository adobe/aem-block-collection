// Import SDK
// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  // eslint-disable-next-line no-unused-vars
  const { context, token, actions } = await DA_SDK;
  Object.keys(context).forEach((key) => {
    // Heading
    const h3 = document.createElement('h3');
    h3.textContent = `${key}`;

    // Send button
    const send = document.createElement('button');
    send.textContent = `Send | ${context[key]}`;
    send.addEventListener('click', () => { actions.sendText(context[key]); });

    // Send & close
    const close = document.createElement('button');
    close.textContent = `Send & close | ${context[key]}`;
    close.addEventListener('click', () => {
      actions.sendText(context[key]);
      actions.closeLibrary();
    });

    document.body.append(h3, send, close);
  });
}());
