
function toggleDropdown() {
  document.getElementById("dropdownMenu").classList.toggle("show")
}

window.onclick = (e) => {
  if (!e.target.closest(".dropdown")) {
    document.getElementById("dropdownMenu").classList.remove("show")
  }
}

const ACTIVE_PAGE_STORAGE_KEY = 'homepage::activePage'
const SCROLL_STORAGE_KEY = 'homepage::scrollPosition'
const SCROLL_SAVE_DELAY_MS = 160
let scrollSaveTimeoutId = null
let scrollPersistenceConfigured = false

;(function setupPageLoaderAnimation() {
  const loader = document.querySelector('.page-loader')
  if (!loader) return

  const hideLoader = () => {
    document.body.classList.add('page-loaded')
    document.body.classList.remove('page-transitioning')
  }

  window.addEventListener('load', () => {
    window.requestAnimationFrame(() => hideLoader())
  })

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      window.requestAnimationFrame(() => hideLoader())
    }
  })

  const showLoader = () => {
    document.body.classList.remove('page-loaded')
    document.body.classList.add('page-transitioning')
  }

  window.__bookWithUsShowLoader = showLoader

  window.addEventListener('beforeunload', () => {
    showLoader()
  })

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]')
    if (!anchor) return

    const href = anchor.getAttribute('href') || ''
    if (!href || href.startsWith('#')) return
  const normalizedHref = href.trim().toLowerCase()
  if (normalizedHref.startsWith('mailto:') || normalizedHref.startsWith('tel:') || normalizedHref.startsWith('javascript:')) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.hasAttribute('download')) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    showLoader()
  })

  if (document.readyState === 'complete') {
    hideLoader()
  }
})()

if (!sessionStorage.getItem("__au__")) {
  triggerPageLoader()
  window.location.href = "login.html"
}

function triggerPageLoader() {
  if (typeof window.__bookWithUsShowLoader === 'function') {
    window.__bookWithUsShowLoader()
  }
}

const hotelData = {
  "pyin-oo-lwin": {
    name: "Hotel Pyin Oo Lwin",
    hero: "hotel pyin oo lwin/view2.webp",
    description: "Experience luxury in the heart of Myanmar's hill station",
    amenities: [
      { icon: "ri-swimming-pool-line", title: "Indoor Pool", desc: "Heated indoor swimming pool with mountain views" },
      {
        icon: "ri-restaurant-line",
        title: "Fine Dining",
        desc: "Award-winning restaurant with local and international cuisine",
      },
      { icon: "ri-spa-line", title: "Spa & Wellness", desc: "Full-service spa with traditional Myanmar treatments" },
      { icon: "ri-car-line", title: "Valet Parking", desc: "Complimentary valet parking service" },
    ],
    gallery: [
      "hotel pyin oo lwin/room1.webp",
      "hotel pyin oo lwin/restaurants1.webp",
      "hotel pyin oo lwin/indoor swimming pool.jpg",
      "hotel pyin oo lwin/view4.jpg",
    ],
  },
  "auream-palace": {
    name: "Auream Palace",
    hero: "Auream Palace/view7.jpg",
    description: "A golden palace of luxury and elegance",
    amenities: [
      { icon: "ri-swimming-pool-line", title: "Infinity Pool", desc: "Stunning infinity pool overlooking the city" },
      {
        icon: "ri-restaurant-line",
        title: "Rooftop Dining",
        desc: "Exclusive rooftop restaurant with panoramic views",
      },
      { icon: "ri-spa-line", title: "Royal Spa", desc: "Luxurious spa treatments fit for royalty" },
      { icon: "ri-calendar-event-line", title: "Event Spaces", desc: "Grand ballrooms for special occasions" },
    ],
    gallery: [
      "Auream Palace/view1.jpg",
      "Auream Palace/room1.jpg",
      "Auream Palace/a.jpg",
      "Auream Palace/private-pool-villa.jpg",
    ],
  },
  "shwe-nan-htike": {
    name: "Shwe Nan Htike",
    hero: "Shwe Nan Htike/hotel.jpg",
    description: "Traditional Myanmar hospitality meets modern luxury",
    amenities: [
      {
        icon: "ri-restaurant-line",
        title: "Traditional Cuisine",
        desc: "Authentic Myanmar dishes and international favorites",
      },
      { icon: "ri-spa-line", title: "Heritage Spa", desc: "Traditional healing treatments and modern wellness" },
      {
        icon: "ri-calendar-event-line",
        title: "Cultural Events",
        desc: "Traditional performances and cultural experiences",
      },
      { icon: "ri-wifi-line", title: "Modern Amenities", desc: "High-speed WiFi and business facilities" },
    ],
    gallery: [
      "Shwe Nan Htike/room5.jpg",
      "Shwe Nan Htike/restaurants1.jpg",
      "Shwe Nan Htike/e.jpg",
      "Shwe Nan Htike/restaurants2.jpg",
    ],
  },
}

