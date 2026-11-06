// Early rescue: ensure nav clicks work even if later code errors
(function rescueNavigation() {
  function baseNavigate(page) {
    try {
      const loc = window.location;
      const base = loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1);
      loc.href = (base || '/') + page;
    } catch {
      window.location.href = page;
    }
  }

  function killFullscreenBlockers() {
    try {
      const blockers = document.querySelectorAll('.modal-backdrop, .swal2-container, .sweet-overlay, .swal-overlay, .offcanvas-backdrop');
      blockers.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const h = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const covers = rect && rect.width >= w * 0.98 && rect.height >= h * 0.98;
        if (covers) {
          // Remove if clearly stale, else at least disable pointer events so clicks pass through
          const isModalBackdrop = el.classList.contains('modal-backdrop') || el.classList.contains('offcanvas-backdrop');
          const isSwal2 = el.classList.contains('swal2-container');
          const isSweet1 = el.classList.contains('sweet-overlay') || el.classList.contains('swal-overlay');
          if (isModalBackdrop) {
            el.remove();
            document.body.classList.remove('modal-open');
          } else if (isSwal2 || isSweet1) {
            el.style.pointerEvents = 'none';
            el.style.display = 'none';
            document.body.classList.remove('swal2-shown', 'swal2-height-auto');
            document.documentElement.classList.remove('swal2-shown', 'swal2-height-auto');
          } else {
            el.style.pointerEvents = 'none';
          }
        }
      });
    } catch {}
  }

  document.addEventListener('click', function (e) {
    try {
      let t = e.target;
      if (!(t instanceof Element)) t = t && t.parentElement ? t.parentElement : null;
      if (!t) return;
      const anchor = t.closest('a');
      const isUserAccounts = anchor && anchor.id === 'userAccountsLink';
      const isRooms = anchor && anchor.id === 'roomsLink';
      const isLogout = (anchor && anchor.classList.contains('logout-btn')) || t.closest('.logout-btn');

      if (isUserAccounts || isRooms || isLogout) {
        e.preventDefault();
        killFullscreenBlockers();
        const dashboard = document.getElementById('dashboardSection');
        const rooms = document.getElementById('roomsSection');
        const billing = document.getElementById('billingSection');
        const bookings = document.getElementById('userBookingsCard');
        if (isUserAccounts) {
          if (dashboard) dashboard.classList.remove('d-none');
          if (rooms) rooms.classList.add('d-none');
          if (billing) billing.classList.add('d-none');
          if (bookings) bookings.classList.add('d-none');
          // also mark active
          document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
          anchor.classList.add('active');
        } else if (isRooms) {
          if (dashboard) dashboard.classList.add('d-none');
          if (billing) billing.classList.add('d-none');
          if (bookings) bookings.classList.add('d-none');
          if (rooms) rooms.classList.remove('d-none');
          document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
          anchor.classList.add('active');
        } else if (isLogout) {
          try { sessionStorage.removeItem('__au__'); } catch {}
          baseNavigate('Login.html');
        }
      }
    } catch {}
  }, true);
})();
const SUPER_ADMIN_EMAIL = (window.SUPER_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();

document.addEventListener("DOMContentLoaded", () => {
  // Helper to navigate to a page relative to the current directory
  function navigateTo(page) {
    try {
      const loc = window.location;
      const base = loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1);
      const target = (base || '/') + page;
      loc.href = target;
    } catch {
      window.location.href = page;
    }
  }
  // Check admin session: accept any user with role 'admin' or the legacy admin email
  const adminInfo = sessionStorage.getItem("__au__")
  if (!adminInfo) {
    navigateTo("Login.html")
    return
  }

  const admin = JSON.parse(adminInfo)
  const isAdmin = admin && admin.role === 'admin'
  const isSuperAdmin = !!(admin && (admin.isSuperAdmin || (admin.email || '').toLowerCase() === SUPER_ADMIN_EMAIL))
  if (!isAdmin) {
    navigateTo("Login.html")
    return
  }

  window.currentAdminSession = { ...admin, isSuperAdmin };

  // Show correct admin info in sidebar
  const userProfile = document.querySelector('.user-profile');
  if (userProfile) {
    userProfile.querySelector('.username').textContent = admin.fullname || 'Administrator';
    userProfile.querySelector('.user-role').textContent = isSuperAdmin ? 'Super Admin' : (admin.role || 'Admin');
    const avatarEl = userProfile.querySelector('img');
    if (avatarEl) {
      const defaultAvatar = 'img/default-user.svg';
      const chosenAvatar = admin.avatarUrl || admin.avatar || defaultAvatar;
      avatarEl.src = chosenAvatar;
      avatarEl.alt = (admin.fullname ? `${admin.fullname}'s avatar` : 'Admin avatar');
    }
  }

  // Room catalog schema: [{hotel: 'Hotel Name', rooms: [{roomNo: 101, price: 50000}, ...]}, ...]
  function initRoomCatalog() {
    // Initialize an empty catalog if none exists. Admin will add hotels/rooms.
    if (!localStorage.getItem('roomCatalog')) {
      localStorage.setItem('roomCatalog', JSON.stringify([]))
    }
  }
  initRoomCatalog()
})

// DOM Elements - using more robust selectors
  const userAccountsTable = document.getElementById("userAccountsTable")
const userBookingsCard = document.getElementById("userBookingsCard")
const backToUsersBtn = document.getElementById("backToUsersBtn")
const userNameTitle = document.getElementById("userNameTitle")
const totalUsersEl = document.getElementById("totalUsers")
const activeBookingsEl = document.getElementById("activeBookings")
const totalRevenueEl = document.getElementById("totalRevenue")
const logoutBtn = document.querySelector(".logout-btn")

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const formatUSD = (value) => {
  const amount = Number.parseFloat(value)
  return usdFormatter.format(Number.isNaN(amount) ? 0 : amount)
}

// Tab elements
const bookingTab = document.getElementById("booking-tab")
const inhouseTab = document.getElementById("inhouse-tab")
const archiveTab = document.getElementById("archive-tab")
const bookingTable = document.getElementById("bookingTable")
const inhouseTable = document.getElementById("inhouseTable")
const archiveTable = document.getElementById("archiveTable")

const billingSection = document.getElementById("billingSection")
const dashboardSection = document.getElementById("dashboardSection")
const roomsSection = document.getElementById("roomsSection")
const roomGrid = document.getElementById("roomGrid")
const totalRoomsEl = document.getElementById("totalRooms")
const availableRoomsEl = document.getElementById("availableRooms")
const bookedRoomsEl = document.getElementById("bookedRooms")
const inhouseRoomsEl = document.getElementById("inhouseRooms")
const roomSearchInput = document.getElementById("roomSearchInput")
const billSearchInput = document.getElementById("billSearchInput")
const userSearchInput = document.getElementById("userSearchInput")
const userBillsTable = document.getElementById("userBillsTable")
const totalBillsEl = document.getElementById("totalBills")
const paidBillsEl = document.getElementById("paidBills")
const pendingBillsEl = document.getElementById("pendingBills")
const overdueBillsEl = document.getElementById("overdueBills")

const client = window.apiClient || null
const ACTIVE_BACKEND_STATUSES = new Set(["booked", "confirmed"])
const INHOUSE_BACKEND_STATUSES = new Set(["checked_in"])
const ARCHIVED_BACKEND_STATUSES = new Set(["checked_out", "cancelled"])
const NON_BLOCKING_ROOM_STATUSES = new Set(["cancelled", "checked_out", "completed", "archived"])

function normalizeRoomNo(value) {
  if (value == null) return ""
  const trimmed = String(value).trim().toUpperCase()
  if (!trimmed) return ""
  const sanitized = trimmed.replace(/[^A-Z0-9]+/g, "-")
  return sanitized.replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function canonicalRoomId(value) {
  if (value == null) return ""
  return normalizeRoomNo(value).replace(/[^A-Z0-9]/g, "")
}

function canonicalHotelName(value) {
  if (value == null) return ""
  const base = String(value).trim().toLowerCase()
  if (!base) return ""
  const withoutPrefix = base.replace(/^hotel\s+/, "")
  const withoutHotelWord = withoutPrefix.replace(/\bhotel\b/g, "")
  return withoutHotelWord.replace(/[^a-z0-9]+/g, "")
}

function escapeHtml(str) {
  if (str === null || str === undefined) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildRoomKey(hotelName, roomNo, fallbackHotelName = "") {
  const normalizedRoom = normalizeRoomNo(roomNo)
  if (!normalizedRoom) return ""
  const canonicalRoom = canonicalRoomId(normalizedRoom)
  const canonicalHotel = canonicalHotelName(hotelName) || canonicalHotelName(fallbackHotelName) || "__unknown__"
  return `${canonicalHotel}::${canonicalRoom}`
}

function getRecordHotelName(record) {
  if (!record) return ""
  return record.hotel || record.hotelName || record.propertyName || record.hotel_name || ""
}

// Safe catalog access and lookup helpers (global-scope)
function getCatalogSafe() {
  try {
    if (typeof window.getCatalog === 'function') return window.getCatalog();
    const raw = localStorage.getItem('roomCatalog');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function findCatalogRoom(canonicalHotel, canonicalRoom) {
  if (!canonicalRoom) return null;
  const catalog = getCatalogSafe();
  for (const entry of catalog) {
    const entryHotel = canonicalHotelName(entry?.hotel || '');
    if (canonicalHotel && entryHotel && entryHotel !== canonicalHotel) continue;
    const rooms = Array.isArray(entry?.rooms) ? entry.rooms : [];
    for (const room of rooms) {
      const roomCanon = canonicalRoomId(room?.roomNo ?? room?.number ?? '');
      if (roomCanon && roomCanon === canonicalRoom) return room;
    }
  }
  return null;
}

// Static inventory fallback (legacy ranges) used when no catalog is available
const STATIC_ROOM_FALLBACK = [
  { hotel: "Shwe Nan Htike", ranges: [
    { start: 1, end: 10, price: 100 },
    { start: 101, end: 110, price: 150 },
    { start: 201, end: 210, price: 200 },
  ]},
  { hotel: "Auream Palace", ranges: [
    { start: 1, end: 10, price: 120 },
    { start: 101, end: 110, price: 180 },
    { start: 201, end: 210, price: 250 },
  ]},
  { hotel: "Hotel Pyin Oo Lwin", ranges: [
    { start: 1, end: 10, price: 150 },
    { start: 101, end: 110, price: 200 },
    { start: 201, end: 210, price: 300 },
  ]},
];
// Expose fallback globally for catalog script to reuse
try { if (!window.STATIC_ROOM_FALLBACK) window.STATIC_ROOM_FALLBACK = STATIC_ROOM_FALLBACK } catch {}

function isBlockingStatus(rawStatus) {
  const normalized = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : ""
  if (!normalized) return true
  if (INHOUSE_BACKEND_STATUSES.has(normalized)) return true
  return !NON_BLOCKING_ROOM_STATUSES.has(normalized)
}

// Data
let allUsers = JSON.parse(localStorage.getItem("allUserInfo") || "[]")
let allBookings = JSON.parse(localStorage.getItem("allBookings") || "[]")
let allInHouse = JSON.parse(localStorage.getItem("allInHouse") || "[]")
let allArchived = JSON.parse(localStorage.getItem("allArchived") || "[]")
let isSyncingAdminData = false
let userAccountsSearchTerm = ""
// no userInputData

function hydrateDashboardViews() {
  loadUserAccounts()
  updateStats()
  loadUserBills()
  loadRoomStatus()
  loadAdminNotifications()
}

// Initialize
migrateBookingData()
persistAdminData()
hydrateDashboardViews()

if (client) {
  refreshAdminDataFromServer().catch((err) => {
    console.error('Failed to refresh admin data from server', err)
  })
} else {
  console.warn('apiClient unavailable – admin dashboard using cached data only')
}

// Default view: show user accounts (dashboardSection) and hide others
try {
  if (dashboardSection) dashboardSection.classList.remove('d-none')
  if (roomsSection) roomsSection.classList.add('d-none')
  if (billingSection) billingSection.classList.add('d-none')
  if (userBookingsCard) userBookingsCard.classList.add('d-none')
} catch {}

// Explicit sidebar handlers as a safety net (in addition to delegated handler)
const userAccountsLink = document.getElementById('userAccountsLink')
if (userAccountsLink) {
  userAccountsLink.addEventListener('click', (ev) => {
    ev.preventDefault()
    // Activate link styling
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'))
    userAccountsLink.classList.add('active')
    // Toggle sections
    if (billingSection) billingSection.classList.add('d-none')
    if (roomsSection) roomsSection.classList.add('d-none')
    if (userBookingsCard) userBookingsCard.classList.add('d-none')
    if (dashboardSection) dashboardSection.classList.remove('d-none')
    // Refresh content
    loadUserAccounts()
    updateStats()
  })
}

const roomsLink = document.getElementById('roomsLink')
if (roomsLink) {
  roomsLink.addEventListener('click', (ev) => {
    ev.preventDefault()
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'))
    roomsLink.classList.add('active')
    if (dashboardSection) dashboardSection.classList.add('d-none')
    if (billingSection) billingSection.classList.add('d-none')
    if (userBookingsCard) userBookingsCard.classList.add('d-none')
    if (roomsSection) roomsSection.classList.remove('d-none')
    loadRoomStatus()
  })
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', (ev) => {
    ev.preventDefault()
    sessionStorage.removeItem('__au__')
    try {
      const loc = window.location;
      const base = loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1);
      loc.href = (base || '/') + 'Login.html';
    } catch {
      window.location.href = 'Login.html';
    }
  })
}

// Event Listeners - using event delegation for dynamic elements
function cleanupStuckModalBackdrops() {
  try {
    const anyShownModal = document.querySelector('.modal.show');
    const backdrops = Array.from(document.querySelectorAll('.modal-backdrop'));
    if (backdrops.length && !anyShownModal) {
      backdrops.forEach((bd) => bd.parentElement && bd.parentElement.removeChild(bd));
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('paddingRight');
    }
    // SweetAlert2 stale containers (should only exist when body has swal2-shown)
    const bodyHasSwal2 = document.body.classList.contains('swal2-shown');
    const swal2Containers = Array.from(document.querySelectorAll('.swal2-container'));
    if (!bodyHasSwal2 && swal2Containers.length) {
      swal2Containers.forEach((el) => el.remove());
    } else if (bodyHasSwal2 && swal2Containers.length) {
      // If body thinks it's shown but no visible swal is present, clean up
      const visibleSwal2 = document.querySelector('.swal2-container[aria-hidden="false"], .swal2-container .swal2-show');
      if (!visibleSwal2) {
        swal2Containers.forEach((el) => el.remove());
        document.body.classList.remove('swal2-shown', 'swal2-height-auto');
        document.documentElement.classList.remove('swal2-shown', 'swal2-height-auto');
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
      }
    }
    // Also defensively remove SweetAlert2 toast containers that may linger
    document.querySelectorAll('.swal2-container.swal2-top-end, .swal2-container.swal2-top-right').forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style && style.pointerEvents === 'auto' && !bodyHasSwal2) el.remove();
    });
    // SweetAlert v1 stale overlay
    const sweetOverlay = document.querySelector('.sweet-overlay');
    const sweetAlert = document.querySelector('.sweet-alert');
    const sweetVisible = sweetAlert && getComputedStyle(sweetAlert).display !== 'none';
    if (sweetOverlay && !sweetVisible) {
      sweetOverlay.remove();
    }
    // SweetAlert v1 (.swal-overlay) stale overlay
    document.querySelectorAll('.swal-overlay').forEach((el) => {
      const hasShow = el.classList.contains('swal-overlay--show-modal');
      const modal = el.querySelector('.swal-modal');
      let modalVisible = false;
      if (modal) {
        const style = window.getComputedStyle(modal);
        modalVisible = style && style.opacity !== '0' && style.display !== 'none' && style.visibility !== 'hidden';
      }
      if (!hasShow || !modalVisible) el.remove();
    });
  } catch {}
}

document.addEventListener('visibilitychange', cleanupStuckModalBackdrops);
window.addEventListener('pageshow', cleanupStuckModalBackdrops);
window.addEventListener('load', cleanupStuckModalBackdrops);
// Run a delayed cleanup as well to catch late-mounted overlays
setTimeout(cleanupStuckModalBackdrops, 250);
setTimeout(cleanupStuckModalBackdrops, 1000);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cleanupStuckModalBackdrops();
});

