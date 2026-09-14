(() => {
  const apply = (root = document) => {
    root.querySelectorAll?.('.danfe-sheet').forEach((node) => {
      const text = node.textContent || '';
      if (!text.includes('DANFSe v2.0')) return;
      node.classList.add('nfse-template-master');
      if (node.hasAttribute('data-danfse-pdf')) node.removeAttribute('data-danfse-pdf');
    });
  };
  apply();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) apply(node);
      });
      if (mutation.type === 'attributes' && mutation.target instanceof Element) apply(mutation.target.parentElement || document);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-danfse-pdf'] });
})();
