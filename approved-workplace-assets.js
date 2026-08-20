(() => {
  'use strict';

  // Keep the reviewed workplace artwork wired to the correct responsive slots.
  // Mobile now uses the verified clean WebP asset so the previously corrupted
  // JPEG can never be selected by the lesson renderer.
  const approvedSources = {
    'assets/workplace-desktop.png': 'assets/workplace-desktop.jpg',
    'assets/workplace-mobile.png': 'assets/workplace-mobile.webp'
  };

  function applyApprovedWorkplaceAssets(root = document) {
    root.querySelectorAll?.('img[src]').forEach((image) => {
      const approved = approvedSources[image.getAttribute('src')];
      if (approved) image.setAttribute('src', approved);
    });
  }

  applyApprovedWorkplaceAssets();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('img[src]')) {
          const approved = approvedSources[node.getAttribute('src')];
          if (approved) node.setAttribute('src', approved);
        }
        applyApprovedWorkplaceAssets(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
