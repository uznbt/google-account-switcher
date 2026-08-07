// Eksekusi sinkron sebelum body dimuat untuk mencegah kedipan putih
const savedTheme = localStorage.getItem('uiTheme') || 'default';
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
} else if (savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
}
