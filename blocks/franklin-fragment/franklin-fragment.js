/*
 * Franklin Fragment WebComponent
 * Include content from one Helix page in another.
 * https://www.hlx.live/developer/block-collection/TBD
 */
// eslint-disable-next-line import/prefer-default-export
export class FranklinFragment extends HTMLElement {
  constructor() {
    super();

    // Attaches a shadow DOM tree to the element
    // With mode open the shadow root elements are accessible from JavaScript outside the root
    this.attachShadow({ mode: 'open' });

    // Keep track if we have rendered the fragment yet.
    this.initialized = false;
  }

  /**
   * Invoked each time the custom element is appended into a document-connected element.
   * This will happen each time the node is moved, and may
   * happen before the element's contents have been fully parsed.
   */
  async connectedCallback() {
    if (!this.initialized) {
      try {
        // Set initialized to true so we don't run through this again
        this.initialized = true;

        const urlAttribute = this.attributes.getNamedItem('url');
        if (!urlAttribute) {
          throw new Error('franklin-fragment missing url attribute');
        }

        const { href, origin } = new URL(`${urlAttribute.value}.plain.html`);

        // Load fragment
        const resp = await fetch(href);
        if (!resp.ok) {
          throw new Error(`Unable to fetch ${href}`);
        }

        const main = document.createElement('main');
        let htmlText = await resp.text();

        // Fix relative image urls
        const regex = /.\/media/g;
        htmlText = htmlText.replace(regex, `${origin}/media`);
        main.innerHTML = htmlText;

        // Query all the blocks in the fragment
        const blockElements = main.querySelectorAll(':scope > div > div');

        // Did we find any blocks or all default content?
        if (blockElements.length > 0) {
          // Get the block names
          const blocks = Array.from(blockElements).map((block) => block.classList.item(0));

          // Load scripts file for fragment host site
          const scriptsFile = `${origin}/scripts/scripts.js`;
          await this.importScript(scriptsFile);

          const { decorateMain } = await import(/* webpackIgnore: true */`${origin}/scripts/scripts.js`);
          if (decorateMain) {
            await decorateMain(main);
          }

          // For each block in the fragment load it's js/css
          blocks.forEach(async (blockName) => {
            const block = main.querySelector(`.${blockName}`);
            const link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', `${origin}/blocks/${blockName}/${blockName}.css`);
            main.appendChild(link);

            const blockScriptUrl = `${origin}/blocks/${blockName}/${blockName}.js`;
            await this.importScript(blockScriptUrl);
            const decorateBlock = await import(/* webpackIgnore: true */blockScriptUrl);
            if (decorateBlock.default) {
              await decorateBlock.default(block);
            }
          });
        }

        // Append the fragment to the shadow dom
        if (this.shadowRoot) {
          this.shadowRoot.append(main);
        }
      } catch (err) {
        console.log(err ?? 'An error occured while loading the fragment'); // eslint-disable-line no-console
      }
    }
  }

  /**
   * Imports a script and appends to document body
   * @param {*} url
   * @returns
   */
  // eslint-disable-next-line class-methods-use-this
  async importScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.type = 'module';
      script.onload = resolve;
      script.onerror = reject;

      document.body.appendChild(script);
    });
  }
}

customElements.define('franklin-fragment', FranklinFragment);