// Prevent unwanted URL changes from dummy anchors anywhere on the page
document.addEventListener('click', (e) => {
  try {
    let target = e.target;
    if (!(target instanceof Element)) target = target && target.parentElement ? target.parentElement : null;
    if (!target) return;
    const anchor = target.closest && target.closest('a');
    if (!anchor) return;
    const href = (anchor.getAttribute('href') || '').trim();
    if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) {
      e.preventDefault();
    }
  } catch {}
}, true);

document.addEventListener("click", (e) => {
  cleanupStuckModalBackdrops();
  let target = e.target
  if (!(target instanceof Element)) {
    target = target && target.parentElement ? target.parentElement : null
  }
  if (!target) return
  const hasClass = (node, className) => Boolean(node && node.classList && node.classList.contains(className))
  const getClosest = (node, selector) => (node && typeof node.closest === 'function') ? node.closest(selector) : null
  // Approve as Admin button
  const approveBtn = hasClass(target, "approve-admin-btn") ? target : getClosest(target, ".approve-admin-btn");
  if (approveBtn) {
    const sessionAdmin = window.currentAdminSession || {};
    if (!sessionAdmin.isSuperAdmin) {
      if (window.Swal) {
        Swal.fire('Restricted', 'Only the super admin can promote users.', 'warning');
      }
      return;
    }
    const btn = approveBtn;
    const userEmail = btn.getAttribute("data-email");
    const userId = btn.getAttribute("data-id") || "";
    const promoteLocal = () => {
      let users = JSON.parse(localStorage.getItem("allUserInfo") || "[]");
      const idx = users.findIndex(u => u.email === userEmail || u.id === userId);
      if (idx !== -1) {
        users[idx].role = "admin";
        users[idx].pendingAdmin = false;
        localStorage.setItem("allUserInfo", JSON.stringify(users));
      }
    };

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Approving';

    const afterUpdate = async () => {
      promoteLocal();
      await refreshAdminDataFromServer({ silent: true });
      loadUserAccounts();
      if (window.Swal) {
        Swal.fire({ icon: 'success', title: 'Promoted', text: `${userEmail} is now an admin.` });
      }
    };

    if (client && userId) {
      client.post(`/admin/promote/${userId}`, {}, { auth: true, redirectOnAuthError: false })
        .then(afterUpdate)
        .catch(err => {
          console.error('Promote user failed', err);
          if (window.Swal) {
            Swal.fire('Error', err?.message || 'Failed to promote user.', 'error');
          }
        })
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        });
    } else {
      afterUpdate()
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        });
    }
    return;
  }

  const demoteBtn = hasClass(target, "demote-admin-btn") ? target : getClosest(target, ".demote-admin-btn");
  if (demoteBtn) {
    const sessionAdmin = window.currentAdminSession || {};
    if (!sessionAdmin.isSuperAdmin) {
      if (window.Swal) {
        Swal.fire('Restricted', 'Only the super admin can demote admins.', 'warning');
      }
      return;
    }
    const btn = demoteBtn;
    const userEmail = btn.getAttribute("data-email");
    const userId = btn.getAttribute("data-id") || "";
    const demoteLocal = () => {
      let users = JSON.parse(localStorage.getItem("allUserInfo") || "[]");
      const idx = users.findIndex(u => u.email === userEmail || u.id === userId);
      if (idx !== -1) {
        users[idx].role = "user";
        users[idx].pendingAdmin = false;
        localStorage.setItem("allUserInfo", JSON.stringify(users));
      }
    };

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Demoting';

    const afterUpdate = async () => {
      demoteLocal();
      await refreshAdminDataFromServer({ silent: true });
      loadUserAccounts();
      if (window.Swal) {
        Swal.fire({ icon: 'success', title: 'Demoted', text: `${userEmail} is now a regular user.` });
      }
    };

    if (client && userId) {
      client.post(`/admin/demote/${userId}`, {}, { auth: true, redirectOnAuthError: false })
        .then(afterUpdate)
        .catch(err => {
          console.error('Demote admin failed', err);
          if (window.Swal) {
            Swal.fire('Error', err?.message || 'Failed to demote admin.', 'error');
          }
        })
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        });
    } else {
      afterUpdate()
        .finally(() => {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        });
    }
    return;
  }

  const deleteBtn = hasClass(target, "delete-user-btn") ? target : getClosest(target, ".delete-user-btn");
  if (deleteBtn) {
    const userId = deleteBtn.getAttribute("data-id") || "";
    const userEmail = deleteBtn.getAttribute("data-email") || "";
    const userName = deleteBtn.getAttribute("data-name") || userEmail || "User";
    const userRole = deleteBtn.getAttribute("data-role") || "user";
    deleteUserAndAllData(userId, userEmail, userName, userRole, deleteBtn);
    return;
  }
  // Navigation handling (simplified): let explicit sidebar handlers manage navigation
  const navLinkCandidate = getClosest(target, ".nav-link")
  if (navLinkCandidate) {
    const navLink = navLinkCandidate
    const href = navLink.getAttribute('href') || ''
    if (navLink.tagName === 'A' && (href === '#' || href.trim() === '' || href.toLowerCase().startsWith('javascript:'))) {
      e.preventDefault()
    }
    return
  }

  // Back to users button
  if (target.id === "backToUsersBtn" || getClosest(target, "#backToUsersBtn")) {
    // Back to users button clicked

    // Hide user bookings card and show user accounts table
    userBookingsCard.classList.add("d-none")
    userAccountsTable.parentElement.parentElement.classList.remove("d-none")

    loadUserAccounts()

    // Reset the user name title
    userNameTitle.textContent = "User Bookings"

    // Returned to user accounts view
  }

  // Logout button
  if (target === logoutBtn || getClosest(target, ".logout-btn")) {
    sessionStorage.removeItem("__au__")
    window.location.href = "Login.html"
  }

  // View bookings buttons
  const viewBookingsBtn = hasClass(target, "view-bookings-btn") ? target : getClosest(target, ".view-bookings-btn")
  if (viewBookingsBtn) {
    const btn = viewBookingsBtn
    const userEmail = btn.getAttribute("data-email")
    const userName = btn.getAttribute("data-name")
    showUserBookings(userEmail, userName)
  }

  // View booking details buttons
  const viewBookingBtn = hasClass(target, "view-booking-btn") ? target : getClosest(target, ".view-booking-btn")
  if (viewBookingBtn) {
    const btn = viewBookingBtn
    try {
      const raw = btn.getAttribute("data-booking") || ''
      let parsed = null
      try {
        parsed = JSON.parse(raw)
      } catch (err1) {
        const unescaped = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
        parsed = JSON.parse(unescaped)
      }
      viewBookingDetails(parsed)
    } catch (err) {
      console.error('Failed to parse booking data from attribute', err)
      if (typeof Swal !== 'undefined') Swal.fire('Error', 'Unable to open booking details.', 'error')
      else alert('Unable to open booking details.')
    }
  }

  // Cancel booking buttons
  const cancelBookingBtn = hasClass(target, "cancel-booking-btn") ? target : getClosest(target, ".cancel-booking-btn")
  if (cancelBookingBtn) {
    const btn = cancelBookingBtn
    const bookingId = btn.getAttribute("data-id")
    cancelBooking(bookingId)
  }

  // Tab buttons
  if (hasClass(target, "nav-link") && target.getAttribute("data-bs-toggle") === "tab") {
    const tabId = target.getAttribute("data-bs-target")
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.classList.remove("show", "active")
    })
    document.querySelector(tabId).classList.add("show", "active")
  }

  // Bill action handlers
  const viewBillBtn = hasClass(target, "view-bill-btn") ? target : getClosest(target, ".view-bill-btn")
  if (viewBillBtn) {
    const btn = viewBillBtn
    const billData = JSON.parse(btn.getAttribute("data-bill"))
    viewBillDetails(billData)
  }

  const markPaidBtn = hasClass(target, "mark-paid-btn") ? target : getClosest(target, ".mark-paid-btn")
  if (markPaidBtn) {
    const btn = markPaidBtn
    const billId = btn.getAttribute("data-id")
    markBillAsPaid(billId)
  }

  // Room card click handler to show booking/inhouse details
  if (getClosest(target, '[data-action="edit-room"]')) {
    return
  }
  const roomCardCandidate = getClosest(target, ".room-card")
  if (roomCardCandidate) {
    const roomCard = roomCardCandidate
    const datasetRoom = roomCard.getAttribute('data-room') || roomCard.dataset.room || ''
    const datasetHotel = roomCard.getAttribute('data-hotel') || roomCard.dataset.hotel || ''
    let roomNoText = datasetRoom
    if (!roomNoText) {
      const selCandidates = [
        roomCard.querySelector('.room-number h5'),
        roomCard.querySelector('.card-body h6'),
        roomCard.querySelector('h6'),
      ]
      for (const el of selCandidates) {
        if (el && el.textContent) {
          roomNoText = el.textContent
          break
        }
      }
    }
    const normalizedRoomNo = normalizeRoomNo(roomNoText || '')
    if (!normalizedRoomNo) return
    showRoomDetails(normalizedRoomNo, datasetHotel)
  }

  // user-input feature removed - no handlers here

  // Move to InHouse
  const moveToInhouseBtn = getClosest(target, ".move-to-inhouse-btn")
  if (moveToInhouseBtn) {
    const bookingData = JSON.parse(moveToInhouseBtn.dataset.booking)
    moveToInHouse(bookingData)
  }

  // Move to Archive
  const moveToArchiveBtn = getClosest(target, ".move-to-archive-btn")
  if (moveToArchiveBtn) {
    const bookingData = JSON.parse(moveToArchiveBtn.dataset.booking)
    moveToArchive(bookingData)
  }
})

// Load booking data for room selection dropdown
function loadBookingRoomsForPaymentMethod() {
  // Populate a helper select used by admin to inspect booked rooms (if element present)
  const roomSelect = document.getElementById("roomSelect")
  if (!roomSelect) return

  // Combine booking and in-house records
  const bookingData = JSON.parse(localStorage.getItem("allBookings") || "[]")
  const inhouseData = JSON.parse(localStorage.getItem("allInHouse") || "[]")
  const allBookings = [...bookingData, ...inhouseData]

  // Reset and add entries
  roomSelect.innerHTML = '<option value="">Choose a booked room...</option>'
  allBookings.forEach((booking) => {
    if (booking.roomNo && booking.fullname) {
      const option = document.createElement("option")
      option.value = JSON.stringify(booking)
      option.textContent = `Room ${booking.roomNo} - ${booking.fullname} (${booking.hotel || "N/A"})`
      roomSelect.appendChild(option)
    }
  })
}

// Show payment method for selected room
window.showRoomPaymentMethod = () => {
  const roomSelect = document.getElementById("roomSelect")
  const paymentMethodDisplay = document.getElementById("paymentMethodDisplay")
  if (!roomSelect || !paymentMethodDisplay) return

  const selectedValue = roomSelect.value
  if (!selectedValue) {
    paymentMethodDisplay.value = ""
    paymentMethodDisplay.placeholder = "Select a room to view payment method"
    paymentMethodDisplay.style.backgroundColor = "#ffffff"
    return
  }

  try {
    const bookingData = JSON.parse(selectedValue)
    const paymentMethod = bookingData.paymentMethod || "Not specified"
    paymentMethodDisplay.value = paymentMethod
    paymentMethodDisplay.style.backgroundColor = paymentMethod !== "Not specified" ? "#e8f5e8" : "#fff3cd"
  } catch (error) {
    console.error("Error parsing booking data:", error)
    paymentMethodDisplay.value = "Error loading payment method"
    paymentMethodDisplay.style.backgroundColor = "#f8d7da"
  }
}

// Load user input data with booking information
// user-input data listing removed

// Billing search functionality
if (billSearchInput) {
  billSearchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase()
    const rows = userBillsTable.querySelectorAll("tr")

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase()
      row.style.display = text.includes(searchTerm) ? "" : "none"
    })
  })
}

if (userSearchInput) {
  userSearchInput.addEventListener("input", (e) => {
    userAccountsSearchTerm = e.target.value || ""
    loadUserAccounts(userAccountsSearchTerm)
  })
}

if (roomSearchInput) {
  roomSearchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase()
    const roomCards = roomGrid.querySelectorAll(".room-card")

    roomCards.forEach((card) => {
      const text = card.textContent.toLowerCase()
      card.style.display = text.includes(searchTerm) ? "" : "none"
    })
  })
}

const adminHotelFilter = document.getElementById("adminHotelFilter")
if (adminHotelFilter) {
  adminHotelFilter.addEventListener("change", (e) => {
    // Rebuild the room grid for the new selection
    loadRoomStatus()
  })
}

// Date filter apply/clear (if elements present)
const applyDateFilterBtn = document.getElementById('applyDateFilter')
const clearDateFilterBtn = document.getElementById('clearDateFilter')
if (applyDateFilterBtn) {
  applyDateFilterBtn.addEventListener('click', () => {
    loadRoomStatus()
  })
}
if (clearDateFilterBtn) {
  clearDateFilterBtn.addEventListener('click', () => {
    const ci = document.getElementById('checkInFilter')
    const co = document.getElementById('checkOutFilter')
    if (ci) ci.value = ''
    if (co) co.value = ''
    loadRoomStatus()
  })
}

