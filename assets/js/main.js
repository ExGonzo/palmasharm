// Main interactions: language switching, reveals, ripple, toggles
document.addEventListener('DOMContentLoaded', () => {
  // Create a floating language toggle for mobile visibility
  createLangFab();
  // Create mobile hamburger menu and drawer for smartphones
  createMobileMenu();

  // Apply translations at startup
  applyTranslations();

  // Language switcher
  document.querySelectorAll('.lang').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLang(lang);
      applyTranslations();
      // Re-render calendar month label to match language on reservation page
      const page = document.body.dataset.page;
      if (page === 'reservation' && window.__calendarRef) {
        window.__calendarRef.render();
      }
    });
  });

  // Reveal on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting && e.target.classList.add('show'));
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Button ripple coordinates
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100 + '%';
      const y = ((e.clientY - rect.top) / rect.height) * 100 + '%';
      btn.style.setProperty('--x', x);
      btn.style.setProperty('--y', y);
    });
  });

  // Apartment details toggles
  document.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.target);
      if (!target) return;
      const isHidden = target.hasAttribute('hidden');
      if (isHidden) {
        target.removeAttribute('hidden');
      } else {
        target.setAttribute('hidden', '');
      }
    });
  });

  // Reservation page logic
  const page = document.body.dataset.page;
  if (page === 'reservation') {
    initReservation();
  }
});

function createLangFab() {
  const fab = document.createElement('div');
  fab.className = 'lang-fab';
  fab.setAttribute('aria-label', 'Language selector');
  const en = document.createElement('button');
  en.className = 'lang';
  en.dataset.lang = 'en';
  en.textContent = 'EN';
  const it = document.createElement('button');
  it.className = 'lang';
  it.dataset.lang = 'it';
  it.textContent = 'IT';
  fab.appendChild(en);
  fab.appendChild(it);
  document.body.appendChild(fab);
}

function createMobileMenu() {
  const header = document.querySelector('.site-header');
  const siteNav = document.querySelector('.site-nav');
  if (!header || !siteNav) return;

  // Hamburger button
  const toggle = document.createElement('button');
  toggle.className = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  header.insertBefore(toggle, siteNav);

  // Overlay and drawer
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  const drawer = document.createElement('nav');
  drawer.className = 'mobile-nav';

  // Build list of links from existing nav
  const list = document.createElement('ul');
  list.className = 'mobile-nav-list';
  siteNav.querySelectorAll('a').forEach(a => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    const key = a.getAttribute('data-i18n');
    if (key) link.setAttribute('data-i18n', key);
    link.className = a.classList.contains('btn') ? 'btn small' : '';
    link.textContent = a.textContent;
    li.appendChild(link);
    list.appendChild(li);
  });

  // Language buttons prominently at top of drawer
  const langBar = document.createElement('div');
  langBar.className = 'mobile-lang';
  const en = document.createElement('button');
  en.className = 'lang'; en.dataset.lang = 'en'; en.textContent = 'EN';
  const it = document.createElement('button');
  it.className = 'lang'; it.dataset.lang = 'it'; it.textContent = 'IT';
  langBar.appendChild(en); langBar.appendChild(it);

  drawer.appendChild(langBar);
  drawer.appendChild(list);
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  // Toggle behavior
  const open = () => {
    drawer.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  toggle.addEventListener('click', open);
  overlay.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function initReservation() {
  const overlay = document.getElementById('resvOverlay');
  const modal = document.getElementById('resvModal');
  const closeBtn = document.getElementById('closeModal');
  const params = new URLSearchParams(window.location.search);
  const aptId = params.get('apt') || 'sea-breeze';
  const aptInfo = APARTMENT_DATA[aptId] || APARTMENT_DATA['sea-breeze'];
  document.getElementById('aptName').textContent = aptInfo.name + ' — Reservation';

  // Open centered modal
  overlay.classList.add('show');
  modal.classList.add('show');
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
    modal.classList.remove('show');
  });

  // Init map (Leaflet if available)
  if (typeof L !== 'undefined') {
    const map = L.map('map').setView(aptInfo.coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    L.marker(aptInfo.coords).addTo(map).bindPopup(aptInfo.name).openPopup();
  } else {
    document.getElementById('map').textContent = 'Map unavailable';
  }

  // Calendar
  const cal = new Calendar('calendar', aptInfo.bookedDates);
  cal.render();
  // expose reference for language refresh
  window.__calendarRef = cal;

  // Form submit wiring
  const form = document.getElementById('resvForm');
  const waLink = document.getElementById('waLink');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const guests = document.getElementById('guests').value;
    const notes = document.getElementById('notes').value;
    const text = encodeURIComponent(`Reservation request: ${aptInfo.name}\nCheck-in: ${checkin}\nCheck-out: ${checkout}\nGuests: ${guests}\nNotes: ${notes}`);
    waLink.href = `https://wa.me/201000000000?text=${text}`;
    window.open(waLink.href, '_blank');
  });
}

// Simple availability calendar
class Calendar {
  constructor(rootId, bookedDates) {
    this.root = document.getElementById(rootId);
    this.grid = document.getElementById('calGrid');
    this.monthLabel = document.getElementById('monthLabel');
    this.prevBtn = document.getElementById('prevMonth');
    this.nextBtn = document.getElementById('nextMonth');
    this.booked = new Set(bookedDates || []); // 'YYYY-MM-DD'
    const today = new Date();
    this.year = today.getFullYear();
    this.month = today.getMonth();
    this.prevBtn.addEventListener('click', () => { this.changeMonth(-1); });
    this.nextBtn.addEventListener('click', () => { this.changeMonth(1); });
  }
  changeMonth(delta) {
    this.month += delta;
    if (this.month < 0) { this.month = 11; this.year--; }
    if (this.month > 11) { this.month = 0; this.year++; }
    this.render();
  }
  render() {
    const locale = getCurrentLang();
    const monthName = new Date(this.year, this.month, 1).toLocaleString(locale, { month: 'long' });
    this.monthLabel.textContent = `${monthName} ${this.year}`;
    this.grid.innerHTML = '';
    const headers = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    headers.forEach(h => {
      const cell = document.createElement('div');
      cell.className = 'cell header';
      cell.textContent = h;
      this.grid.appendChild(cell);
    });
    const firstDay = new Date(this.year, this.month, 1).getDay();
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cell';
      this.grid.appendChild(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.year, this.month, d);
      const iso = date.toISOString().slice(0,10);
      const cell = document.createElement('div');
      const isBooked = this.booked.has(iso);
      cell.className = `cell day ${isBooked ? 'booked' : 'available'}`;
      cell.textContent = d;
      this.grid.appendChild(cell);
    }
  }
}

// Demo apartment data for reservation page
const APARTMENT_DATA = {
  'sea-breeze': {
    name: 'Sea Breeze Apartment',
    coords: [27.858, 34.308], // Hadaba area approx
    bookedDates: [
      // sample booked dates
      '2025-11-12','2025-11-13','2025-11-20','2025-12-05'
    ]
  },
  'garden-view': {
    name: 'Garden View Apartment',
    coords: [28.025, 34.425], // Nabq area approx
    bookedDates: ['2025-11-10','2025-11-22','2025-12-10']
  },
  'city-comfort': {
    name: 'City Comfort Studio',
    coords: [27.915, 34.329], // Naama Bay approx
    bookedDates: ['2025-11-08','2025-11-24']
  }
};