const MAP_PLACEHOLDER_IMAGE = "https://via.placeholder.com/1200x720/1a1a1a/ffffff?text=Map+preview+coming+soon"

const hotelMapConfig = {
  "pyin-oo-lwin": {
    link: "https://maps.app.goo.gl/ZFoLRT8KPnLU9PVR8",
    image: "map/p.png",
    alt: "Map preview for Hotel Pyin Oo Lwin",
  },
  "auream-palace": {
    link: "https://maps.app.goo.gl/QutV8zitZZCKFQVb9",
    image: "map/a.png",
    alt: "Map preview for Auream Palace",
  },
  "shwe-nan-htike": {
    link: "https://maps.app.goo.gl/MDU8bwLgXeom6YxJ9",
    image: "map/s.png",
    alt: "Map preview for Shwe Nan Htike",
  },
}

function persistActivePage(pageId) {
  if (!pageId) return
  try {
    sessionStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, pageId)
  } catch (err) {
    console.warn('Unable to persist active page', err)
  }
}

function getStoredActivePage() {
  try {
    return sessionStorage.getItem(ACTIVE_PAGE_STORAGE_KEY)
  } catch (err) {
    console.warn('Unable to read active page', err)
    return null
  }
}

function restoreActivePage() {
  const stored = getStoredActivePage()
  const fallbackId = stored && document.getElementById(`${stored}-page`) ? stored : 'home'
  showPage(fallbackId, null, { suppressScroll: true, skipPersistence: true })
  persistActivePage(fallbackId)
}

function configureScrollPersistence() {
  if (scrollPersistenceConfigured) return
  scrollPersistenceConfigured = true

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }

  window.addEventListener('scroll', handleScrollCapture, { passive: true })
  window.addEventListener('beforeunload', persistScrollPosition)
  window.addEventListener('pagehide', persistScrollPosition)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      restoreScrollPosition()
    }
  })
}

function handleScrollCapture() {
  if (scrollSaveTimeoutId) return
  scrollSaveTimeoutId = window.setTimeout(() => {
    persistScrollPosition()
    scrollSaveTimeoutId = null
  }, SCROLL_SAVE_DELAY_MS)
}

function persistScrollPosition() {
  const payload = JSON.stringify({ x: window.scrollX, y: window.scrollY })
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, payload)
  } catch (err) {
    console.warn('Unable to persist scroll position', err)
  }
}

function restoreScrollPosition() {
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    const x = Number.isFinite(parsed?.x) ? parsed.x : 0
    const y = Number.isFinite(parsed?.y) ? parsed.y : 0
    window.scrollTo(x, y)
  } catch (err) {
    console.warn('Unable to restore scroll position', err)
  }
}

function hydrateHotelMaps() {
  Object.entries(hotelMapConfig).forEach(([hotelId, config]) => {
    const linkEl = document.getElementById(`map-link-${hotelId}`)
    const imgEl = document.getElementById(`map-image-${hotelId}`)
    const noteEl = document.getElementById(`map-note-${hotelId}`)
    if (!linkEl || !imgEl) return

    const link = (config?.link || '').trim()
    if (link) {
      linkEl.href = link
      linkEl.removeAttribute('aria-disabled')
      linkEl.setAttribute('target', '_blank')
      linkEl.setAttribute('rel', 'noopener')
    } else {
      linkEl.href = '#'
      linkEl.setAttribute('aria-disabled', 'true')
    }

    if (noteEl) {
      noteEl.hidden = Boolean(link)
    }

    const imageSrc = (config?.image || MAP_PLACEHOLDER_IMAGE).trim()
    if (imageSrc) {
      imgEl.src = imageSrc
    }

    if (config?.alt) {
      imgEl.alt = config.alt
    }

    const cardEl = linkEl.closest('.map-card')
    if (cardEl) {
      cardEl.classList.toggle('map-card--disabled', !link)
    }
  })
}