// Functions
function loadUserAccounts(searchTerm = userAccountsSearchTerm) {
  const userAccountsTable = document.getElementById("userAccountsTable")
  if (!userAccountsTable) {
    return
  }

  const sessionAdmin = window.currentAdminSession || {}
  const sessionIsSuperAdmin = !!sessionAdmin.isSuperAdmin
  const sessionEmail = (sessionAdmin.email || '').toLowerCase()

  const rawSearch = typeof searchTerm === "string" ? searchTerm : ""
  const trimmedSearch = rawSearch.trim()
  const normalizedSearch = trimmedSearch.toLowerCase()
  const hasSearch = normalizedSearch.length > 0
  userAccountsSearchTerm = rawSearch
  if (userSearchInput && userSearchInput.value !== rawSearch) {
    userSearchInput.value = rawSearch
  }

  let allUsersSnapshot = []
  let allBookingsSnapshot = []
  let allInHouseSnapshot = []
  let allArchivedSnapshot = []
  try {
    allUsersSnapshot = JSON.parse(localStorage.getItem("allUserInfo") || "[]") || []
    allBookingsSnapshot = JSON.parse(localStorage.getItem("allBookings") || "[]") || []
    allInHouseSnapshot = JSON.parse(localStorage.getItem("allInHouse") || "[]") || []
    allArchivedSnapshot = JSON.parse(localStorage.getItem("allArchived") || "[]") || []
  } catch (err) {
    console.error('Failed to parse cached admin datasets', err)
  }

  allUsers = Array.isArray(allUsersSnapshot) ? [...allUsersSnapshot] : []
  allBookings = Array.isArray(allBookingsSnapshot) ? [...allBookingsSnapshot] : []
  allInHouse = Array.isArray(allInHouseSnapshot) ? [...allInHouseSnapshot] : []
  allArchived = Array.isArray(allArchivedSnapshot) ? [...allArchivedSnapshot] : []

  const baseUsers = Array.isArray(allUsersSnapshot)
    ? allUsersSnapshot.filter((entry) => entry && typeof entry === "object")
    : []

  const filteredUsers = hasSearch
    ? baseUsers.filter((user) => {
        const haystack = [user.fullname, user.email, user.mobile, user.phone]
          .map((value) => (value || '').toString().toLowerCase())
          .join(' ')
        return haystack.includes(normalizedSearch)
      })
    : baseUsers

  userAccountsTable.innerHTML = ""

  if (filteredUsers.length === 0) {
    const emptyTitle = hasSearch
      ? `No users match “${escapeHtml(trimmedSearch || rawSearch)}”`
      : 'No users found'
    const emptySubtitle = hasSearch
      ? 'Try searching with a different name, email, or mobile number.'
      : 'No user accounts are available in the system.'
    userAccountsTable.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="no-data">
              <i class="fas fa-users"></i>
              <h5>${emptyTitle}</h5>
              <p class="text-muted">${emptySubtitle}</p>
            </div>
          </td>
        </tr>
      `
    updateUserStats(0, 0, 0)
    return
  }

  let pendingAdminEmails = new Set()
  try {
    const notifications = JSON.parse(localStorage.getItem("adminNotifications") || "[]") || []
    pendingAdminEmails = new Set(
      notifications
        .filter((n) => n && n.status === 'pending' && n.type === 'admin-request' && n.user && n.user.email)
        .map((n) => n.user.email.toLowerCase()),
    )
  } catch {}

  const roleRank = (entry) => {
    const emailLower = (entry?.email || '').toLowerCase()
    if (emailLower === SUPER_ADMIN_EMAIL || entry?.isSuperAdmin) return 0
    const roleLower = (entry?.role || 'user').toLowerCase()
    if (roleLower === 'admin') return 1
    return 2
  }

  let totalBookings = 0

  filteredUsers
    .slice()
    .sort((a, b) => {
      const rankDiff = roleRank(a) - roleRank(b)
      if (rankDiff !== 0) return rankDiff
      const nameA = (a?.fullname || a?.email || '').toString().toLowerCase()
      const nameB = (b?.fullname || b?.email || '').toString().toLowerCase()
      return nameA.localeCompare(nameB)
    })
    .forEach((user, index) => {
      const emailLower = (user.email || '').toLowerCase()
      const isAdminRole = (user.role || 'user').toLowerCase() === 'admin'
      const isSuperAdminUser = emailLower === SUPER_ADMIN_EMAIL || !!user.isSuperAdmin
      const isSelf = emailLower && emailLower === sessionEmail

      const bookingsMatch = (booking) => {
        if (!booking) return false
        const bookingEmail = (booking.email || booking.createdBy || '').toLowerCase()
        const bookingName = (booking.fullname || '').toLowerCase()
        return (
          bookingEmail === emailLower ||
          (booking.fullname && user.fullname && bookingName.includes(user.fullname.toLowerCase()))
        )
      }

      const userBookings = allBookingsSnapshot.filter(bookingsMatch).length
      const userInHouse = allInHouseSnapshot.filter(bookingsMatch).length
      const userArchived = allArchivedSnapshot.filter(bookingsMatch).length

      const totalUserBookings = userBookings + userInHouse + userArchived
      totalBookings += totalUserBookings

      const lastActive = computeLastActive(user, allBookingsSnapshot, allInHouseSnapshot, allArchivedSnapshot)
      const lastActiveDisplay = lastActive ? escapeHtml(lastActive) : "-"

      const fullnameDisplay = escapeHtml(user.fullname || "N/A")
      const emailDisplay = escapeHtml(user.email || "N/A")
      const phoneDisplay = escapeHtml(user.mobile || user.phone || "N/A")

      const hasPendingAdminRequest = emailLower && pendingAdminEmails.has(emailLower)
      const pendingBadge = hasPendingAdminRequest
        ? ' <span class="badge bg-warning text-dark ms-1">Requested Admin</span>'
        : ''
      let roleBadge = ''
      if (isSuperAdminUser) {
        roleBadge = ' <span class="badge bg-warning text-dark ms-1">Super Admin</span>'
      } else if (isAdminRole) {
        roleBadge = ' <span class="badge bg-info text-dark ms-1">Admin</span>'
      }

      const safeId = escapeHtml(user.id || user._id || user.userId || '')
      const safeEmailAttr = escapeHtml(user.email || '')
      const safeNameAttr = escapeHtml(user.fullname || user.email || 'User')
      const safeRoleAttr = escapeHtml((user.role || 'user').toString().toLowerCase())

      const actions = []
      actions.push(
        `<button type="button" class="btn btn-sm btn-outline-primary view-bookings-btn" data-email="${safeEmailAttr}" data-name="${safeNameAttr}" title="View Bookings"><i class="fas fa-eye"></i></button>`,
      )

      const canDelete = !isSuperAdminUser && (!isAdminRole || (sessionIsSuperAdmin && !isSelf))
      if (canDelete) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-outline-danger ms-1 delete-user-btn" data-id="${safeId}" data-email="${safeEmailAttr}" data-name="${safeNameAttr}" data-role="${safeRoleAttr}" title="Delete User &amp; All Data"><i class="fas fa-trash"></i></button>`,
        )
      }

      const canPromote = sessionIsSuperAdmin && !isAdminRole
      if (canPromote) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-success ms-1 approve-admin-btn" data-email="${safeEmailAttr}" data-id="${safeId}" title="Promote to Admin"><i class="fas fa-user-shield"></i> Promote</button>`,
        )
      }

      const canDemote = sessionIsSuperAdmin && isAdminRole && !isSuperAdminUser
      if (canDemote) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-warning ms-1 demote-admin-btn" data-email="${safeEmailAttr}" data-id="${safeId}" title="Demote to User"><i class="fas fa-user-minus"></i> Demote</button>`,
        )
      }

      const actionsHtml =
        actions.length > 0 ? actions.join("\n            ") : '<span class="text-muted small">No actions</span>'

      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${fullnameDisplay}${roleBadge}${pendingBadge}</td>
        <td>${emailDisplay}</td>
        <td>${phoneDisplay}</td>
        <td>
          <span class="badge bg-primary">${totalUserBookings}</span>
        </td>
        <td>${lastActiveDisplay}</td>
        <td>
          <div class="btn-group" role="group">
            ${actionsHtml}
          </div>
        </td>
      `
      userAccountsTable.appendChild(row)
    })

  const regularVisibleCount = filteredUsers.filter(
    (user) => user && (user.role || 'user').toLowerCase() !== 'admin',
  ).length

  updateUserStats(regularVisibleCount, totalBookings, 0)
}

function loadAdminNotifications() {
  const btnCount = document.getElementById('adminNotificationCount')
  const listEl = document.getElementById('adminNotificationsList')
  if (!btnCount || !listEl) return

  const sessionAdmin = window.currentAdminSession || {}
  const sessionIsSuperAdmin = !!sessionAdmin.isSuperAdmin

  let notifications = []
  try {
    notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]') || []
  } catch {}
  const pending = notifications.filter((n) => n && n.status === 'pending')
  btnCount.textContent = pending.length

  if (pending.length === 0) {
    listEl.innerHTML = '<li class="text-muted">No notifications</li>'
    return
  }

  listEl.innerHTML = ''
  pending.forEach((n) => {
    if (n.type === 'admin-request') {
      const li = document.createElement('li')
      li.className = 'mb-2'
      const name = escapeHtml(n.user?.fullname || n.user?.email || 'Unknown User')
      const email = escapeHtml(n.user?.email || '')
      const actionsHtml = sessionIsSuperAdmin
        ? `<button class="btn btn-sm btn-success me-1" onclick="approveAdminRequest('${n.id}')">Approve</button>
           <button class="btn btn-sm btn-danger" onclick="rejectAdminRequest('${n.id}')">Reject</button>`
        : '<span class="badge bg-secondary-subtle text-secondary fw-semibold">Super admin approval required</span>'
      li.innerHTML = `
          <div>
            <strong>${name}</strong><br/>
            <small class="text-muted">${email}</small>
            <div class="mt-1 d-flex justify-content-end">
              ${actionsHtml}
            </div>
          </div>
        `
      listEl.appendChild(li)
    }
  })
}

window.approveAdminRequest = async function (notificationId) {
  const sessionAdmin = window.currentAdminSession || {}
  if (!sessionAdmin.isSuperAdmin) {
    if (window.Swal) {
      Swal.fire('Restricted', 'Only the super admin can approve admin requests.', 'warning')
    }
    return
  }

  let notifications = []
  try {
    notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]') || []
  } catch {}
  const idx = notifications.findIndex((n) => n.id === notificationId)
  if (idx === -1) return

  const targetEmail = notifications[idx]?.user?.email || ''
  const targetEmailLower = targetEmail.toLowerCase()
  if (!targetEmailLower) {
    if (window.Swal) Swal.fire('Error', 'Unable to resolve user email for this request.', 'error')
    return
  }

  const promoteLocally = () => {
    notifications[idx].status = 'approved'
    localStorage.setItem('adminNotifications', JSON.stringify(notifications))

    let pending = []
    try {
      pending = JSON.parse(localStorage.getItem('pendingAdminAccounts') || '[]') || []
    } catch {}
    const users = JSON.parse(localStorage.getItem('allUserInfo') || '[]') || []

    const pendingIdx = pending.findIndex((p) => (p?.email || '').toLowerCase() === targetEmailLower)
    if (pendingIdx !== -1) {
      const approvedAccount = { ...pending[pendingIdx], role: 'admin', pendingAdmin: false }
      pending.splice(pendingIdx, 1)
      localStorage.setItem('pendingAdminAccounts', JSON.stringify(pending))

      const userIdx = users.findIndex((u) => (u?.email || '').toLowerCase() === targetEmailLower)
      if (userIdx !== -1) {
        users[userIdx] = { ...users[userIdx], ...approvedAccount }
      } else {
        users.unshift(approvedAccount)
      }
      localStorage.setItem('allUserInfo', JSON.stringify(users))
    } else {
      const userIdx = users.findIndex((u) => (u?.email || '').toLowerCase() === targetEmailLower)
      if (userIdx !== -1) {
        users[userIdx].role = 'admin'
        users[userIdx].pendingAdmin = false
        localStorage.setItem('allUserInfo', JSON.stringify(users))
      }
    }
  }

  const usersSnapshot = JSON.parse(localStorage.getItem('allUserInfo') || '[]') || []
  const targetUser = usersSnapshot.find((u) => (u?.email || '').toLowerCase() === targetEmailLower)
  const targetId = targetUser?.id || targetUser?._id || ''

  try {
    if (client && targetId) {
      await client.post(`/admin/promote/${targetId}`, {}, { auth: true, redirectOnAuthError: false })
      promoteLocally()
      try {
        await refreshAdminDataFromServer({ silent: true })
      } catch (err) {
        console.warn('Failed to refresh admin data after approving request', err)
      }
    } else {
      promoteLocally()
    }
    loadAdminNotifications()
    loadUserAccounts()
    if (window.Swal) Swal.fire('Approved', 'User has been promoted to admin.', 'success')
  } catch (err) {
    console.error('approveAdminRequest failed', err)
    if (window.Swal) {
      Swal.fire('Error', err?.message || 'Failed to approve admin request.', 'error')
    }
  }
}

window.rejectAdminRequest = function (notificationId) {
  const sessionAdmin = window.currentAdminSession || {}
  if (!sessionAdmin.isSuperAdmin) {
    if (window.Swal) {
      Swal.fire('Restricted', 'Only the super admin can reject admin requests.', 'warning')
    }
    return
  }

  let notifications = []
  try {
    notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]') || []
  } catch {}
  const idx = notifications.findIndex((n) => n.id === notificationId)
  if (idx === -1) return
  notifications[idx].status = 'rejected'
  localStorage.setItem('adminNotifications', JSON.stringify(notifications))
  loadAdminNotifications()
  if (window.Swal) Swal.fire('Rejected', 'Admin request has been rejected.', 'info')
}

function showUserBookings(userEmail, userName) {
  // Showing bookings for user

  userNameTitle.textContent = `${userName}'s Bookings`
  userAccountsTable.parentElement.parentElement.classList.add("d-none")
  userBookingsCard.classList.remove("d-none")

  const bookings = allBookings.filter(
    (booking) =>
      booking.createdBy === userEmail ||
      booking.email === userEmail ||
      (booking.fullname && booking.fullname.toLowerCase().includes(userName.toLowerCase())),
  )

  const inHouse = allInHouse.filter(
    (booking) =>
      booking.createdBy === userEmail ||
      booking.email === userEmail ||
      (booking.fullname && booking.fullname.toLowerCase().includes(userName.toLowerCase())),
  )

  const archive = allArchived.filter(
    (booking) =>
      booking.createdBy === userEmail ||
      booking.email === userEmail ||
      (booking.fullname && booking.fullname.toLowerCase().includes(userName.toLowerCase())),
  )

  // User bookings counts available

  document.getElementById("booking-tab").style.display = "block"
  document.getElementById("inhouse-tab").style.display = "block"
  document.getElementById("archive-tab").style.display = "block"

  document.getElementById("booking-tab").textContent = `Bookings (${bookings.length})`
  document.getElementById("inhouse-tab").textContent = `InHouse (${inHouse.length})`
  document.getElementById("archive-tab").textContent = `Archive (${archive.length})`

  // Render bookings in respective tables
  renderBookingsTable(bookingTable, bookings, "Booking")
  renderBookingsTable(inhouseTable, inHouse, "InHouse")
  renderBookingsTable(archiveTable, archive, "Archived")

  document.getElementById("booking-tab").click()

  if (bookings.length === 0 && inHouse.length > 0) {
    document.getElementById("inhouse-tab").click()
  } else if (bookings.length === 0 && inHouse.length === 0 && archive.length > 0) {
    document.getElementById("archive-tab").click()
  }
}

