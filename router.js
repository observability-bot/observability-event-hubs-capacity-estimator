// Simple client-side router for static sites
class Router {
  constructor() {
    this.init();
  }

  init() {
    // Handle navigation clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('.main-nav a') || e.target.matches('nav a')) {
        e.preventDefault();
        debugger
        const href = e.target.getAttribute('href');
        this.navigateTo(href);
      }
    });
    
    // Update active navigation on page load
    this.updateActiveNav();
  }

  navigateTo(path) {
    if (path === '/') {
      window.location.href = '/index.html';
    } else if (path === '/adx-capacity-estimator') {
      window.location.href = '/adx-capacity-estimator.html';
    } else if (path === '/blob-store-capacity-estimator') {
      window.location.href = '/blob-store-capacity-estimator.html';
    }
  }

  updateActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.main-nav a, nav a');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      
      // Check if this link should be active
      if ((currentPath === '/' || currentPath === '/index.html') && href === '/') {
        link.classList.add('active');
      } else if (currentPath.includes('adx-capacity-estimator') && href === '/adx-capacity-estimator') {
        link.classList.add('active');
      } else if (currentPath.includes('blob-store-capacity-estimator') && href === '/blob-store-capacity-estimator') {
        link.classList.add('active');
      }
    });
  }
}

// Initialize router when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Router();
});