function showHotel(hotelId) {
  const hotel = hotelData[hotelId]
  if (!hotel) return

  // Hide entry page and show hotel page
  document.getElementById("entry-page").style.display = "none"
  document.getElementById("hotel-pages").style.display = "block"

  // Generate hotel content
  const hotelContent = `
    <div class="hotel-page fade-in">
      <div class="hotel-hero" style="background-image: url('${hotel.hero}')">
        <div class="hotel-hero-content">
          <h1>${hotel.name}</h1>
          <p>${hotel.description}</p>
          <button class="btn" onclick="bookNow('${hotelId}')">Book Now</button>
        </div>
      </div>
      
      <div class="hotel-details">
        <div class="section__container">
          <h2 class="section__header">Hotel Amenities</h2>
          <div class="amenities-grid">
            ${hotel.amenities
              .map(
                (amenity) => `
              <div class="amenity-card">
                <i class="${amenity.icon}"></i>
                <h3>${amenity.title}</h3>
                <p>${amenity.desc}</p>
              </div>
            `,
              )
              .join("")}
          </div>
          
          <h2 class="section__header">Gallery</h2>
          <div class="hotel-gallery">
            ${hotel.gallery.map((img) => `<img src="${img}" alt="${hotel.name} gallery">`).join("")}
          </div>
        </div>
      </div>
      
      <div class="booking-section">
        <div class="section__container">
          <h2>Ready to Book Your Stay?</h2>
          <p>Experience luxury and comfort at ${hotel.name}</p>
          <button class="btn" onclick="bookNow('${hotelId}')" style="background: var(--secondary-color); font-size: 1.2rem; padding: 1rem 2rem;">
            Book Your Room Now
          </button>
        </div>
      </div>
    </div>
  `

  document.getElementById("hotel-content").innerHTML = hotelContent

  initializeDropdownHandlers()

  // Scroll to top
  window.scrollTo(0, 0)

  // Close any open dropdowns
  document.getElementById("dropdownMenu").classList.remove("show")
  const categoryDropdown = document.getElementById("categoryDropdown")
  if (categoryDropdown) {
    categoryDropdown.style.display = "none"
  }
}

function showEntryPage() {
  // Show entry page and hide hotel pages
  document.getElementById("entry-page").style.display = "block"
  document.getElementById("hotel-pages").style.display = "none"

  // Scroll to top
  window.scrollTo(0, 0)
}


function showPage(pageId, event = null, options = {}) {
  if (event) {
    event.preventDefault()
  }

  const settings = options || {}
  const suppressScroll = Boolean(settings.suppressScroll)
  const skipPersistence = Boolean(settings.skipPersistence)

  const allPages = document.querySelectorAll('.page-content')
  allPages.forEach((page) => {
    page.classList.remove('active')
  })

  const targetPage = document.getElementById(`${pageId}-page`)
  if (targetPage) {
    targetPage.classList.add('active')
    if (!skipPersistence) {
      persistActivePage(pageId)
    }
  }

  const dropdownMenu = document.getElementById('dropdownMenu')
  if (dropdownMenu) {
    dropdownMenu.classList.remove('show')
  }
  const categoryDropdown = document.getElementById('categoryDropdown')
  if (categoryDropdown) {
    categoryDropdown.style.display = 'none'
  }

  const submenus = ['poolDropdown', 'restaurantDropdown', 'spaDropdown', 'eventspaceDropdown']
  submenus.forEach((submenuId) => {
    const submenu = document.getElementById(submenuId)
    if (submenu) {
      submenu.style.display = 'none'
    }
  })

  if (!suppressScroll && targetPage) {
    window.scrollTo(0, 0)
    persistScrollPosition()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  configureScrollPersistence()

  hydrateHotelMaps()
  initializeDropdownHandlers()
  restoreActivePage()

  window.requestAnimationFrame(() => {
    restoreScrollPosition()
  })

  const menuBtn = document.getElementById('menu-btn')
  const navLinks = document.getElementById('nav-links')

  if (menuBtn && navLinks) {
    const updateAria = () => {
      const isOpen = navLinks.classList.contains('open')
      menuBtn.classList.toggle('open', isOpen)
      menuBtn.setAttribute('aria-expanded', String(isOpen))
    }

    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open')
      updateAria()
    })

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          navLinks.classList.remove('open')
          updateAria()
        }
      })
    })

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992) {
        navLinks.classList.remove('open')
        updateAria()
      }
    })

    updateAria()
  }
})