function renderBookingsTable(element, bookings, status) {
  element.innerHTML = ""

  if (bookings.length === 0) {
    element.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-4">
                        <div class="no-data">
                            <i class="fas fa-calendar-times"></i>
                            <h5>No ${status.toLowerCase()} bookings found</h5>
                            <p class="text-muted">This user has no ${status.toLowerCase()} records.</p>
                        </div>
                    </td>
                </tr>
            `
    return
  }

  bookings.forEach((booking, index) => {
    const json = JSON.stringify(booking)
    const jsonAttr = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;')
    let statusLabel = booking.status || status
    const statusValue = (statusLabel || '').toString().toLowerCase()
    let statusClass = "primary"
    if (statusValue === "inhouse") statusClass = "success"
    else if (statusValue === "archived") statusClass = "secondary"
    else if (statusValue === "cancelled") statusClass = "danger"
    else if (statusValue === "booking" || statusValue === "confirmed") statusClass = "primary"

    const row = document.createElement("tr")
    row.innerHTML = `
                <td>${index + 1}</td>
                <td>${booking.hotel || "N/A"}</td>
                <td>${booking.roomNo || "N/A"}</td>
                <td>${booking.fullname || "N/A"}</td>
                <td>${formatDate(booking.checkInDate)}</td>
                <td>${formatDate(booking.checkOutDate)}</td>
                <td>${booking.totalPeople || "N/A"}</td>
                <td>${booking.price || "N/A"}</td>
                <td>
          <span class="badge bg-${statusClass}">${statusLabel}</span>
                </td>
        <td>
          <button class="btn btn-sm btn-outline-primary action-btn view-booking-btn" data-id="${booking.id || index}" data-booking='${jsonAttr}'>
                        <i class="fas fa-eye"></i>
                    </button>
                    ${status === "Booking"
        ? `
                    <button class="btn btn-sm btn-outline-success action-btn move-to-inhouse-btn" data-id="${booking.id || index}" data-booking='${JSON.stringify(booking)}' title="Move to InHouse">
                        <i class="fas fa-check"></i>
                    </button>
                    `
        : status === "InHouse"
          ? `
                    <button class="btn btn-sm btn-outline-warning action-btn move-to-archive-btn" data-id="${booking.id || index}" data-booking='${JSON.stringify(booking)}' title="Move to Archive">
                        <i class="fas fa-check"></i>
                    </button>
                    `
          : ""
      }
                    ${status !== "Archived"
        ? `
                    <button class="btn btn-sm btn-outline-danger action-btn cancel-booking-btn" data-id="${booking.id || index}">
                        <i class="fas fa-times"></i>
                    </button>
                    `
        : ""
      }
                </td>
            `
    element.appendChild(row)
  })

  // Rendered bookings table
}

function viewBookingDetails(booking) {
  if (!booking) {
    if (typeof Swal !== 'undefined') Swal.fire('Error', 'Booking not found!', 'error')
    else alert('Booking not found!')
    return
  }

  const html = `
    <div class="text-start">
      <p><strong>Guest Name:</strong> ${escapeHtml(booking.fullname || 'N/A')}</p>
      <p><strong>Email:</strong> ${escapeHtml(booking.email || booking.createdBy || 'N/A')}</p>
      <p><strong>Hotel:</strong> ${escapeHtml(booking.hotel || 'N/A')}</p>
      <p><strong>Room No:</strong> ${escapeHtml(booking.roomNo || 'N/A')}</p>
      <p><strong>Check-In:</strong> ${formatDate(booking.checkInDate)}</p>
      <p><strong>Check-Out:</strong> ${formatDate(booking.checkOutDate)}</p>
      <p><strong>Guests:</strong> ${escapeHtml(booking.totalPeople || 'N/A')}</p>
      <p><strong>Mobile:</strong> ${escapeHtml(booking.mobile || 'N/A')}</p>
      <p><strong>Price:</strong> ${escapeHtml(booking.price || 'N/A')}</p>
      <p><strong>Status:</strong> ${escapeHtml(getBookingStatus(booking))}</p>
      <p><strong>Created:</strong> ${formatDate(booking.createdAt, true)}</p>
    </div>`

  if (typeof Swal !== 'undefined') {
    Swal.fire({ title: 'Booking Details', html, icon: 'info', confirmButtonText: 'Close', width: 600 })
  } else {
    alert('Booking details:\n' + html.replace(/<[^>]+>/g, ' '))
  }
}

function loadRoomStatus() {
  if (!roomGrid) return

  // Selected hotel filter (supports "All Hotels" or a specific hotel)
  const adminHotelFilter = document.getElementById("adminHotelFilter")
  const selectedHotel = adminHotelFilter ? adminHotelFilter.value : "All Hotels"
  const selectedCanonicalHotel = canonicalHotelName(selectedHotel)

  // Date filters (optional, if present in DOM)
  const checkInInput = document.getElementById("checkInFilter")
  const checkOutInput = document.getElementById("checkOutFilter")
  const checkInDate = checkInInput ? checkInInput.value : ""
  const checkOutDate = checkOutInput ? checkOutInput.value : ""

  const datesOverlap = (aStart, aEnd, bStart, bEnd) => {
    const a0 = aStart ? new Date(aStart) : null
    const a1 = aEnd ? new Date(aEnd) : null
    const b0 = bStart ? new Date(bStart) : null
    const b1 = bEnd ? new Date(bEnd) : null
    if (!a0 || !a1 || !b0 || !b1) return true
    return a0 <= b1 && b0 <= a1
  }

  const roomsByKey = new Map()

  const ensureRoom = (hotelName, roomNo, price = 0, sourceRoom = null) => {
    const key = buildRoomKey(hotelName, roomNo, selectedHotel)
    if (!key) return null
    let entry = roomsByKey.get(key)
    if (!entry) {
      const normalizedRoom = normalizeRoomNo(roomNo)
      if (!normalizedRoom) return null
      const canonicalRoom = canonicalRoomId(normalizedRoom)
      const canonicalHotel = canonicalHotelName(hotelName) || canonicalHotelName(selectedHotel)
      entry = {
        key,
        hotel: hotelName || (selectedHotel !== "All Hotels" ? selectedHotel : ""),
        roomNo: normalizedRoom,
        canonicalHotel,
        canonicalRoom,
        price: Number(price) || 0,
        status: "available",
        booking: null,
        roomId: sourceRoom?.id || null,
        roomType: sourceRoom?.roomType || '',
        roomClass: sourceRoom?.roomClass || '',
        baseRoom: sourceRoom || null,
      }
      roomsByKey.set(key, entry)
    }

    const canonicalRoom = entry.canonicalRoom
    const resolvedSource = sourceRoom || findCatalogRoom(entry.canonicalHotel, canonicalRoom)
    if (resolvedSource) {
      if (!entry.roomId && resolvedSource.id) entry.roomId = resolvedSource.id
      if ((!entry.roomType || entry.roomType === '') && resolvedSource.roomType) entry.roomType = resolvedSource.roomType
      if ((!entry.roomClass || entry.roomClass === '') && resolvedSource.roomClass) entry.roomClass = resolvedSource.roomClass
      entry.baseRoom = resolvedSource
      const resolvedPrice = Number(resolvedSource.pricePerNight ?? resolvedSource.price ?? 0)
      if (!Number.isFinite(entry.price) || entry.price <= 0) {
        entry.price = resolvedPrice
      }
      const baseStatus = (resolvedSource.status || '').toString().trim().toLowerCase()
      if (baseStatus && baseStatus !== 'active' && entry.status === 'available') {
        entry.status = 'unavailable'
      }
    }

    const numericPrice = Number(price)
    if (Number.isFinite(numericPrice) && numericPrice > 0) entry.price = numericPrice

    if (!entry.hotel && hotelName) entry.hotel = hotelName
    return entry
  }

  try {
    const catalog = (typeof getCatalog === 'function') ? getCatalog() : JSON.parse(localStorage.getItem('roomCatalog') || '[]')
    if (Array.isArray(catalog) && catalog.length > 0) {
      catalog.forEach((hotelEntry) => {
        if (!hotelEntry || !hotelEntry.hotel) return
        const entryCanonical = canonicalHotelName(hotelEntry.hotel)
        if (selectedHotel && selectedHotel !== 'All Hotels' && entryCanonical !== selectedCanonicalHotel) return
        const roomsArr = Array.isArray(hotelEntry.rooms) ? hotelEntry.rooms : []
        roomsArr.forEach((roomEntry) => {
          const roomNoValue = roomEntry && (roomEntry.roomNo ?? roomEntry.number ?? roomEntry.room_number)
          if (roomNoValue == null || roomNoValue === "") return
          ensureRoom(hotelEntry.hotel, roomNoValue, roomEntry?.price ?? roomEntry?.pricePerNight ?? 0, roomEntry)
        })
      })
    }
  } catch (err) {
    console.error('Error building rooms from catalog, falling back to static ranges', err)
  }

  // If no catalog-based rooms populated, seed static fallback inventory
  if (roomsByKey.size === 0) {
    const selected = (selectedHotel && selectedHotel !== 'All Hotels') ? selectedCanonicalHotel : '';
    STATIC_ROOM_FALLBACK.forEach((entry) => {
      const entryCanon = canonicalHotelName(entry.hotel);
      if (selected && entryCanon !== selected) return;
      entry.ranges.forEach((r) => {
        for (let i = r.start; i <= r.end; i += 1) {
          ensureRoom(entry.hotel, String(i), r.price, null);
        }
      });
    });
  }

  const filterBySelectedHotel = (recordHotelName) => {
    if (!selectedHotel || selectedHotel === "All Hotels") return true
    const recordCanonical = canonicalHotelName(recordHotelName)
    if (!recordCanonical) return true
    return recordCanonical === selectedCanonicalHotel
  }

  const applyRecordToRoom = (record, status) => {
    if (!record) return
    const recordHotelName = getRecordHotelName(record)
    if (!filterBySelectedHotel(recordHotelName)) return
    const normalizedRoom = normalizeRoomNo(record.roomNo)
    if (!normalizedRoom) return
    if (checkInDate && checkOutDate && !datesOverlap(checkInDate, checkOutDate, record.checkInDate, record.checkOutDate)) return

    const recordHotelCanonical = canonicalHotelName(recordHotelName)
    const canonicalRoom = canonicalRoomId(normalizedRoom)

    const baseInfo = findCatalogRoom(recordHotelCanonical, canonicalRoom)
    let room = null
    if (recordHotelCanonical) {
      const key = buildRoomKey(recordHotelName, normalizedRoom, selectedHotel)
      room = roomsByKey.get(key) || ensureRoom(recordHotelName, normalizedRoom, record.price, baseInfo)
    } else {
      room = Array.from(roomsByKey.values()).find((entry) => entry.canonicalRoom === canonicalRoom)
      if (!room) {
        const fallbackHotel = selectedHotel !== 'All Hotels' ? selectedHotel : recordHotelName
        room = ensureRoom(fallbackHotel, normalizedRoom, record.price, baseInfo)
      }
    }
    if (!room) return

    if (status === "inhouse") {
      room.status = "inhouse"
      room.booking = record
    } else if (status === "booked") {
      if (room.status === "inhouse") return
      room.status = "booked"
      room.booking = record
    }
    if (!room.hotel && recordHotelName) room.hotel = recordHotelName
  }

  allInHouse.forEach((record) => applyRecordToRoom(record, "inhouse"))
  allBookings.forEach((record) => {
    const status = record?.backendStatus || record?.status
    if (!isBlockingStatus(status)) return
    applyRecordToRoom(record, "booked")
  })

  const rooms = Array.from(roomsByKey.values())
  rooms.sort((a, b) => {
    const hotelA = a.hotel || ""
    const hotelB = b.hotel || ""
    if (!selectedHotel || selectedHotel === "All Hotels") {
      const hotelCompare = hotelA.localeCompare(hotelB, undefined, { sensitivity: "base" })
      if (hotelCompare !== 0) return hotelCompare
    }
    return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })
  })

  roomGrid.innerHTML = ""

  rooms.forEach((room) => {
    if (selectedHotel && selectedHotel !== "All Hotels") {
      const roomCanonical = canonicalHotelName(room.hotel)
      if (roomCanonical && roomCanonical !== selectedCanonicalHotel) return
    }

    let statusClass = "bg-success"
    let statusLabel = "Available"
    if (room.status === "booked") {
      statusClass = "bg-primary"
      statusLabel = "Booked"
    }
    if (room.status === "inhouse") {
      statusClass = "bg-warning"
      statusLabel = "In House"
    }
    if (room.status === "unavailable") {
      statusClass = "bg-secondary"
      statusLabel = "Temporarily Unavailable"
    }

    const activeBooking = room.booking || null
    let guestHtml = ""
    if (activeBooking) {
      const user = allUsers.find((u) => u.email === activeBooking.createdBy || u.email === activeBooking.email)
      const guestName = user?.fullname || activeBooking.fullname || activeBooking.email || "Guest"
      const guestMobile = user?.mobile || activeBooking.mobile || ""
      const contact = guestMobile ? ` • ${guestMobile}` : ""
      const accountLine = user ? `<div class="small text-truncate text-dark mt-1">Account: ${user.email}</div>` : ""
      guestHtml = `<div class="small text-truncate text-dark mt-1">${guestName}${contact}</div>${accountLine}`
    }

    const bookingDataAttr = activeBooking ? `data-booking='${JSON.stringify(activeBooking).replace(/'/g, "&#39;")}'` : ""
    const displayHotel = room.hotel || getRecordHotelName(activeBooking) || (selectedHotel !== "All Hotels" ? selectedHotel : "Unknown Hotel")
    const roomMetaPieces = []
    if (room.roomType) roomMetaPieces.push(room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1))
    if (room.roomClass) roomMetaPieces.push(room.roomClass.charAt(0).toUpperCase() + room.roomClass.slice(1))
    if (Number.isFinite(room.price) && room.price > 0) roomMetaPieces.push(formatUSD(room.price))
    const roomMeta = roomMetaPieces.length ? `<div class="small text-muted mt-1">${roomMetaPieces.map(escapeHtml).join(' • ')}</div>` : ''
    const editButton = room.roomId
      ? `<div class="d-grid mt-2"><button type="button" class="btn btn-sm btn-outline-secondary room-edit-btn" data-action="edit-room" data-room-id="${escapeHtml(String(room.roomId))}" data-room-no="${escapeHtml(room.roomNo)}" data-hotel="${escapeHtml(displayHotel)}">Edit</button></div>`
      : ''

    roomGrid.innerHTML += `
        <div class="col-md-2">
          <div class="card room-card" style="cursor:pointer;" data-room="${room.roomNo}" data-hotel="${displayHotel}" ${bookingDataAttr}>
            <div class="card-body p-2">
              <h6 class="mb-1">Room ${room.roomNo}</h6>
              <span class="badge ${statusClass}">${statusLabel}</span>
              <div class="small mt-1 text-muted">${displayHotel}</div>
              ${roomMeta}
              ${guestHtml}
              ${editButton}
            </div>
          </div>
        </div>
      `
  })

  updateRoomStats(rooms)
}

function moveToInHouse(bookingData) {
  if (!bookingData) {
    Swal.fire("Error", "Booking data not found!", "error")
    return
  }

  const bookingId = bookingData.id || bookingData._id || bookingData.bookingId

  Swal.fire({
    title: "Move to InHouse?",
    text: `Move ${bookingData.fullname || "this guest"}'s booking (Room ${bookingData.roomNo || "N/A"}) to InHouse?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, move to InHouse!",
    cancelButtonText: "Cancel",
  }).then(async (result) => {
    if (!result.isConfirmed) return

    if (!client || !bookingId) {
      // Fallback to legacy localStorage behaviour when API client unavailable
      allBookings = allBookings.filter((b) => {
        if (bookingId && bookingMatchesIdentifier(b, bookingId)) return false
        return (b.roomNo || '') + (b.fullname || '') !== (bookingData.roomNo || '') + (bookingData.fullname || '')
      })
      const inhouseBooking = {
        ...bookingData,
        movedToInHouseAt: new Date().toISOString(),
        status: "InHouse",
        backendStatus: 'checked_in',
      }
      allInHouse.unshift(inhouseBooking)
      persistAdminData()
      updateStats()
      loadRoomStatus()
      const currentUserName = document.getElementById("userNameTitle")?.textContent.replace("'s Bookings", "")
      const currentUser = currentUserName
        ? allUsers.find((user) => user.fullname === currentUserName)
        : null
      if (currentUser) {
        showUserBookings(currentUser.email, currentUser.fullname)
      }
      Swal.fire("Moved!", "The booking has been moved to InHouse.", "success")
      return
    }

    try {
      await client.patch(`/bookings/${bookingId}`, { status: 'checked_in' })
      Swal.fire("Moved!", "The booking has been moved to InHouse.", "success")
      await refreshAdminDataFromServer({ silent: true })
    } catch (err) {
      console.error('Failed to move booking to in-house', err)
      const message = err?.data?.message || err?.message || 'Unable to move booking to InHouse.'
      Swal.fire("Error", message, "error")
    }
  })
}

function moveToArchive(bookingData) {
  if (!bookingData) {
    Swal.fire("Error", "Booking data not found!", "error")
    return
  }

  const bookingId = bookingData.id || bookingData._id || bookingData.bookingId

  Swal.fire({
    title: "Move to Archive?",
    text: `Move ${bookingData.fullname || "this guest"}'s booking (Room ${bookingData.roomNo || "N/A"}) to Archive?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#ffc107",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, move to Archive!",
    cancelButtonText: "Cancel",
  }).then(async (result) => {
    if (!result.isConfirmed) return

    if (!client || !bookingId) {
      allInHouse = allInHouse.filter((b) => {
        if (bookingId && bookingMatchesIdentifier(b, bookingId)) return false
        return (b.roomNo || '') + (b.fullname || '') !== (bookingData.roomNo || '') + (bookingData.fullname || '')
      })
      const archivedBooking = {
        ...bookingData,
        movedToArchiveAt: new Date().toISOString(),
        status: "Archived",
        backendStatus: 'checked_out',
      }
      allArchived.unshift(archivedBooking)
      persistAdminData()
      updateStats()
      loadRoomStatus()
      const currentUserName = document.getElementById("userNameTitle")?.textContent.replace("'s Bookings", "")
      const currentUser = currentUserName
        ? allUsers.find((user) => user.fullname === currentUserName)
        : null
      if (currentUser) {
        showUserBookings(currentUser.email, currentUser.fullname)
      }
      Swal.fire("Archived!", "The booking has been moved to Archive.", "success")
      return
    }

    try {
      await client.patch(`/bookings/${bookingId}`, { status: 'checked_out' })
      Swal.fire("Archived!", "The booking has been moved to Archive.", "success")
      await refreshAdminDataFromServer({ silent: true })
    } catch (err) {
      console.error('Failed to archive booking', err)
      const message = err?.data?.message || err?.message || 'Unable to archive this booking.'
      Swal.fire("Error", message, "error")
    }
  })
}

