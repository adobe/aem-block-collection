export default async function decorate(block) {
  block.innerHTML = `<ol>
      <li><a href="/home" class="breadcrumb-link-underline-effect">Home</a></li>
      <li><a href="/docs/" class="breadcrumb-link-underline-effect">Documentation</a></li>
      <li><a href="/docs/#build" class="breadcrumb-link-underline-effect category">Build</a></li>
      <li><a href="/developer/block-collection" style="cursor: default;">Block Collection</a></li>
  </ol>`;
}