function initializeDropdownHandlers() {
  const categoryBtn = document.getElementById("category-btn")
  const categoryDropdown = document.getElementById("categoryDropdown")

  if (categoryBtn && categoryDropdown) {
    categoryBtn.replaceWith(categoryBtn.cloneNode(true))
    const newCategoryBtn = document.getElementById("category-btn")

    newCategoryBtn.addEventListener("click", (e) => {
      e.preventDefault()
      if (categoryDropdown.style.display === "block") {
        categoryDropdown.style.display = "none"
      } else {
        categoryDropdown.style.display = "block"
      }
    })
  }

  // Setup submenu handlers
  setupSubmenuHandlers("pool-btn", "poolDropdown")
  setupSubmenuHandlers("restaurant-btn", "restaurantDropdown")
  setupSubmenuHandlers("spa-btn", "spaDropdown")
  setupSubmenuHandlers("eventspace-btn", "eventspaceDropdown")
}

function setupSubmenuHandlers(btnId, dropdownId) {
  const btn = document.getElementById(btnId)
  const dropdown = document.getElementById(dropdownId)

  if (btn && dropdown) {
    btn.replaceWith(btn.cloneNode(true))
    const newBtn = document.getElementById(btnId)

    newBtn.addEventListener("click", (e) => {
      e.preventDefault()
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"
    })

    document.addEventListener("click", (event) => {
      if (!newBtn.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = "none"
      }
    })
  }
}
// Modify the handleBookNow function to set redirect URL
function handleBookNow() {
    const currentUser = sessionStorage.getItem("__au__") 
        ? JSON.parse(sessionStorage.getItem("__au__")) 
        : null;

    if (!currentUser || currentUser.isPreview) {
        // Set redirect URL for after login/registration
        sessionStorage.setItem("redirectAfterLogin", "booking.html");
        showPreviewAccountAlert();
    } else {
    triggerPageLoader();
        window.location.href = "booking.html";
    }
}

// Replace the showPreviewAccountAlert function with this version
function showPreviewAccountAlert() {
    // Use Swal.fire() instead of just swal()
    Swal.fire({
        title: "Account Required",
        text: "You need to create an account to make bookings.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sign Up",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#667eea",
        cancelButtonColor: "#6c757d",
    }).then((result) => {
        if (result.isConfirmed) {
      triggerPageLoader();
            window.location.href = "login.html";
        }
    });
}

// Update the bookNow function
function bookNow(hotelId) {
    const currentUser = sessionStorage.getItem("__au__") 
        ? JSON.parse(sessionStorage.getItem("__au__")) 
        : null;

    if (!currentUser || currentUser.isPreview) {
        // Set redirect URL for after login/registration
        sessionStorage.setItem("redirectAfterLogin", "booking.html");
        showPreviewAccountAlert();
    } else {
        showPage('booking');
    }
}

// Moved from inline Homepage.html: language selector, href mapping, toggleSidebar and current date init
(function () {
  const sel = document.getElementById('langSelect')
  if (!sel) return
  const stored = localStorage.getItem('siteLang')
  if (stored) sel.value = stored
  sel.addEventListener('change', (e) => {
    localStorage.setItem('siteLang', e.target.value)
    if (e.target.value === 'my') {
      triggerPageLoader()
      window.location.href = 'Homepage(myanmar).html'
    } else {
      triggerPageLoader()
      window.location.href = 'Homepage.html'
    }
  })
})()

(function () {
  const map = {
    'Login.html': 'login(myanmar).html',
    'booking.html': 'booking(myanmr).html'
  }
  if (localStorage.getItem('siteLang') === 'my') {
    document.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href')
      if (map[h]) a.setAttribute('href', map[h])
    })
  }
})()

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar')
  if (sidebar) sidebar.classList.toggle('show')
}

