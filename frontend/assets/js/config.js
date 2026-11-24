// Central settings. Change API_URL here if the backend runs somewhere else.
window.APP = {
  API_URL: 'http://localhost:4000/api',
  BASE_URL: 'http://localhost:4000',
  // Pages inside /admin/ need '../' to reach the shared pages.
  ROOT: location.pathname.includes('/admin/') ? '../' : '',
};