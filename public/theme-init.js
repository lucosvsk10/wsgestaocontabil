(() => {
  const savedTheme = localStorage.getItem('vite-ui-theme');
  const theme = savedTheme || 'dark';

  if (theme === 'system') {
    document.documentElement.classList.add(
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    );
    return;
  }

  document.documentElement.classList.add(theme === 'light' ? 'light' : 'dark');
})();