document.addEventListener('DOMContentLoaded', function () {
  const currentDateElement = document.getElementById('current-date')
  if (currentDateElement) {
    const today = new Date()
    currentDateElement.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
})

// --- User Profile/Settings Modal Logic ---
document.addEventListener('DOMContentLoaded', function () {

  const profileBtn = document.getElementById('user-profile-btn');
  const modal = document.getElementById('userProfileModal');
  const closeBtn = document.getElementById('closeProfileModal');
  const form = document.getElementById('userProfileForm');
  const requestAdminBtn = document.getElementById('requestAdminBtn');

  // Debug logs
  if (!profileBtn) {
    console.error('User profile button (#user-profile-btn) not found!');
    alert('User profile button not found! Please check the HTML.');
    return;
  }
  if (!modal) {
    console.error('User profile modal (#userProfileModal) not found!');
    alert('User profile modal not found! Please check the HTML.');
    return;
  }
  if (!closeBtn) {
    console.error('Close button (#closeProfileModal) not found!');
    alert('Close button for user profile modal not found! Please check the HTML.');
    return;
  }
  if (!form) {
    console.error('User profile form (#userProfileForm) not found!');
    alert('User profile form not found! Please check the HTML.');
    return;
  }

  console.log('User profile modal logic initialized.');

  // Open modal and populate fields
  profileBtn.addEventListener('click', function () {
    const user = JSON.parse(sessionStorage.getItem('__au__') || '{}');
    // Use querySelector to avoid name/id mismatch issues
    const nameInput = form.querySelector('#profileName');
    const emailInput = form.querySelector('#profileEmail');
    const passwordInput = form.querySelector('#profilePassword');
    if (nameInput) nameInput.value = user.fullname || '';
    if (emailInput) emailInput.value = user.email || '';
    if (passwordInput) passwordInput.value = '';
    modal.classList.add('show');
    modal.style.display = 'flex';
    modal.style.zIndex = 99999;
    // Check if user already requested admin
    if (requestAdminBtn) {
      let alreadyRequested = false;
      try {
        const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
        alreadyRequested = notifications.some(n => n.type === 'admin-request' && n.user && n.user.email === user.email && n.status === 'pending');
      } catch {}
      requestAdminBtn.disabled = alreadyRequested;
      requestAdminBtn.textContent = alreadyRequested ? 'Admin Request Pending' : 'Request Admin Access';
    }
    // Fallback alert if modal is not visible
    setTimeout(() => {
      if (getComputedStyle(modal).display === 'none') {
        alert('Profile modal failed to display. Please check CSS or JS errors.');
      }
    }, 200);
    console.log('User profile modal opened.');
  });
  // Request Admin Access logic
  if (requestAdminBtn) {
    requestAdminBtn.addEventListener('click', function () {
      const user = JSON.parse(sessionStorage.getItem('__au__') || '{}');
      if (!user || !user.email) {
        Swal.fire('Error', 'User info not found. Please log in again.', 'error');
        return;
      }
      // Check if already requested
      let notifications = [];
      try {
        notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
      } catch {}
      const alreadyRequested = notifications.some(n => n.type === 'admin-request' && n.user && n.user.email === user.email && n.status === 'pending');
      if (alreadyRequested) {
        Swal.fire('Info', 'You have already requested admin access. Please wait for approval.', 'info');
        requestAdminBtn.disabled = true;
        requestAdminBtn.textContent = 'Admin Request Pending';
        return;
      }
      // Add new admin request notification
      const newRequest = {
        id: 'req-' + Date.now() + '-' + Math.floor(Math.random()*10000),
        type: 'admin-request',
        user: { fullname: user.fullname, email: user.email },
        status: 'pending',
        date: new Date().toISOString()
      };
      notifications.push(newRequest);
      localStorage.setItem('adminNotifications', JSON.stringify(notifications));
      Swal.fire('Requested', 'Your admin access request has been sent. Please wait for admin approval.', 'success');
      requestAdminBtn.disabled = true;
      requestAdminBtn.textContent = 'Admin Request Pending';
    });
  }

  // Close modal
  closeBtn.addEventListener('click', function () {
    modal.classList.remove('show');
    modal.style.display = 'none';
  });
  // Close on outside click
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  });

  // Save changes
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let user = JSON.parse(sessionStorage.getItem('__au__') || '{}');
    const oldEmail = user.email;
    // Use querySelector to avoid name/id mismatch issues
    const nameInput = form.querySelector('#profileName');
    const emailInput = form.querySelector('#profileEmail');
    const passwordInput = form.querySelector('#profilePassword');
    const newName = nameInput ? nameInput.value.trim() : '';
    const newEmail = emailInput ? emailInput.value.trim() : '';
    const newPassword = passwordInput ? passwordInput.value : '';
    if (!newName || !newEmail) {
      Swal.fire('Error', 'Name and email are required.', 'error');
      return;
    }
    user.fullname = newName;
    user.email = newEmail;
    if (newPassword) user.password = newPassword;
    sessionStorage.setItem('__au__', JSON.stringify(user));

    // Update allUserInfo in localStorage if not preview
    if (!user.isPreview) {
      let allUsers = [];
      try {
        allUsers = JSON.parse(localStorage.getItem('allUserInfo') || '[]');
      } catch {}
      const idx = allUsers.findIndex(u => u.email === oldEmail);
      if (idx !== -1) {
        allUsers[idx].fullname = newName;
        allUsers[idx].email = newEmail;
        if (newPassword) allUsers[idx].password = newPassword;
        localStorage.setItem('allUserInfo', JSON.stringify(allUsers));
      }
    }
    Swal.fire('Success', 'Profile updated!', 'success');
    modal.classList.remove('show');
    modal.style.display = 'none';
  });
});