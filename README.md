# Block Collection

This project contains code that is featured in the [AEM Block Collection](https://www.aem.live/developer/block-collection#block-collection-1) documentation.

## Environments
- Preview: https://main--aem-block-collection--adobe.hlx.page/
- Live: https://main--aem-block-collection--adobe.hlx.live/

## Installation

```sh
npm i
```

## Local development

1. Create a new repository based on the `aem-block-collection` template and add a mountpoint in the `fstab.yaml`
1. Add the [helix-bot](https://github.com/apps/helix-bot) to the repository
1. Install the [Helix CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/helix-cli`
1. Start Helix Pages Proxy: `hlx up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)
