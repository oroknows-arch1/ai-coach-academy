(() => {
  'use strict';

  // Keep the reviewed workplace artwork wired to the correct responsive slots.
  // Desktop uses the corrected high-resolution crop; mobile remains unchanged.
  const approvedSources = {
    'assets/workplace-desktop.png': 'assets/workplace-desktop-sharp.webp?v=20260825-1740',
    'assets/workplace-mobile.png': 'assets/workplace-mobile.webp?v=20260821-0606'
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