function cancelBooking(bookingId) {
  if (!bookingId) {
    Swal.fire('Error', 'Booking identifier missing.', 'error')
    return
  }

  const booking = findBookingByIdentifier(bookingId)
  const guestName = booking?.fullname || 'this booking'

  Swal.fire({
    title: 'Cancel booking?',
    text: `Cancel ${guestName}'s reservation? This will release the room for new bookings.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, cancel it',
    cancelButtonText: 'Keep booking',
  }).then(async (result) => {
    if (!result.isConfirmed) return

    if (!client) {
      allBookings = allBookings.filter((b) => !bookingMatchesIdentifier(b, bookingId))
      allInHouse = allInHouse.filter((b) => !bookingMatchesIdentifier(b, bookingId))
      allArchived = allArchived.filter((b) => !bookingMatchesIdentifier(b, bookingId))
      if (booking) {
        const cancelled = {
          ...booking,
          status: 'Cancelled',
          backendStatus: 'cancelled',
          cancelledAt: new Date().toISOString(),
        }
        allArchived.unshift(cancelled)
      }
      persistAdminData()
      updateStats()
      loadRoomStatus()
      const currentUserName = document.getElementById('userNameTitle')?.textContent.replace("'s Bookings", '')
      const currentUser = currentUserName
        ? allUsers.find((user) => user.fullname === currentUserName)
        : null
      if (currentUser) {
        showUserBookings(currentUser.email, currentUser.fullname)
      }
      Swal.fire('Cancelled', 'The booking has been cancelled locally.', 'success')
      return
    }

    try {
      await client.patch(`/bookings/${bookingId}`, { status: 'cancelled' })
      Swal.fire('Cancelled', 'The booking has been cancelled.', 'success')
      await refreshAdminDataFromServer({ silent: true })
    } catch (err) {
      console.error('Failed to cancel booking', err)
      const message = err?.data?.message || err?.message || 'Unable to cancel this booking.'
      Swal.fire('Error', message, 'error')
    }
  })
}

function formatDate(dateString, includeTime = false) {
  if (!dateString) return "N/A"

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Invalid Date"

  if (includeTime) {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Compute last active time for a user from booking/inhouse/archived records
function computeLastActive(user, bookings = [], inHouse = [], archived = []) {
  if (!user) return null
  const email = user.email
  const name = user.fullname

  const collectDates = (arr) =>
    arr
      .filter((b) => b && (b.createdBy === email || b.email === email || (b.fullname && name && b.fullname.toLowerCase().includes(name.toLowerCase()))))
      .map((b) => {
        // prefer moved timestamps or updated timestamps, fallback to createdAt
        return new Date(b.movedToInHouseAt || b.movedToArchiveAt || b.updatedAt || b.createdAt || b.checkInDate || b.createdAt).getTime()
      })
      .filter((t) => !isNaN(t))

  const dates = [...collectDates(bookings), ...collectDates(inHouse), ...collectDates(archived)]
  if (dates.length === 0) return null
  const latest = Math.max(...dates)
  return formatDate(new Date(latest).toISOString(), true)
}

function updateStats() {
  // Total users (exclude admin accounts)
  const nonAdminUsersCount = allUsers.filter((u) => (u.role || 'user').toLowerCase() !== 'admin').length
  totalUsersEl.textContent = nonAdminUsersCount

  const activeCount = allBookings.length + allInHouse.length
  activeBookingsEl.textContent = activeCount

  // Total revenue (sum of all prices)
  const totalRevenue = [...allBookings, ...allInHouse, ...allArchived].reduce(
    (sum, booking) => sum + (Number.parseFloat(booking.price) || 0),
    0,
  )
  totalRevenueEl.textContent = formatUSD(totalRevenue)

  // Stats updated
}

function backendStatusToUi(status) {
  const value = (status || '').toString().toLowerCase()
  if (value === 'checked_in') return 'InHouse'
  if (value === 'checked_out') return 'Archived'
  if (value === 'cancelled') return 'Cancelled'
  if (value === 'confirmed') return 'Booking'
  return 'Booking'
}

function getBookingStatus(booking) {
  if (!booking || typeof booking !== 'object') return 'Unknown'
  if (booking.status) return booking.status
  if (booking.backendStatus) return backendStatusToUi(booking.backendStatus)
  return 'Booking'
}

function parseBookingNotes(value) {
  if (!value) return { raw: '', data: {}, text: '' }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') {
        return {
          raw: value,
          data: parsed,
          text: parsed.note || parsed.notes || '',
        }
      }
    } catch (err) {
      return { raw: value, data: {}, text: value }
    }
    return { raw: value, data: {}, text: value }
  }
  if (typeof value === 'object') {
    const raw = JSON.stringify(value)
    return { raw, data: value, text: value.note || value.notes || '' }
  }
  const stringified = String(value)
  return { raw: stringified, data: {}, text: stringified }
}

function normalizeBookingEntry(rawBooking) {
  if (!rawBooking || typeof rawBooking !== 'object') return null
  const clone = { ...rawBooking }
  const id = clone.id || clone._id || clone.bookingId || `${clone.hotelName || clone.hotel || ''}-${clone.roomNo || ''}-${clone.checkInDate || ''}`
  const hotelName = clone.hotelName || clone.hotel || ''
  const email = clone.email || clone.userEmail || clone.createdBy || ''
  const backendStatus = (clone.backendStatus || clone.status || '').toString().toLowerCase()
  const status = backendStatusToUi(backendStatus)
  const notesSource = clone.notice !== undefined ? clone.notice : clone.notes
  const notesInfo = parseBookingNotes(notesSource)

  return {
    ...clone,
    id,
    hotel: hotelName,
    hotelName,
    email,
    userEmail: clone.userEmail || email || null,
    createdBy: clone.createdBy || email || '',
    price: Number(clone.price ?? 0) || 0,
    backendStatus,
    status,
    statusLabel: status,
    paymentMethod: clone.paymentMethod || notesInfo.data.paymentMethod || '',
    roomType: clone.roomType || notesInfo.data.roomType || '',
    roomClass: clone.roomClass || notesInfo.data.roomClass || '',
    notice: typeof notesSource === 'string' ? notesSource : notesInfo.text,
    notes: notesInfo.raw,
  }
}

function normalizeUserEntry(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') return null
  return {
    ...rawUser,
    id: rawUser.id || rawUser._id || rawUser.userId || rawUser.email || null,
    fullname: rawUser.fullname || rawUser.name || '',
    email: rawUser.email || '',
    role: rawUser.role || 'user',
    phone: rawUser.phone || rawUser.mobile || '',
    address: rawUser.address || rawUser.location || '',
  }
}

function partitionBookingsByStatus(bookings) {
  const active = []
  const inHouse = []
  const archived = []

  bookings.forEach((booking) => {
    const status = (booking.backendStatus || '').toString().toLowerCase()
    if (INHOUSE_BACKEND_STATUSES.has(status)) {
      inHouse.push(booking)
    } else if (ARCHIVED_BACKEND_STATUSES.has(status)) {
      archived.push(booking)
    } else {
      active.push(booking)
    }
  })

  return { active, inHouse, archived }
}

function persistAdminData() {
  try {
    localStorage.setItem('allUserInfo', JSON.stringify(allUsers))
    localStorage.setItem('allBookings', JSON.stringify(allBookings))
    localStorage.setItem('allInHouse', JSON.stringify(allInHouse))
    localStorage.setItem('allArchived', JSON.stringify(allArchived))
  } catch (err) {
    console.warn('Unable to persist admin data snapshot', err)
  }
}

async function refreshAdminDataFromServer(options = {}) {
  if (!client || isSyncingAdminData) return
  const { silent = false } = options
  isSyncingAdminData = true
  try {
    try {
      client.ensureAuthenticated({ redirect: 'Login.html' })
    } catch (authErr) {
      console.warn('Admin data sync requires authentication', authErr)
      return
    }

    const [bookingsRes, usersRes] = await Promise.all([
      client
        .get('/bookings', { redirectOnAuthError: false })
        .catch((err) => {
          if (!silent) console.error('Failed to fetch bookings', err)
          throw err
        }),
      client
        .get('/users', { redirectOnAuthError: false })
        .catch((err) => {
          console.warn('Failed to fetch users', err)
          return null
        }),
    ])

    const bookingsRaw = Array.isArray(bookingsRes?.bookings) ? bookingsRes.bookings : []
    const normalizedBookings = bookingsRaw
      .map((entry) => normalizeBookingEntry(entry))
      .filter((entry) => entry)

    const partitions = partitionBookingsByStatus(normalizedBookings)
    allBookings = partitions.active
    allInHouse = partitions.inHouse
    allArchived = partitions.archived

    if (usersRes && Array.isArray(usersRes.users)) {
      allUsers = usersRes.users
        .map((user) => normalizeUserEntry(user))
        .filter((user) => user)
    }

    migrateBookingData()
    persistAdminData()
    hydrateDashboardViews()
  } catch (err) {
    if (!silent) {
      console.error('Admin data sync failed', err)
      if (window.Swal) {
        window.Swal.fire('Error', err?.message || 'Unable to refresh admin data from the server.', 'error')
      } else {
        alert(err?.message || 'Unable to refresh admin data from the server.')
      }
    }
  } finally {
    isSyncingAdminData = false
  }
}

function bookingMatchesIdentifier(booking, identifier) {
  if (!booking || identifier === undefined || identifier === null) return false
  const key = String(identifier)
  if (booking.id && String(booking.id) === key) return true
  if (booking._id && String(booking._id) === key) return true
  if (booking.bookingId && String(booking.bookingId) === key) return true
  return false
}

function findBookingByIdentifier(identifier) {
  if (!identifier) return null
  const universe = [...allBookings, ...allInHouse, ...allArchived]
  return universe.find((booking) => bookingMatchesIdentifier(booking, identifier))
}

function migrateBookingData() {
  const applyNormalization = (records) =>
    records
      .map((entry) => normalizeBookingEntry(entry))
      .filter((entry) => entry)
      .map((entry) => {
        if (!entry.createdBy && entry.email) entry.createdBy = entry.email
        if (!entry.createdBy) entry.createdBy = allUsers.length > 0 ? allUsers[0].email : 'unknown@user.com'
        if (!entry.email && entry.createdBy) entry.email = entry.createdBy
        return entry
      })

  allBookings = applyNormalization(allBookings)
  allInHouse = applyNormalization(allInHouse)
  allArchived = applyNormalization(allArchived)
}

function loadUserBills() {
  userBillsTable.innerHTML = ""

  // Generate bills from all bookings (booking, inhouse, archived)
  const allUserBills = []
  let billId = 1

  // Create bills from all booking sources
  const allBookingSources = [
    ...allBookings.map((b) => ({ ...b, source: "booking" })),
    ...allInHouse.map((b) => ({ ...b, source: "inhouse" })),
    ...allArchived.map((b) => ({ ...b, source: "archived" })),
  ]

  allBookingSources.forEach((booking) => {
    if (booking.price && Number.parseFloat(booking.price) > 0) {
      const user = allUsers.find((u) => u.email === booking.createdBy || u.email === booking.email)
      const dueDate = new Date(booking.checkOutDate || booking.checkInDate || Date.now())
      dueDate.setDate(dueDate.getDate() + 7) // 7 days after checkout

      const bill = {
        id: billId++,
        userId: user?.email || booking.email || booking.createdBy,
        userName: user?.fullname || booking.fullname || "Unknown User",
        userEmail: user?.email || booking.email || booking.createdBy,
        hotel: booking.hotel || "N/A",
        roomNo: booking.roomNo || "N/A",
        amount: Number.parseFloat(booking.price) || 0,
        status: booking.source === "archived" ? "paid" : Math.random() > 0.3 ? "pending" : "paid",
        dueDate: dueDate.toISOString(),
        createdAt: booking.createdAt || new Date().toISOString(),
        bookingId: booking.id,
        source: booking.source,
      }

      // Mark overdue bills
      if (new Date() > dueDate && bill.status === "pending") {
        bill.status = "overdue"
      }

      allUserBills.push(bill)
    }
  })

  // Generated bills count available

  if (allUserBills.length === 0) {
    userBillsTable.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4">
            <div class="no-data">
              <i class="fas fa-file-invoice"></i>
              <h5>No bills found</h5>
              <p class="text-muted">No billing data available.</p>
            </div>
          </td>
        </tr>
      `
    updateBillingStats(allUserBills)
    return
  }

  // Sort bills by due date (overdue first)
  allUserBills.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1
    if (b.status === "overdue" && a.status !== "overdue") return 1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })

  allUserBills.forEach((bill, index) => {
    let statusClass = "success"
    let statusText = "Paid"

    if (bill.status === "pending") {
      statusClass = "warning"
      statusText = "Pending"
    } else if (bill.status === "overdue") {
      statusClass = "danger"
      statusText = "Overdue"
    }

    const row = document.createElement("tr")
    row.innerHTML = `
        <td>${index + 1}</td>
        <td>${bill.userName}</td>
        <td>${bill.userEmail}</td>
        <td>${bill.hotel}</td>
        <td>${bill.roomNo}</td>
        <td>$${bill.amount.toFixed(2)}</td>
        <td>
          <span class="badge bg-${statusClass}">${statusText}</span>
        </td>
        <td>${formatDate(bill.dueDate)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary view-bill-btn" data-bill='${JSON.stringify(bill)}'>
            <i class="fas fa-eye"></i>
          </button>
          ${bill.status !== "paid"
        ? `
            <button class="btn btn-sm btn-outline-success mark-paid-btn" data-id="${bill.id}">
              <i class="fas fa-check"></i>
            </button>
          `
        : ""
      }
        </td>
      `
    userBillsTable.appendChild(row)
  })

  updateBillingStats(allUserBills)
}

function updateBillingStats(bills) {
  const totalBills = bills.length
  const paidBills = bills.filter((b) => b.status === "paid").length
  const pendingBills = bills.filter((b) => b.status === "pending").length
  const overdueBills = bills.filter((b) => b.status === "overdue").length

  if (totalBillsEl) totalBillsEl.textContent = totalBills
  if (paidBillsEl) paidBillsEl.textContent = paidBills
  if (pendingBillsEl) pendingBillsEl.textContent = pendingBills
  if (overdueBillsEl) overdueBillsEl.textContent = overdueBills

  // Billing stats updated
}

function viewBillDetails(bill) {
  if (!bill) {
    window.alert("Error", "Bill not found!", "error")
    return
  }

  window.alert({
    title: "Bill Details",
    html: `
        <div class="text-start">
          <p><strong>Bill ID:</strong> #${bill.id}</p>
          <p><strong>User:</strong> ${bill.userName}</p>
          <p><strong>Email:</strong> ${bill.userEmail}</p>
          <p><strong>Hotel:</strong> ${bill.hotel}</p>
          <p><strong>Room:</strong> ${bill.roomNo}</p>
          <p><strong>Amount:</strong> $${bill.amount.toFixed(2)}</p>
          <p><strong>Status:</strong> <span class="badge bg-${bill.status === "paid" ? "success" : bill.status === "overdue" ? "danger" : "warning"}">${bill.status.toUpperCase()}</span></p>
          <p><strong>Due Date:</strong> ${formatDate(bill.dueDate)}</p>
          <p><strong>Created:</strong> ${formatDate(bill.createdAt, true)}</p>
          <p><strong>Source:</strong> ${bill.source.toUpperCase()}</p>
        </div>
      `,
    confirmButtonText: "Close",
    width: "500px",
  })
}

function markBillAsPaid(billId) {
  window
    .alert({
      title: "Mark as Paid?",
      text: "Are you sure you want to mark this bill as paid?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, mark as paid!",
    })
    .then((result) => {
      if (result.isConfirmed) {
        window.alert("Success!", "Bill has been marked as paid.", "success")
        // Reload bills to reflect changes
        loadUserBills()
      }
    })
}


function updateRoomStats(rooms) {
  const totalRooms = rooms.length
  const availableRooms = rooms.filter((r) => r.status === "available").length
  const bookedRooms = rooms.filter((r) => r.status === "booked").length
  const inhouseRooms = rooms.filter((r) => r.status === "inhouse").length

  if (totalRoomsEl) totalRoomsEl.textContent = totalRooms
  if (availableRoomsEl) availableRoomsEl.textContent = availableRooms
  if (bookedRoomsEl) bookedRoomsEl.textContent = bookedRooms
  if (inhouseRoomsEl) inhouseRoomsEl.textContent = inhouseRooms

  // Room stats updated
}

