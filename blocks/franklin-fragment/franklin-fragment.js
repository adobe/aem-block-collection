/*
 * Franklin WebComponent Fragment 
 * Include content from one Helix page in another.
 * https://www.hlx.live/developer/block-collection/fragment
 */

export class FranklinFragment extends HTMLElement {
  constructor() {
    super();

    const urlAttribute = this.attributes.getNamedItem('url');
    if(!urlAttribute) {
      return;
    }

    this.url = new URL(urlAttribute.value);

    // Attaches a shadow DOM tree to the element
    // With mode open the shadow root elements are accessible from JavaScript outside the root
    this.attachShadow({mode: 'open'});

    this.initialized = false;
  }

  /**
   * Invoked each time the custom element is appended into a document-connected element.
   * This will happen each time the node is moved, and may happen before the element's contents have been fully parsed.
   */
  async connectedCallback() {
    if(!this.initialized && this.url) {
      const { origin } = this.url;

      // Load fragment
      const resp = await fetch(this.url);
      if (!resp.ok) {
        return;
      }

      const main = document.createElement('main');
      let htmlText = await resp.text();

      // Fix relative image urls
      const regex = new RegExp('./media', 'g');
      htmlText = htmlText.replace(regex, `${origin}/media`);
      main.innerHTML = htmlText;

      // Set initialized to true so we don't run through this again
      this.initialized = true;

      // Query all the blocks in the fragment
      const blockElements = main.querySelectorAll(':scope > div > div');

      // Get the block names
      const blocks = Array.from(blockElements).map((block) => block.classList.item(0));


      try {
        // Load scripts file for fragment host site
        const scriptsFile = `${origin}/scripts/scripts.js`;
        await this.importScript(scriptsFile);

        const { decorateMain } = await import(`${origin}/scripts/scripts.js`);
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
          const decorateBlock = await import(blockScriptUrl);
          if (decorateBlock.default) {
            await decorateBlock.default(block);
          }
        })

        // Append the fragment to the shadow dom
        if(this.shadowRoot) {
          this.shadowRoot.append(main);
        }
      }catch(err){
        console.log("An error occured while loading the fragment");
      }
    }
  }

  /**
   * Imports a script and appends to document body
   * @param {*} url 
   * @returns 
   */
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