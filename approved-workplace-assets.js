(() => {
  'use strict';

  // The Academy repository carries approved workplace artwork as JPEG assets.
  // The application shell was built against PNG filenames during review, so
  // this small adapter keeps the approved desktop/mobile artwork wired to the
  // correct responsive slots without changing the lesson rendering logic.
  const approvedSources = {
    'assets/workplace-desktop.png': 'assets/workplace-desktop.jpg',
    'assets/workplace-mobile.png': 'assets/workplace-mobile.jpg'
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