function showRoomDetails(roomNo, hotelName = "") {
  const normalizedRoom = normalizeRoomNo(roomNo)
  if (!normalizedRoom) {
    window.alert("Info", "No booking data found for this room.", "info")
    return
  }

  const canonicalRoom = canonicalRoomId(normalizedRoom)
  const canonicalHotel = canonicalHotelName(hotelName)

  const matchRecord = (collection) => {
    return collection.find((record) => {
      const recordRoom = canonicalRoomId(record?.roomNo)
      if (!recordRoom || recordRoom !== canonicalRoom) return false
      if (!canonicalHotel) return true
      const recordHotel = canonicalHotelName(getRecordHotelName(record))
      return !recordHotel || recordHotel === canonicalHotel
    })
  }

  const inhouseMatch = matchRecord(allInHouse)
  const bookingMatch = matchRecord(allBookings)
  const bookingData = inhouseMatch || bookingMatch

  if (!bookingData) {
    window.alert("Info", "No booking data found for this room.", "info")
    return
  }

  const isInHouse = Boolean(inhouseMatch)
  const status = isInHouse ? "InHouse" : "Booked"
  const statusClass = isInHouse ? "success" : "primary"
  const resolvedHotelName = getRecordHotelName(bookingData) || hotelName || "N/A"
  const resolvedRoomLabel = bookingData.roomNo || normalizedRoom

  // Show modal with detailed booking information
  const modal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById("roomDetailsModal"))
  const modalContent = document.getElementById("roomDetailsContent")

  document.getElementById("roomDetailsModalLabel").textContent = `Room ${resolvedRoomLabel} - ${status} Details`

  modalContent.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <h6 class="text-primary mb-3"><i class="fas fa-hotel me-2"></i>Room Information</h6>
          <div class="mb-3">
            <strong>Room Number:</strong> ${resolvedRoomLabel || "N/A"}
          </div>
          <div class="mb-3">
            <strong>Hotel:</strong> ${resolvedHotelName}
          </div>
          <div class="mb-3">
            <strong>Status:</strong> 
            <span class="badge bg-${statusClass} ms-2">${status}</span>
          </div>
          <div class="mb-3">
            <strong>Total Guests:</strong> ${bookingData.totalPeople || "N/A"}
          </div>
          <div class="mb-3">
            <strong>Price:</strong> ${bookingData.price || "N/A"}
          </div>
        </div>
        <div class="col-md-6">
          <h6 class="text-success mb-3"><i class="fas fa-user me-2"></i>Guest Information</h6>
          <div class="mb-3">
            <strong>Guest Name:</strong> ${bookingData.fullname || "N/A"}
          </div>
          <div class="mb-3">
            <strong>Email:</strong> ${bookingData.email || bookingData.createdBy || "N/A"}
          </div>
          <div class="mb-3">
            <strong>Mobile:</strong> ${bookingData.mobile || "N/A"}
          </div>
          <div class="mb-3">
            <strong>Check-In Date:</strong> ${formatDate(bookingData.checkInDate)}
          </div>
          <div class="mb-3">
            <strong>Check-Out Date:</strong> ${formatDate(bookingData.checkOutDate)}
          </div>
        </div>
      </div>
      <hr>
      <div class="row">
        <div class="col-12">
          <h6 class="text-info mb-3"><i class="fas fa-info-circle me-2"></i>Additional Details</h6>
          <div class="row">
            <div class="col-md-6">
              <div class="mb-2">
                <strong>Booking ID:</strong> ${bookingData.id || "N/A"}
              </div>
              <div class="mb-2">
                <strong>Created At:</strong> ${formatDate(bookingData.createdAt, true)}
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-2">
                <strong>Created By:</strong> ${bookingData.createdBy || "N/A"}
              </div>
              <div class="mb-2">
                <strong>Data Source:</strong> ${isInHouse ? "InHouse Records" : "Booking Records"}
              </div>
            </div>
          </div>
        </div>
      </div>
    `

  modal.show()

  // Showing room details
}
// user-input statistics removed

function deleteUserAndAllData(userId, userEmail, userName, userRole = 'user', triggerBtn) {
  const sessionAdmin = window.currentAdminSession || {}
  const isSuperAdminSession = !!sessionAdmin.isSuperAdmin
  const emailLower = (userEmail || '').toLowerCase()
  const button = triggerBtn instanceof Element ? triggerBtn : null
  const originalHtml = button ? button.innerHTML : null

  const resetButton = () => {
    if (button) {
      button.disabled = false
      button.innerHTML = originalHtml
    }
  }

  let storedUsers = []
  try {
    storedUsers = JSON.parse(localStorage.getItem('allUserInfo') || '[]') || []
  } catch {}

  const targetRecord = storedUsers.find(
    (entry) =>
      (entry?.email || '').toLowerCase() === emailLower ||
      entry?.id === userId ||
      entry?._id === userId,
  )

  const resolvedRole = ((targetRecord?.role) || userRole || 'user').toString().toLowerCase()
  const isSuperAdminTarget = emailLower === SUPER_ADMIN_EMAIL || !!targetRecord?.isSuperAdmin

  if (isSuperAdminTarget) {
    if (window.Swal) Swal.fire('Restricted', 'The super admin account cannot be deleted.', 'warning')
    return
  }

  if (resolvedRole === 'admin' && !isSuperAdminSession) {
    if (window.Swal) Swal.fire('Restricted', 'Only the super admin can delete admin accounts.', 'warning')
    return
  }

  if (resolvedRole === 'admin' && isSuperAdminSession) {
    const otherAdmins = storedUsers.filter(
      (entry) =>
        (entry?.role || 'user').toLowerCase() === 'admin' &&
        (entry?.email || '').toLowerCase() !== emailLower,
    )
    if (otherAdmins.length === 0) {
      if (window.Swal) Swal.fire('Restricted', 'Cannot delete the only remaining admin account.', 'warning')
      return
    }
  }

  const displayName = userName || targetRecord?.fullname || userEmail || 'this user'
  const displayNameLower = (displayName || '').toLowerCase()

  const applyLocalDeletion = () => {
    let users = storedUsers.slice()
    users = users.filter((user) => {
      const userEmailLower = (user?.email || '').toLowerCase()
      if (user.id && user.id === userId) return false
      if (user._id && user._id === userId) return false
      return userEmailLower !== emailLower
    })
    storedUsers = users
    allUsers = Array.isArray(users) ? users : []
    localStorage.setItem('allUserInfo', JSON.stringify(users))

    const filterCollection = (collection) => {
      if (!Array.isArray(collection)) return []
      return collection.filter((booking) => {
        const createdByLower = (booking?.createdBy || '').toLowerCase()
        const emailMatchLower = (booking?.email || '').toLowerCase()
        const nameLower = (booking?.fullname || '').toLowerCase()
        const nameMatches = displayNameLower && nameLower.includes(displayNameLower)
        return createdByLower !== emailLower && emailMatchLower !== emailLower && !nameMatches
      })
    }

    allBookings = filterCollection(allBookings)
    allInHouse = filterCollection(allInHouse)
    allArchived = filterCollection(allArchived)

    localStorage.setItem('allBookings', JSON.stringify(allBookings))
    localStorage.setItem('allInHouse', JSON.stringify(allInHouse))
    localStorage.setItem('allArchived', JSON.stringify(allArchived))

    let userBills = []
    try {
      userBills = JSON.parse(localStorage.getItem('userBills') || '[]') || []
    } catch {}
    userBills = userBills.filter((bill) => {
      const billEmailLower = (bill?.userEmail || bill?.email || '').toLowerCase()
      const billNameLower = (bill?.userName || '').toLowerCase()
      const nameMatches = displayNameLower && billNameLower.includes(displayNameLower)
      return billEmailLower !== emailLower && !nameMatches
    })
    localStorage.setItem('userBills', JSON.stringify(userBills))

    const currentUserRaw = sessionStorage.getItem('__au__')
    if (currentUserRaw) {
      try {
        const currentUser = JSON.parse(currentUserRaw)
        if ((currentUser?.email || '').toLowerCase() === emailLower) {
          sessionStorage.removeItem('__au__')
        }
      } catch {}
    }

    try {
      persistAdminData()
    } catch (err) {
      console.warn('Unable to persist admin snapshot after deletion', err)
    }
  }

  window.Swal.fire({
    title: 'Delete User Account?',
    html: `
        <div class="text-start">
          <p><strong>User:</strong> ${escapeHtml(displayName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(userEmail || '')}</p>
          <br>
          <p class="text-danger"><strong>⚠️ WARNING:</strong></p>
          <p class="text-danger">This will permanently delete:</p>
          <ul class="text-danger text-start">
            <li>User account and profile</li>
            <li>All booking records</li>
            <li>All in-house records</li>
            <li>All archived records</li>
            <li>All billing records</li>
          </ul>
          <p class="text-danger"><strong>This action cannot be undone!</strong></p>
        </div>
      `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete everything!',
    cancelButtonText: 'Cancel',
    width: '600px',
  }).then(async (result) => {
    if (!result.isConfirmed) {
      resetButton()
      return
    }

    if (button) {
      button.disabled = true
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Deleting'
    }

    let spinnerOpened = false
    if (window.Swal) {
      spinnerOpened = true
      Swal.fire({
        title: 'Deleting user…',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      })
    }

    const closeSpinner = () => {
      if (spinnerOpened && window.Swal) {
        Swal.close()
        spinnerOpened = false
      }
    }

    try {
      if (client && userId) {
        await client.delete(`/users/${userId}`, { auth: true, redirectOnAuthError: false })
        applyLocalDeletion()
        try {
          await refreshAdminDataFromServer({ silent: true })
        } catch (err) {
          console.warn('Failed to refresh admin data after deletion', err)
        }
      } else {
        applyLocalDeletion()
      }

      loadUserAccounts()
      closeSpinner()
      if (window.Swal) {
        Swal.fire({
          title: 'Deleted!',
          text: `User ${displayName} and all associated data have been permanently deleted.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false,
        })
      }
    } catch (err) {
      console.error('Delete user failed', err)
      closeSpinner()
      if (window.Swal) {
        Swal.fire('Error', err?.message || 'Failed to delete user.', 'error')
      } else {
        alert(err?.message || 'Failed to delete user.')
      }
    } finally {
      resetButton()
    }
  })
}

// user-input functions removed

// user-input edit function and link removed

// Declare Swal and bootstrap variables
const Swal = window.Swal
const bootstrap = window.bootstrap

// Back to Users button functionality
const backToUsersBtnElement = document.getElementById("backToUsersBtn")
if (backToUsersBtnElement) {
  backToUsersBtnElement.addEventListener("click", () => {
    // Hide user bookings card
    const userBookingsCard = document.getElementById("userBookingsCard")
    if (userBookingsCard) {
      userBookingsCard.classList.add("d-none")
    }

    // Show main dashboard section
    const dashboardSection = document.getElementById("dashboardSection")
    if (dashboardSection) {
      dashboardSection.classList.remove("d-none")
    }

    // Reload user accounts data
    loadUserAccounts()
  })
}

// Make functions globally available
window.deleteUserAndAllData = deleteUserAndAllData
window.refreshAdminDataFromServer = refreshAdminDataFromServer

  // user-input related functionality removed

// Function to update user statistics
function updateUserStats(totalUsers, totalBookings, totalRevenue) {
  const totalUsersEl = document.getElementById("totalUsers")
  const activeBookingsEl = document.getElementById("activeBookings")
  const totalRevenueEl = document.getElementById("totalRevenue")

  if (totalUsersEl) {
    totalUsersEl.textContent = totalUsers
  }
  if (activeBookingsEl) {
    activeBookingsEl.textContent = totalBookings
  }
  if (totalRevenueEl) {
    totalRevenueEl.textContent = formatUSD(totalRevenue)
  }
}

// --- Extracted inline scripts from admin.html ---

// Language selector persistence (was inline in admin.html)
(function () {
  try {
    const sel = document.getElementById('langSelect')
    if (!sel) return
    const stored = localStorage.getItem('siteLang')
    if (stored) sel.value = stored
    sel.addEventListener('change', (e) => {
      localStorage.setItem('siteLang', e.target.value)
      // preference persisted; no separate admin myanmar page currently
    })
  } catch (err) {
    console.error('langSelect init error', err)
  }
})();

// Room catalog management powered by backend APIs
(function () {
  if (!window.apiClient) {
    console.error('apiClient unavailable – admin catalog requires js/apiClient.js');
    return;
  }

  const client = window.apiClient;

  const els = {
    catalogTableBody: document.getElementById('roomCatalogTbody'),
    allRoomsTableBody: document.getElementById('roomCatalogAllTbody'),
    hotelRoomsContainer: document.getElementById('hotelRoomsContainer'),
    hotelRoomsTitle: document.getElementById('hotelRoomsTitle'),
    hotelRoomsTbody: document.getElementById('hotelRoomsTbody'),
    hotelAddRoomBtn: document.getElementById('hotelAddRoomBtn'),
    adminHotelFilter: document.getElementById('adminHotelFilter'),
    modalElement: document.getElementById('roomCatalogModal'),
    modalHotelSelect: document.getElementById('catalogHotelSelect'),
    modalHotelNew: document.getElementById('catalogHotelNew'),
    modalRoomNo: document.getElementById('catalogRoomNo'),
    modalPrice: document.getElementById('catalogPrice'),
    modalEditIndex: document.getElementById('catalogEditIndex'),
    catalogSaveBtn: document.getElementById('catalogSaveBtn'),
    addCatalogBtn: document.getElementById('addCatalogBtn'),
    inlineForm: document.getElementById('inlineCatalogForm'),
    inlineHotelSelect: document.getElementById('inlineHotelSelect'),
    inlineHotelNew: document.getElementById('inlineHotelNew'),
    inlineRoomNo: document.getElementById('inlineRoomNo'),
    inlinePrice: document.getElementById('inlinePrice'),
    inlineRoomType: document.getElementById('inlineRoomType'),
    inlineRoomClass: document.getElementById('inlineRoomClass'),
    editModalElement: document.getElementById('editRoomModal'),
    editRoomForm: document.getElementById('editRoomForm'),
    editRoomHotel: document.getElementById('editRoomHotel'),
    editRoomNo: document.getElementById('editRoomNo'),
    editRoomType: document.getElementById('editRoomType'),
    editRoomClass: document.getElementById('editRoomClass'),
    editRoomPrice: document.getElementById('editRoomPrice'),
    editRoomStatus: document.getElementById('editRoomStatus'),
    saveEditRoomBtn: document.getElementById('saveEditRoomBtn'),
  };

  const state = {
    hotels: [],
    rooms: [],
    catalog: [],
    editingRoom: null,
  };

  let modalInstance = null;
  if (els.modalElement && window.bootstrap) {
    modalInstance = bootstrap.Modal.getOrCreateInstance(els.modalElement);
  }

  let editModalInstance = null;
  if (els.editModalElement && window.bootstrap) {
    editModalInstance = bootstrap.Modal.getOrCreateInstance(els.editModalElement);
  }

  function slugify(value) {
    return (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
  }

  function entryNameSort(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
  }

  function setSelectValue(selectEl, value, fallbackLabel) {
    if (!selectEl) return;
    const normalized = value == null ? '' : String(value);
    if (!normalized) {
      selectEl.value = '';
      return;
    }
    const options = Array.from(selectEl.options || []);
    if (!options.some((opt) => opt.value === normalized)) {
      const option = document.createElement('option');
      option.value = normalized;
      option.textContent = fallbackLabel || normalized.charAt(0).toUpperCase() + normalized.slice(1);
      selectEl.appendChild(option);
    }
    selectEl.value = normalized;
  }

  function findCatalogRoom(canonicalHotel, canonicalRoom) {
    if (!canonicalRoom) return null;
    for (const entry of state.catalog) {
      if (canonicalHotel && canonicalHotelName(entry.hotel) !== canonicalHotel) continue;
      const match = entry.rooms.find((room) => canonicalRoomId(room.roomNo) === canonicalRoom);
      if (match) return match;
    }
    return null;
  }

  function buildCatalog(hotels, rooms) {
    const map = new Map();
    hotels.forEach((hotel) => {
      if (!hotel?.name) return;
      map.set(hotel.name, {
        hotel: hotel.name,
        hotelId: hotel._id || hotel.id || null,
        rooms: [],
      });
    });

    rooms.forEach((room) => {
      const hotelName = room?.hotelName || 'Unassigned Hotel';
      if (!map.has(hotelName)) {
        map.set(hotelName, { hotel: hotelName, hotelId: null, rooms: [] });
      }
      const entry = map.get(hotelName);
      entry.rooms.push({
        id: room?._id || room?.id || null,
        roomNo: room?.roomNo ?? '',
        price: Number(room?.pricePerNight ?? room?.price ?? 0) || 0,
        pricePerNight: Number(room?.pricePerNight ?? 0) || 0,
        roomType: room?.type || '',
        roomClass: room?.roomClass || '',
        status: room?.status || 'active',
        active: (room?.status || 'active') === 'active',
        capacity: room?.capacity ?? null,
      });
    });

    const catalog = Array.from(map.values());
    catalog.forEach((entry) => {
      entry.rooms.sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true }));
    });
    catalog.sort((a, b) => entryNameSort(a.hotel, b.hotel));
    return catalog;
  }

  function getCatalog() {
    // Prefer in-memory API data; fallback to locally stored catalog when empty
    if (Array.isArray(state.catalog) && state.catalog.length > 0) {
      return state.catalog.slice();
    }
    try {
      const raw = localStorage.getItem('roomCatalog');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) return arr;
    } catch (e) {
      console.warn('getCatalog local fallback failed', e);
    }
    return [];
  }

  window.getCatalog = getCatalog;
  window.setCatalog = function setCatalog(arr) {
    // Persist locally so legacy flows and offline/admin demos continue to work
    try {
      const safe = Array.isArray(arr) ? arr : [];
      localStorage.setItem('roomCatalog', JSON.stringify(safe));
      // Also reflect into state so current session UI updates
      state.catalog = safe;
      try { populateHotelSelects(); } catch {}
      try { renderCatalogTables(); } catch {}
      try { window.dispatchEvent(new CustomEvent('roomCatalogUpdated', { detail: safe })); } catch {}
      try { if (typeof loadRoomStatus === 'function') loadRoomStatus(); } catch {}
    } catch (e) {
      console.warn('setCatalog local persistence failed', e);
    }
  };

  function notify(kind, message) {
    if (window.Swal) {
      const icon = kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info';
      window.Swal.fire({
        icon,
        title: icon === 'error' ? 'Error' : 'Success',
        text: message,
        timer: icon === 'success' ? 1800 : undefined,
        showConfirmButton: icon !== 'success',
      });
    } else {
      alert(message);
    }
  }

  function renderHotelCatalogTable() {
    const tbody = els.catalogTableBody;
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!state.catalog.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4" class="text-center text-muted">No hotels configured yet. Use the form below to add one.</td>';
      tbody.appendChild(tr);
      if (els.hotelRoomsContainer) els.hotelRoomsContainer.classList.add('d-none');
      return;
    }

    state.catalog.forEach((entry, index) => {
      const tr = document.createElement('tr');
      const totalRooms = entry.rooms.length;
      const deleteDisabled = !entry.hotelId;
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><button class="btn btn-link p-0 catalog-view-rooms" data-action="view" data-hotel="${escapeHtml(entry.hotel)}">${escapeHtml(entry.hotel)}</button></td>
        <td>${totalRooms} room${totalRooms === 1 ? '' : 's'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-2 catalog-view-rooms" data-action="view" data-hotel="${escapeHtml(entry.hotel)}">View</button>
          <button class="btn btn-sm btn-danger catalog-delete-hotel" data-action="delete-hotel" data-hotel="${escapeHtml(entry.hotel)}" data-hotel-id="${entry.hotelId || ''}" ${deleteDisabled ? 'disabled' : ''}>Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderAllRoomsTable() {
    const tbody = els.allRoomsTableBody;
    if (!tbody) return;

    tbody.innerHTML = '';
    let counter = 0;

    state.catalog.forEach((entry) => {
      entry.rooms.forEach((room) => {
        counter += 1;
        const tr = document.createElement('tr');
        const normalizedStatus = typeof room.status === 'string' ? room.status.trim().toLowerCase() : 'active';
        let badgeClass = 'bg-success';
        let badgeLabel = 'Active';
        if (normalizedStatus !== 'active') {
          badgeClass = 'bg-secondary';
          badgeLabel = 'Temporarily Unavailable';
        }
        const badge = `<span class="badge ${badgeClass} ms-2">${badgeLabel}</span>`;
        const roomIdAttr = escapeHtml(String(room.id || ''));
        tr.innerHTML = `
          <td>${counter}</td>
          <td>${escapeHtml(entry.hotel)}</td>
          <td>${escapeHtml(room.roomNo)}</td>
          <td>${escapeHtml(room.roomType ? room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1) : '')}</td>
          <td>${escapeHtml(room.roomClass ? room.roomClass.charAt(0).toUpperCase() + room.roomClass.slice(1) : '')}</td>
          <td>${formatUSD(room.price)}${badge}</td>
          <td>
            <button class="btn btn-sm btn-outline-secondary me-2" data-action="edit-room" data-room-id="${roomIdAttr}" data-room-no="${escapeHtml(room.roomNo)}" data-hotel="${escapeHtml(entry.hotel)}" ${room.id ? '' : 'disabled'}>Edit</button>
            <button class="btn btn-sm btn-danger catalog-delete-room" data-action="delete-room" data-room-id="${roomIdAttr}" data-room-no="${escapeHtml(room.roomNo)}" data-hotel="${escapeHtml(entry.hotel)}" ${room.id ? '' : 'disabled'}>Delete</button>
          </td>`;
        tbody.appendChild(tr);
      });
    });

    if (counter === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="text-center text-muted">No rooms found. Add one using the form below.</td>';
      tbody.appendChild(tr);
    }
  }

  function renderCatalogTables() {
    renderHotelCatalogTable();
    renderAllRoomsTable();
  }

  async function refreshCatalog({ silent } = {}) {
    try {
      const [hotelsRes, roomsRes] = await Promise.all([
        client.get('/hotels'),
        client.get('/rooms'),
      ]);
      state.hotels = Array.isArray(hotelsRes?.hotels) ? hotelsRes.hotels : [];
      state.rooms = Array.isArray(roomsRes?.rooms) ? roomsRes.rooms : [];
      state.catalog = buildCatalog(state.hotels, state.rooms);
      renderCatalogTables();
      populateHotelSelects();
      window.dispatchEvent(new CustomEvent('roomCatalogUpdated', { detail: state.catalog }));
      if (!state.catalog.length) seedCatalogIfEmpty();
      try {
        if (typeof loadRoomStatus === 'function') loadRoomStatus();
      } catch (err) {
        console.warn('loadRoomStatus refresh failed', err);
      }
    } catch (err) {
      console.error('refreshCatalog error', err);
      if (!silent) notify('error', err?.message || 'Unable to load hotel and room data. Using local data if available.');
      // Fallback: load from localStorage so UI still shows previous/seeded data
      try {
        const raw = localStorage.getItem('roomCatalog');
        const arr = raw ? JSON.parse(raw) : [];
        state.catalog = Array.isArray(arr) ? arr : [];
        renderCatalogTables();
        populateHotelSelects();
        window.dispatchEvent(new CustomEvent('roomCatalogUpdated', { detail: state.catalog }));
        if (!state.catalog.length) seedCatalogIfEmpty();
        try { if (typeof loadRoomStatus === 'function') loadRoomStatus(); } catch {}
      } catch (e) {
        console.warn('Local catalog fallback failed', e);
      }
    }
  }

  function populateHotelSelects() {
    const catalog = state.catalog;
    const hotelNames = catalog.map((entry) => entry.hotel).sort(entryNameSort);

    if (els.adminHotelFilter) {
      const previous = els.adminHotelFilter.value || 'All Hotels';
      els.adminHotelFilter.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = 'All Hotels';
      optAll.textContent = 'All Hotels';
      els.adminHotelFilter.appendChild(optAll);
      hotelNames.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        els.adminHotelFilter.appendChild(option);
      });
      if ([...els.adminHotelFilter.options].some((opt) => opt.value === previous)) {
        els.adminHotelFilter.value = previous;
      }
    }

    if (els.inlineHotelSelect) {
      const previous = els.inlineHotelSelect.value || '';
      els.inlineHotelSelect.innerHTML = '<option value="">Select existing hotel (or choose New below)</option><option value="__new__">-- Add New Hotel --</option>';
      hotelNames.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        els.inlineHotelSelect.appendChild(option);
      });
      if ([...els.inlineHotelSelect.options].some((opt) => opt.value === previous)) {
        els.inlineHotelSelect.value = previous;
      }
    }

    if (els.modalHotelSelect) {
      const previous = els.modalHotelSelect.value || '';
      els.modalHotelSelect.innerHTML = '<option value="">Select an existing hotel</option><option value="__new__">-- Add New Hotel --</option>';
      hotelNames.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        els.modalHotelSelect.appendChild(option);
      });
      if ([...els.modalHotelSelect.options].some((opt) => opt.value === previous)) {
        els.modalHotelSelect.value = previous;
      }
      if (els.modalHotelSelect.onchange == null) {
        els.modalHotelSelect.onchange = (event) => {
          if (!els.modalHotelNew) return;
          if (event.target.value === '__new__') {
            els.modalHotelNew.style.display = 'block';
          } else {
            els.modalHotelNew.style.display = 'none';
            els.modalHotelNew.value = '';
          }
        };
      }
    }
  }

  async function ensureHotelExists(hotelName) {
    const existing = state.catalog.find((entry) => entry.hotel.toLowerCase() === hotelName.toLowerCase());
    if (existing && existing.hotelId) {
      return { id: existing.hotelId, name: existing.hotel };
    }

    let slugBase = slugify(hotelName);
    if (!slugBase) slugBase = `hotel-${Date.now()}`;
    let slugCandidate = slugBase;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await client.post('/hotels', {
          name: hotelName,
          slug: slugCandidate,
          description: '',
          address: '',
          images: [],
        });
        notify('success', `Hotel "${hotelName}" created.`);
        return response?.hotel || null;
      } catch (err) {
        if (err?.status === 409) {
          slugCandidate = `${slugBase}-${attempt + 1}`;
          continue;
        }
        throw err;
      }
    }

    throw new Error('Unable to create hotel. Try a different name.');
  }

  async function submitRoom({ hotelName, roomNo, price, roomType, roomClass }) {
    if (!state.catalog.some((entry) => entry.hotel.toLowerCase() === hotelName.toLowerCase())) {
      await ensureHotelExists(hotelName);
    }

    await client.post('/rooms', {
      hotelName,
      roomNo,
      type: roomType,
      roomClass,
      pricePerNight: price,
      status: 'active',
    });
  }

  async function handleInlineSubmit(event) {
    event.preventDefault();
    try {
      client.ensureAuthenticated({ redirect: 'Login.html' });
    } catch (err) {
      console.warn('Authentication required for catalog edits', err);
      return;
    }

    const selectValue = els.inlineHotelSelect ? els.inlineHotelSelect.value : '';
    const newHotelName = els.inlineHotelNew ? els.inlineHotelNew.value.trim() : '';
    let hotelName = '';

    if (selectValue && selectValue !== '__new__') {
      hotelName = selectValue;
    } else if (selectValue === '__new__') {
      hotelName = newHotelName;
    }

    const roomNoRaw = els.inlineRoomNo ? els.inlineRoomNo.value.trim() : '';
    const priceRaw = els.inlinePrice ? els.inlinePrice.value : '';
    const roomType = els.inlineRoomType ? els.inlineRoomType.value : 'single';
    const roomClass = els.inlineRoomClass ? els.inlineRoomClass.value : 'luxury';
    const price = Number(priceRaw);
    const normalizedRoomNo = normalizeRoomNo(roomNoRaw);

    if (!hotelName || !normalizedRoomNo || Number.isNaN(price) || price <= 0) {
      notify('error', 'Please provide hotel, room number, and price.');
      return;
    }

    try {
  await submitRoom({ hotelName, roomNo: normalizedRoomNo, price, roomType, roomClass });
  notify('success', `Room ${normalizedRoomNo} added to ${hotelName}.`);
      if (els.inlineHotelSelect) els.inlineHotelSelect.value = '';
      if (els.inlineHotelNew) { els.inlineHotelNew.value = ''; els.inlineHotelNew.style.display = 'none'; }
      if (els.inlineRoomNo) els.inlineRoomNo.value = '';
      if (els.inlinePrice) els.inlinePrice.value = '';
      if (els.inlineRoomType) els.inlineRoomType.value = 'single';
      if (els.inlineRoomClass) els.inlineRoomClass.value = 'luxury';

      await refreshCatalog({ silent: true });
    } catch (err) {
      console.error('handleInlineSubmit error', err);
      const message = err?.data?.message || err?.message || 'Unable to add room.';
      notify('error', message);
    }
  }

  async function handleModalSave() {
    try {
      client.ensureAuthenticated({ redirect: 'Login.html' });
    } catch (err) {
      console.warn('Authentication required for catalog edits', err);
      return;
    }

    const selectValue = els.modalHotelSelect ? els.modalHotelSelect.value : '';
    const newHotelName = els.modalHotelNew ? els.modalHotelNew.value.trim() : '';
    let hotelName = '';

    if (selectValue && selectValue !== '__new__') {
      hotelName = selectValue;
    } else if (selectValue === '__new__') {
      hotelName = newHotelName;
    }

    const roomNoRaw = els.modalRoomNo ? els.modalRoomNo.value.trim() : '';
    const priceRaw = els.modalPrice ? els.modalPrice.value : '';
    const price = Number(priceRaw);
    const roomType = els.inlineRoomType ? els.inlineRoomType.value : 'single';
    const roomClass = els.inlineRoomClass ? els.inlineRoomClass.value : 'luxury';

    const normalizedRoomNo = normalizeRoomNo(roomNoRaw);

    if (!hotelName || !normalizedRoomNo || Number.isNaN(price) || price <= 0) {
      notify('error', 'Please provide hotel, room number, and price.');
      return;
    }

    try {
      await submitRoom({ hotelName, roomNo: normalizedRoomNo, price, roomType, roomClass });
      notify('success', `Room ${normalizedRoomNo} added to ${hotelName}.`);
      if (modalInstance) modalInstance.hide();
      await refreshCatalog({ silent: true });
    } catch (err) {
      console.error('handleModalSave error', err);
      const message = err?.data?.message || err?.message || 'Unable to add room.';
      notify('error', message);
    }
  }

  async function deleteHotel(hotelId, hotelName) {
    if (!hotelId) {
      notify('error', 'This hotel cannot be deleted because it was not created via the new API.');
      return;
    }
    if (!confirm(`Delete ${hotelName} and all associated rooms?`)) return;
    try {
      await client.delete(`/hotels/${hotelId}`);
      notify('success', `${hotelName} removed.`);
      await refreshCatalog({ silent: true });
    } catch (err) {
      console.error('deleteHotel error', err);
      const message = err?.data?.message || err?.message || 'Unable to delete hotel.';
      notify('error', message);
    }
  }

  async function deleteRoom(roomId, hotelName, roomNo) {
    if (!roomId) {
      notify('error', 'This room cannot be deleted because it was not created via the new API.');
      return;
    }
    if (window.Swal) {
      const { isConfirmed } = await window.Swal.fire({
        title: `Delete room ${roomNo}?`,
        text: `Remove this room from ${hotelName}? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        focusCancel: true,
      });
      if (!isConfirmed) return;
    } else if (!confirm(`Delete room ${roomNo} from ${hotelName}?`)) {
      return;
    }
    try {
      await client.delete(`/rooms/${roomId}`);
      notify('success', `Room ${roomNo} deleted.`);
      await refreshCatalog({ silent: true });
    } catch (err) {
      console.error('deleteRoom error', err);
      const message = err?.data?.message || err?.message || 'Unable to delete room.';
      notify('error', message);
    }
  }

  function showHotelRooms(hotelName) {
    if (!els.hotelRoomsContainer || !els.hotelRoomsTbody) return;
    const entry = state.catalog.find((item) => item.hotel === hotelName);
    els.hotelRoomsTbody.innerHTML = '';
    if (!entry || !entry.rooms.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" class="text-center text-muted">No rooms found. Add one using the form below.</td>';
      els.hotelRoomsTbody.appendChild(tr);
    } else {
      entry.rooms.forEach((room) => {
        const tr = document.createElement('tr');
        const roomIdAttr = escapeHtml(String(room.id || ''));
        const normalizedStatus = typeof room.status === 'string' ? room.status.trim().toLowerCase() : 'active';
        const statusBadge = normalizedStatus === 'active'
          ? '<span class="badge bg-success ms-2">Active</span>'
          : '<span class="badge bg-secondary ms-2">Temporarily Unavailable</span>';
        tr.innerHTML = `
          <td>${escapeHtml(room.roomNo)}</td>
          <td>${formatUSD(room.price)} ${statusBadge}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-secondary" data-action="edit-room" data-room-id="${roomIdAttr}" data-room-no="${escapeHtml(room.roomNo)}" data-hotel="${escapeHtml(entry.hotel)}" ${room.id ? '' : 'disabled'}>Edit</button>
              <button class="btn btn-danger" data-action="delete-room" data-room-id="${roomIdAttr}" data-room-no="${escapeHtml(room.roomNo)}" data-hotel="${escapeHtml(entry.hotel)}" ${room.id ? '' : 'disabled'}>Delete</button>
            </div>
          </td>`;
        els.hotelRoomsTbody.appendChild(tr);
      });
    }
    if (els.hotelRoomsTitle) els.hotelRoomsTitle.textContent = `${hotelName} — Rooms`;
    els.hotelRoomsContainer.classList.remove('d-none');
    if (els.hotelAddRoomBtn) els.hotelAddRoomBtn.setAttribute('data-hotel', hotelName);
  }

  function openEditRoomModal(hotelName, room) {
    if (!room || !room.id) {
      notify('error', 'This room cannot be edited because it does not have a valid identifier.');
      return;
    }
    state.editingRoom = {
      id: room.id,
      hotelName,
      status: room.status || 'active',
    };

    if (els.editRoomForm) {
      els.editRoomForm.reset();
    }
    if (els.editRoomHotel) els.editRoomHotel.value = hotelName || '';
    if (els.editRoomNo) els.editRoomNo.value = room.roomNo || '';
    if (els.editRoomPrice) {
      const basePrice = Number(room.pricePerNight ?? room.price ?? 0);
      els.editRoomPrice.value = Number.isFinite(basePrice) && basePrice > 0 ? String(basePrice) : '';
    }
    setSelectValue(els.editRoomType, room.roomType || '', room.roomType);
    setSelectValue(els.editRoomClass, room.roomClass || '', room.roomClass);
  setSelectValue(els.editRoomStatus, state.editingRoom.status || 'active', state.editingRoom.status);

    if (els.editRoomNo) els.editRoomNo.classList.remove('is-invalid');
    toggleEditRoomSaving(false);

    if (editModalInstance) {
      editModalInstance.show();
    } else if (els.editModalElement) {
      els.editModalElement.classList.add('show');
      els.editModalElement.style.display = 'block';
    }
  }

  function resetEditRoomForm() {
    state.editingRoom = null;
    if (els.editRoomForm) {
      els.editRoomForm.reset();
    }
    if (els.editRoomNo) els.editRoomNo.classList.remove('is-invalid');
    if (els.editRoomStatus) {
      els.editRoomStatus.value = 'active';
    }
    toggleEditRoomSaving(false);
  }

  function toggleEditRoomSaving(isSaving) {
    if (!els.saveEditRoomBtn) return;
    if (isSaving) {
      if (!els.saveEditRoomBtn.dataset.originalText) {
        els.saveEditRoomBtn.dataset.originalText = els.saveEditRoomBtn.textContent || 'Save';
      }
      els.saveEditRoomBtn.disabled = true;
      els.saveEditRoomBtn.textContent = 'Saving...';
    } else {
      if (els.saveEditRoomBtn.dataset.originalText) {
        els.saveEditRoomBtn.textContent = els.saveEditRoomBtn.dataset.originalText;
        delete els.saveEditRoomBtn.dataset.originalText;
      }
      els.saveEditRoomBtn.disabled = false;
    }
  }

  function openEditRoomByIdentifiers(hotelName, roomId, roomNo) {
    const canonicalHotel = canonicalHotelName(hotelName);
    const canonicalRoom = canonicalRoomId(roomNo);
    const catalogEntry = state.catalog.find((entry) => (!canonicalHotel || canonicalHotelName(entry.hotel) === canonicalHotel));
    if (!catalogEntry) {
      notify('error', 'Unable to locate that room. Please refresh and try again.');
      return;
    }
    let room = null;
    if (roomId) {
      room = catalogEntry.rooms.find((item) => item.id && String(item.id) === String(roomId));
    }
    if (!room && canonicalRoom) {
      room = catalogEntry.rooms.find((item) => canonicalRoomId(item.roomNo) === canonicalRoom);
    }
    if (!room) {
      notify('error', 'Unable to locate that room. Please refresh and try again.');
      return;
    }
    if (!room.id) {
      notify('error', 'This room cannot be edited because it was not created via the new API.');
      return;
    }
    openEditRoomModal(catalogEntry.hotel, room);
  }

  async function handleEditRoomSave(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (!state.editingRoom || !state.editingRoom.id) {
      notify('error', 'Select a room to edit first.');
      return;
    }

    const hotelName = (els.editRoomHotel?.value || state.editingRoom.hotelName || '').trim();
    const rawRoomNo = els.editRoomNo ? String(els.editRoomNo.value || '') : '';
    const normalizedRoomNo = normalizeRoomNo(rawRoomNo);
    if (els.editRoomNo) els.editRoomNo.value = normalizedRoomNo;
    if (els.editRoomNo) els.editRoomNo.classList.remove('is-invalid');
    const roomType = els.editRoomType ? els.editRoomType.value : '';
    const roomClass = els.editRoomClass ? els.editRoomClass.value : '';
    const priceValue = Number(els.editRoomPrice ? els.editRoomPrice.value : NaN);
    const statusValueRaw = els.editRoomStatus ? els.editRoomStatus.value : state.editingRoom.status;
    const normalizedStatus = (statusValueRaw || 'active').toString().trim().toLowerCase();

    if (!hotelName || !normalizedRoomNo || !Number.isFinite(priceValue) || priceValue < 0) {
      if (els.editRoomNo) els.editRoomNo.classList.add('is-invalid');
      notify('error', 'Please provide a valid hotel, room number, and price.');
      return;
    }

    state.editingRoom.status = normalizedStatus;

    const payload = {
      hotelName,
      roomNo: normalizedRoomNo,
      type: roomType,
      roomClass,
      pricePerNight: priceValue,
      status: normalizedStatus,
    };

    try {
      toggleEditRoomSaving(true);
      await client.put(`/rooms/${state.editingRoom.id}`, payload);
      notify('success', `Room ${normalizedRoomNo} updated successfully.`);
      if (editModalInstance) {
        editModalInstance.hide();
      } else if (els.editModalElement) {
        els.editModalElement.classList.remove('show');
        els.editModalElement.style.display = 'none';
      }
      resetEditRoomForm();
      await refreshCatalog({ silent: true });
    } catch (err) {
      console.error('handleEditRoomSave error', err);
      const message = err?.data?.message || err?.message || 'Unable to update room.';
      notify('error', message);
    } finally {
      toggleEditRoomSaving(false);
    }
  }

  function handleGlobalEditClick(event) {
    const button = event.target.closest('[data-action="edit-room"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const hotelName = button.getAttribute('data-hotel') || '';
    const roomId = button.getAttribute('data-room-id') || '';
    const roomNo = button.getAttribute('data-room-no') || '';
    openEditRoomByIdentifiers(hotelName, roomId, roomNo);
  }

  function handleRoomGridClick(event) {
    const button = event.target.closest('[data-action="edit-room"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const hotelName = button.getAttribute('data-hotel') || '';
    const roomId = button.getAttribute('data-room-id') || '';
    const roomNo = button.getAttribute('data-room-no') || '';
    openEditRoomByIdentifiers(hotelName, roomId, roomNo);
  }

  function handleCatalogClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    const action = actionButton.getAttribute('data-action');
    if (action === 'view') {
      const hotelName = actionButton.getAttribute('data-hotel');
      if (hotelName) showHotelRooms(hotelName);
      return;
    }
    if (action === 'delete-hotel') {
      const hotelId = actionButton.getAttribute('data-hotel-id');
      const hotelName = actionButton.getAttribute('data-hotel');
      deleteHotel(hotelId, hotelName);
      return;
    }
    if (action === 'edit-room') {
      const hotelName = actionButton.getAttribute('data-hotel');
      const roomId = actionButton.getAttribute('data-room-id');
      const roomNo = actionButton.getAttribute('data-room-no');
      openEditRoomByIdentifiers(hotelName, roomId, roomNo);
      return;
    }
    if (action === 'delete-room') {
      const roomId = actionButton.getAttribute('data-room-id');
      const hotelName = actionButton.getAttribute('data-hotel');
      const roomNo = actionButton.getAttribute('data-room-no');
      deleteRoom(roomId, hotelName, roomNo);
    }
  }

  function handleInlineHotelSelectChange(event) {
    if (!els.inlineHotelNew) return;
    if (event.target.value === '__new__') {
      els.inlineHotelNew.style.display = 'block';
    } else {
      els.inlineHotelNew.style.display = 'none';
      els.inlineHotelNew.value = '';
    }
  }

  function bindEvents() {
    if (els.catalogTableBody) {
      els.catalogTableBody.addEventListener('click', handleCatalogClick);
    }
    if (els.allRoomsTableBody) {
      els.allRoomsTableBody.addEventListener('click', handleCatalogClick);
    }
    if (els.hotelRoomsTbody) {
      els.hotelRoomsTbody.addEventListener('click', handleCatalogClick);
    }
    if (els.inlineForm) {
      els.inlineForm.addEventListener('submit', handleInlineSubmit);
    }
    if (els.inlineHotelSelect) {
      els.inlineHotelSelect.addEventListener('change', handleInlineHotelSelectChange);
    }
    if (els.catalogSaveBtn) {
      els.catalogSaveBtn.addEventListener('click', handleModalSave);
    }
    if (els.addCatalogBtn) {
      els.addCatalogBtn.addEventListener('click', () => {
        if (!els.modalHotelSelect) return;
        els.modalEditIndex && (els.modalEditIndex.value = '');
        els.modalHotelSelect.value = '';
        if (els.modalHotelSelect.onchange) {
          els.modalHotelSelect.onchange({ target: els.modalHotelSelect });
        }
        if (els.modalHotelNew) els.modalHotelNew.value = '';
        if (els.modalRoomNo) els.modalRoomNo.value = '';
        if (els.modalPrice) els.modalPrice.value = '';
        if (modalInstance) {
          modalInstance.show();
        }
      });
    }
      if (roomGrid) {
        roomGrid.addEventListener('click', handleRoomGridClick);
      }
    if (els.saveEditRoomBtn) {
      els.saveEditRoomBtn.addEventListener('click', handleEditRoomSave);
    }
    if (els.editRoomForm) {
      els.editRoomForm.addEventListener('submit', handleEditRoomSave);
    }
    if (els.editRoomStatus) {
      els.editRoomStatus.addEventListener('change', (event) => {
        if (!state.editingRoom) return;
        const raw = event.target?.value;
        state.editingRoom.status = (raw || 'active').toString().trim().toLowerCase();
      });
    }
    if (els.editModalElement) {
      els.editModalElement.addEventListener('hidden.bs.modal', resetEditRoomForm);
    }
  }

  function loadLocalCatalog() {
    try {
      const raw = localStorage.getItem('roomCatalog');
      const arr = raw ? JSON.parse(raw) : [];
      state.catalog = Array.isArray(arr) ? arr : [];
      renderCatalogTables();
      populateHotelSelects();
      window.dispatchEvent(new CustomEvent('roomCatalogUpdated', { detail: state.catalog }));
      if (!state.catalog.length) seedCatalogIfEmpty();
    } catch (e) {
      console.warn('loadLocalCatalog failed', e);
    }
  }

  function seedCatalogIfEmpty() {
    try {
      const fallback = (typeof window.STATIC_ROOM_FALLBACK !== 'undefined') ? window.STATIC_ROOM_FALLBACK : STATIC_ROOM_FALLBACK;
      if (!Array.isArray(fallback) || !fallback.length) return;
      const raw = localStorage.getItem('roomCatalog');
      const existing = raw ? JSON.parse(raw) : [];
      if (Array.isArray(existing) && existing.length) return;
      const seeded = fallback.map((entry) => {
        const rooms = [];
        (entry.ranges || []).forEach((range) => {
          for (let i = range.start; i <= range.end; i += 1) {
            rooms.push({
              id: null,
              roomNo: String(i),
              price: Number(range.price) || 0,
              pricePerNight: Number(range.price) || 0,
              roomType: 'single',
              roomClass: 'luxury',
              status: 'active',
              active: true,
            });
          }
        });
        rooms.sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true }));
        return { hotel: entry.hotel, hotelId: null, rooms };
      });
      localStorage.setItem('roomCatalog', JSON.stringify(seeded));
      state.catalog = seeded;
      renderCatalogTables();
      populateHotelSelects();
      try { window.dispatchEvent(new CustomEvent('roomCatalogUpdated', { detail: state.catalog })); } catch {}
      try { if (typeof loadRoomStatus === 'function') loadRoomStatus(); } catch {}
    } catch (err) {
      console.warn('seedCatalogIfEmpty failed', err);
    }
  }

  async function init() {
    let authed = true;
    try {
      client.ensureAuthenticated({ redirect: 'Login.html' });
    } catch (err) {
      authed = false;
      console.warn('Admin catalog: proceeding in local-only mode (not authenticated)', err);
    }

    bindEvents();
    if (authed) {
      populateHotelSelects();
      await refreshCatalog({ silent: true });
    } else {
      loadLocalCatalog();
      seedCatalogIfEmpty();
    }

    if (els.hotelAddRoomBtn) {
      els.hotelAddRoomBtn.addEventListener('click', () => {
        if (!els.modalHotelSelect) return;
        const hotelName = els.hotelAddRoomBtn.getAttribute('data-hotel') || '';
        els.modalEditIndex && (els.modalEditIndex.value = '');
        els.modalHotelSelect.value = hotelName || '';
        if (els.modalHotelSelect.onchange) {
          els.modalHotelSelect.onchange({ target: els.modalHotelSelect });
        }
        if (els.modalHotelNew) els.modalHotelNew.value = '';
        if (els.modalRoomNo) els.modalRoomNo.value = '';
        if (els.modalPrice) els.modalPrice.value = '';
        if (modalInstance) {
          modalInstance.show();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Admin toolbar button handlers (moved from admin.html inline script)
(function () {
  try {
    const showRoomsBtn = document.getElementById('showRoomsBtn')
    const showCatalogBtn = document.getElementById('showCatalogBtn')
    const roomsSection = document.getElementById('roomsSection')
    const catalogCard = document.querySelector('.card.mt-4')

    function showRooms() {
      document.querySelectorAll('.main-content > .card, .main-content > div').forEach(el => el.classList.add('d-none'))
      if (roomsSection) roomsSection.classList.remove('d-none')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function showCatalog() {
      if (!roomsSection) return
      roomsSection.classList.remove('d-none')
      setTimeout(() => {
        if (catalogCard) catalogCard.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    }

    if (showRoomsBtn) showRoomsBtn.addEventListener('click', showRooms)
    if (showCatalogBtn) showCatalogBtn.addEventListener('click', showCatalog)
    // Expose for programmatic use when switching to Rooms
    window.__showRooms = showRooms
    window.__showCatalog = showCatalog
  } catch (err) {
    console.error('Toolbar init error', err)
  }
})();

// Inline add form handlers (quick add without modal)
(function () {
  try {
    const inlineForm = document.getElementById('inlineCatalogForm')
    const inlineSelect = document.getElementById('inlineHotelSelect')
    const inlineNew = document.getElementById('inlineHotelNew')
    const inlineRoomNo = document.getElementById('inlineRoomNo')
    const inlinePrice = document.getElementById('inlinePrice')

    function refreshInlineHotelSelect() {
      if (!inlineSelect) return
      const arr = (typeof getCatalog === 'function') ? getCatalog() : []
      inlineSelect.innerHTML = '<option value="">Select existing hotel (or choose New below)</option>'
      inlineSelect.innerHTML += '<option value="__new__">-- Add New Hotel --</option>'
      arr.forEach(h => {
        const opt = document.createElement('option')
        opt.value = h.hotel
        opt.textContent = h.hotel
        inlineSelect.appendChild(opt)
      })
    }

    if (inlineSelect) {
      inlineSelect.addEventListener('change', (e) => {
        if (!inlineNew) return
        if (e.target.value === '__new__') inlineNew.style.display = 'block'
        else { inlineNew.style.display = 'none'; inlineNew.value = '' }
      })
    }

    if (inlineForm && !inlineForm.dataset.boundInlineHandler) {
      inlineForm.dataset.boundInlineHandler = 'true'
      inlineForm.addEventListener('submit', (ev) => {
        ev.preventDefault()
        try {
          const selVal = inlineSelect ? inlineSelect.value : ''
          const newVal = inlineNew ? inlineNew.value.trim() : ''
          let hotelName = ''
          if (selVal && selVal !== '__new__') hotelName = selVal
          else if (selVal === '__new__') hotelName = newVal
      const roomNoRaw = inlineRoomNo ? inlineRoomNo.value : '';
      const priceRaw = inlinePrice ? inlinePrice.value : '';
      const roomType = document.getElementById('inlineRoomType') ? document.getElementById('inlineRoomType').value : 'single';
      const roomClass = document.getElementById('inlineRoomClass') ? document.getElementById('inlineRoomClass').value : 'luxury';
      const normalizedRoomNo = normalizeRoomNo(roomNoRaw)
      const priceValue = Number(priceRaw)
      if (!hotelName || !normalizedRoomNo || !Number.isFinite(priceValue) || priceValue <= 0 || !roomType || !roomClass) {
        alert('Please provide a valid hotel, room number, and price')
        return
      }
      const arr = (typeof getCatalog === 'function') ? getCatalog() : []
      const hIdx = arr.findIndex(x => x.hotel === hotelName)
      const roomObj = { roomNo: normalizedRoomNo, price: priceValue, roomType, roomClass, active: false }
      if (hIdx === -1) arr.push({ hotel: hotelName, rooms: [roomObj] })
      else arr[hIdx].rooms.push(roomObj)
      if (typeof setCatalog === 'function') setCatalog(arr)
      if (typeof render === 'function') render()
      window.dispatchEvent(new CustomEvent('roomCatalogUpdated'))
      // reset
      if (inlineSelect) inlineSelect.value = ''
      if (inlineNew) { inlineNew.value = ''; inlineNew.style.display = 'none' }
      if (inlineRoomNo) inlineRoomNo.value = ''
      if (inlinePrice) inlinePrice.value = ''
      if (document.getElementById('inlineRoomType')) document.getElementById('inlineRoomType').value = 'single';
      if (document.getElementById('inlineRoomClass')) document.getElementById('inlineRoomClass').value = 'luxury';
        } catch (err) {
          console.error('Error in inline add form', err)
          alert('Unable to add room. See console for details')
        }
      })
    }

    // initialize options on load
    refreshInlineHotelSelect()
    // also refresh when catalogUpdated events fire
    window.addEventListener('roomCatalogUpdated', refreshInlineHotelSelect)
  } catch (err) {
    console.error('Inline add form init error', err)
  }
})();
