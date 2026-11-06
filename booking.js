(function () {
  'use strict';

  if (!window.apiClient) {
    console.error('apiClient unavailable – ensure js/apiClient.js is loaded before booking.js');
    return;
  }

  const client = window.apiClient;
  const SCROLL_STORAGE_KEY = `scroll-pos:${window.location.pathname}`;
  let scrollSaveTimeoutId = null;
  const AUTH_ERROR_REDIRECT = 'Login.html';
  const STATUS_NON_BLOCKING = new Set(['cancelled', 'checked_out', 'completed']);
  const PHONE_PATTERN = /^09\d{9}$/;

  function getFormField(form, name) {
    if (!form) return null;
    if (form.elements && form.elements[name]) return form.elements[name];
    return form.querySelector(`[name="${name}"]`);
  }

  function getFieldErrorElement(form, name) {
    return form ? form.querySelector(`[data-error-for="${name}"]`) : null;
  }

  function setFieldError(form, name, message) {
    const input = getFormField(form, name);
    const errorEl = getFieldErrorElement(form, name);
    const hasMessage = Boolean(message);
    if (input) {
      input.classList.toggle('is-invalid', hasMessage);
      if (typeof input.setCustomValidity === 'function') {
        input.setCustomValidity(hasMessage ? message : '');
      }
    }
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.classList.toggle('is-visible', hasMessage);
    }
  }

  function clearFieldError(form, name) {
    setFieldError(form, name, '');
  }

  function scheduleFieldAutoClear(form, name) {
    const field = getFormField(form, name);
    if (!field) return;
    const handler = () => clearFieldError(form, name);
    field.addEventListener('input', handler);
    field.addEventListener('blur', handler);
  }

  function isBlockingStatus(rawStatus) {
    const normalized = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
    if (!normalized) return true;
    return !STATUS_NON_BLOCKING.has(normalized);
  }

  function normalizePhoneNumber(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function isValidPhoneNumber(value) {
    return PHONE_PATTERN.test(value || '');
  }

  function formatBookingStatusLabel(rawStatus) {
    const normalized = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
    if (!normalized) return 'Booked';
    const labelMap = new Map([
      ['booked', 'Booked'],
      ['confirmed', 'Confirmed'],
      ['checked_in', 'Checked In'],
      ['checked out', 'Checked Out'],
      ['checked_out', 'Checked Out'],
      ['cancelled', 'Cancelled'],
      ['canceled', 'Cancelled'],
      ['pending', 'Pending'],
      ['hold', 'On Hold'],
      ['reserved', 'Reserved'],
    ]);
    if (labelMap.has(normalized)) return labelMap.get(normalized);
    if (isBlockingStatus(normalized)) return 'Booked';
    return normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const ALL_HOTELS_CACHE_KEY = '__ALL__';
  const ROOM_DIRECTORY_TTL_MS = 60_000;

  const state = {
    hotels: [],
    bookings: [],
    myBookings: [],
    visibleBookings: [],
    availabilityCache: new Map(),
    selectedHotel: '',
    searchTerm: '',
    dateRange: getDefaultDateRange(),
    bookingsById: new Map(),
    editingBookingId: null,
    activeNightlyRate: null,
    roomAvailabilityWarning: '',
    activeRoomMeta: { roomType: '', roomClass: '' },
    roomDirectoryIndex: new Map(),
    roomDirectoryByHotel: new Map(),
    roomDirectoryLoadedAt: 0,
  };

  const els = {
    bookingTableBody: document.querySelector('.booking-list'),
    bookingForm: document.querySelector('.booking-form'),
    bookingSubmitBtn: document.getElementById('bookingSubmitBtn'),
    hotelSelect: document.querySelector('.booking-form select[name="hotel"]'),
    fullnameInput: document.querySelector('.booking-form input[name="fullname"]'),
    roomNoInput: document.querySelector('.booking-form input[name="roomNo"]'),
    peopleInput: document.querySelector('.booking-form input[name="totalPeople"]'),
    checkInInput: document.querySelector('.booking-form input[name="checkInDate"]'),
    checkOutInput: document.querySelector('.booking-form input[name="checkOutDate"]'),
    priceInput: document.querySelector('.booking-form input[name="price"]'),
    paymentSelect: document.querySelector('.booking-form select[name="paymentMethod"]'),
    mobileInput: document.querySelector('.booking-form input[name="mobile"]'),
  roomTypeField: document.querySelector('.booking-form [name="roomType"]'),
  roomClassField: document.querySelector('.booking-form [name="roomClass"]'),
    hotelFilter: document.getElementById('hotelFilter'),
    // Date filter inputs in the rooms panel
    checkInFilter: document.getElementById('checkInFilter'),
    checkOutFilter: document.getElementById('checkOutFilter'),
    applyDateFilterBtn: document.getElementById('applyDateFilter'),
    clearDateFilterBtn: document.getElementById('clearDateFilter'),
    roomGrid: document.getElementById('roomGrid'),
    totalRoomsCount: document.getElementById('totalRoomsCount'),
    availableRoomsCount: document.getElementById('availableRoomsCount'),
    bookedRoomsCount: document.getElementById('bookedRoomsCount'),
  unavailableRoomsCount: document.getElementById('unavailableRoomsCount'),
    searchInput: document.getElementById('roomSearchInput'),
    currentDateLabel: document.getElementById('current-date'),
    printBtn: document.querySelector('.print-btn'),
    userInfo: document.getElementById('user-info'),
    bookingModal: document.getElementById('registration-modal'),
    bookingModalTitle: document.querySelector('#registration-modal .modal-header h5'),
  };

  const defaultModalTitle = els.bookingModalTitle ? els.bookingModalTitle.textContent.trim() : 'Register Form';
  const defaultSubmitLabel = els.bookingSubmitBtn ? els.bookingSubmitBtn.textContent.trim() : 'Submit';

  configureScrollPersistence();

  document.addEventListener('DOMContentLoaded', () => {
    restoreScrollPosition();
    initialize();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      restoreScrollPosition();
    }
  });

  function getDefaultDateRange() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      checkIn: today.toISOString().split('T')[0],
      checkOut: tomorrow.toISOString().split('T')[0],
    };
  }

  function configureScrollPersistence() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    window.addEventListener('scroll', handleScrollCapture, { passive: true });
    window.addEventListener('beforeunload', persistScrollPosition);
    window.addEventListener('pagehide', persistScrollPosition);
  }

  function handleScrollCapture() {
    if (scrollSaveTimeoutId) return;
    scrollSaveTimeoutId = window.setTimeout(() => {
      persistScrollPosition();
      scrollSaveTimeoutId = null;
    }, 160);
  }

  function persistScrollPosition() {
    const payload = JSON.stringify({ x: window.scrollX, y: window.scrollY });
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, payload);
    } catch (err) {
      console.warn('Unable to persist scroll position', err);
    }
  }

  function restoreScrollPosition() {
    try {
      const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const x = Number.isFinite(parsed?.x) ? parsed.x : 0;
      const y = Number.isFinite(parsed?.y) ? parsed.y : 0;
      window.scrollTo(x, y);
    } catch (err) {
      console.warn('Unable to restore scroll position', err);
    }
  }
  function normalizeRoomNo(value) {
    if (value == null) return '';
    const trimmed = String(value).trim().toUpperCase();
    if (!trimmed) return '';
    const sanitized = trimmed.replace(/[^A-Z0-9]+/g, '-');
    const normalized = sanitized.replace(/-+/g, '-').replace(/^-|-$/g, '');
    return normalized;
  }

  function canonicalRoomId(value) {
    if (value == null) return '';
    return normalizeRoomNo(value).replace(/[^A-Z0-9]/g, '');
  }

  function canonicalHotelName(value) {
    if (value == null) return '';
    const base = String(value).trim().toLowerCase();
    if (!base) return '';
    const withoutPrefix = base.replace(/^hotel\s+/, '');
    const withoutHotelWord = withoutPrefix.replace(/\bhotel\b/g, '');
    return withoutHotelWord.replace(/[^a-z0-9]+/g, '');
  }

  function buildRoomKey(hotelName, roomNo) {
    const normalizedHotel = canonicalHotelName(hotelName);
    const canonicalRoom = canonicalRoomId(roomNo);
    return `${normalizedHotel}::${canonicalRoom}`;
  }

  function normalizeRoomStatus(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  function isRoomTemporarilyUnavailable(room) {
    const status = normalizeRoomStatus(room?.status);
    return Boolean(status && status !== 'active');
  }

  function getRoomDirectoryRecord(hotelName, roomNo) {
    if (!state.roomDirectoryIndex || !(state.roomDirectoryIndex instanceof Map)) return null;
    const normalizedRoom = normalizeRoomNo(roomNo);
    if (!normalizedRoom) return null;
    const key = buildRoomKey(hotelName, normalizedRoom);
    return state.roomDirectoryIndex.get(key) || null;
  }

  function getDirectoryRoomsForHotel(hotelName) {
    if (!state.roomDirectoryIndex || state.roomDirectoryIndex.size === 0) return [];
    if (!hotelName) {
      return Array.from(state.roomDirectoryIndex.values());
    }
    const canonicalHotel = canonicalHotelName(hotelName);
    if (!canonicalHotel) {
      return Array.from(state.roomDirectoryIndex.values());
    }
    const list = state.roomDirectoryByHotel.get(canonicalHotel);
    if (Array.isArray(list)) return list;
    const unknownBucket = state.roomDirectoryByHotel.get('__unknown__');
    return Array.isArray(unknownBucket) ? unknownBucket : [];
  }

  function mergeDirectoryRoomsIntoState(roomState, hotelName) {
    if (!(roomState instanceof Map)) return;
    const directoryRooms = getDirectoryRoomsForHotel(hotelName || '');
    directoryRooms.forEach((roomInfo) => {
      const displayRoomNo = roomInfo?.normalizedRoomNo || normalizeRoomNo(roomInfo?.roomNo);
      if (!displayRoomNo) return;
      const sourceHotel = roomInfo?.hotelName || hotelName || '';
      const key = buildRoomKey(sourceHotel, displayRoomNo);
      const existing = roomState.get(key);
      const derivedStatus = isRoomTemporarilyUnavailable(roomInfo) ? 'unavailable' : 'available';
      if (existing) {
        if (!existing.room) existing.room = roomInfo;
        if (!existing.hotelName) existing.hotelName = sourceHotel;
        if (!existing.roomNo) existing.roomNo = displayRoomNo;
        if (derivedStatus === 'unavailable' && !['booked', 'inhouse'].includes(existing.status)) {
          existing.status = 'unavailable';
        }
      } else {
        roomState.set(key, {
          status: derivedStatus,
          hotelName: sourceHotel,
          roomNo: displayRoomNo,
          room: roomInfo,
        });
      }
    });
  }

  async function initialize() {
    try {
      client.ensureAuthenticated({ redirect: AUTH_ERROR_REDIRECT });
    } catch (err) {
      // ensureAuthenticated already handled redirect when possible
      console.warn('Authentication required', err);
      return;
    }

    hydrateUserInfo();
    hydrateDateLabels();
    bindEventListeners();
    seedDateInputs();

    await loadHotels();
    await Promise.all([loadRoomDirectory(), loadBookings()]);
    await refreshAvailability();
  }

  function hydrateUserInfo() {
    if (!els.userInfo) return;
    const user = client.getCurrentUser();
    if (!user) return;
    const name = user.fullname || user.name || user.email || 'LUXE Guest';
    const role = user.role ? `Role: ${user.role}` : '';
    els.userInfo.innerHTML = `<h2>${escapeHtml(name)}</h2>${role ? `<p>${escapeHtml(role)}</p>` : ''}`;
  }

  function hydrateDateLabels() {
    if (!els.currentDateLabel) return;
    const now = new Date();
    els.currentDateLabel.textContent = now.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function seedDateInputs() {
    if (els.checkInInput) els.checkInInput.value = state.dateRange.checkIn;
    // also seed the date filter inputs (rooms panel) so they reflect the current state
    if (els.checkInFilter) els.checkInFilter.value = state.dateRange.checkIn;
    if (els.checkOutFilter) els.checkOutFilter.value = state.dateRange.checkOut;
    // set min attributes to prevent selecting past dates
    setDateInputMins();
    ensureDateDisplaySpans();
    updateDateDisplays();
  }

  function bindEventListeners() {
    if (els.bookingForm) {
      ['fullname', 'mobile'].forEach((field) => scheduleFieldAutoClear(els.bookingForm, field));
      els.bookingForm.addEventListener('reset', () => {
        ['fullname', 'mobile'].forEach((field) => clearFieldError(els.bookingForm, field));
      });
      els.bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    if (els.hotelSelect) {
      els.hotelSelect.addEventListener('change', () => {
        state.selectedHotel = els.hotelSelect.value;
        synchronizeHotelFilter();
        updatePriceField();
        validateRoomAvailability(false);
        refreshAvailability();
      });
    }

    if (els.checkInInput) {
      els.checkInInput.addEventListener('change', () => {
        state.dateRange.checkIn = els.checkInInput.value;
        validateDateRange();
        updatePriceField();
        refreshAvailability();
        // ensure booking form check-out min is always after check-in
        if (els.checkOutInput) {
          const minOut = nextDateString(els.checkInInput.value);
          els.checkOutInput.min = minOut;
          if (!els.checkOutInput.value || els.checkOutInput.value <= els.checkInInput.value) {
            els.checkOutInput.value = minOut;
            state.dateRange.checkOut = minOut;
          }
        }
        updateDateDisplays();
        updatePriceInputFromState();
        validateRoomAvailability(false);
      });
    }

    if (els.checkOutInput) {
      els.checkOutInput.addEventListener('change', () => {
        state.dateRange.checkOut = els.checkOutInput.value;
        validateDateRange();
        updatePriceField();
        refreshAvailability();
        updateDateDisplays();
        updatePriceInputFromState();
        validateRoomAvailability(false);
      });
    }

    if (els.roomNoInput) {
  const handleRoomInput = () => validateRoomAvailability(false);
      els.roomNoInput.addEventListener('input', handleRoomInput);
      els.roomNoInput.addEventListener('change', handleRoomInput);
      els.roomNoInput.addEventListener('blur', () => {
        updatePriceField();
        validateRoomAvailability(true);
      });
    }

    if (els.hotelFilter) {
      els.hotelFilter.addEventListener('change', () => {
        state.selectedHotel = els.hotelFilter.value;
        synchronizeHotelSelect();
        validateRoomAvailability(false);
        refreshAvailability();
      });
    }

    if (els.searchInput) {
      els.searchInput.addEventListener('input', () => {
        state.searchTerm = els.searchInput.value.trim().toLowerCase();
        renderRoomGrid();
      });
    }

    // Apply / Clear date filters (rooms panel)
    if (els.applyDateFilterBtn) {
      els.applyDateFilterBtn.addEventListener('click', () => {
        if (!els.checkInFilter || !els.checkOutFilter) return;
        const start = els.checkInFilter.value;
        const end = els.checkOutFilter.value;
        if (!start || !end) {
          notifyError('Please select both check-in and check-out dates.');
          return;
        }
        const a = new Date(start);
        const b = new Date(end);
        if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) {
          notifyError('Check-out date must be after check-in date.');
          return;
        }
        state.dateRange = { checkIn: start, checkOut: end };
        // if a hotel is selected in the hotel filter, use it for availability
        if (els.hotelFilter && els.hotelFilter.value) {
          state.selectedHotel = els.hotelFilter.value;
          synchronizeHotelSelect();
        }
        // keep booking form inputs in sync
        seedDateInputs();
        // ensure filter check-out min is set correctly
        if (els.checkOutFilter) {
          const minOut = nextDateString(start);
          els.checkOutFilter.min = minOut;
          if (els.checkOutFilter.value <= start) els.checkOutFilter.value = minOut;
        }
        updateDateDisplays();
        refreshAvailability();
      });
    }

    if (els.clearDateFilterBtn) {
      els.clearDateFilterBtn.addEventListener('click', () => {
        const def = getDefaultDateRange();
        state.dateRange = def;
        if (els.checkInFilter) els.checkInFilter.value = def.checkIn;
        if (els.checkOutFilter) els.checkOutFilter.value = def.checkOut;
        // reset min attributes after clearing
        setDateInputMins();
        seedDateInputs();
        updateDateDisplays();
        refreshAvailability();
      });
    }

    if (els.printBtn) {
      els.printBtn.addEventListener('click', () => window.print());
    }

    // When the registration modal is opened, refresh hotels so newly added hotels/rooms appear
    const registrationModal = els.bookingModal;
    if (registrationModal) {
      registrationModal.addEventListener('show.bs.modal', async () => {
        try {
          await loadHotels();
          if (state.editingBookingId) {
            const existing = state.bookingsById.get(state.editingBookingId);
            if (existing) {
              populateFormForEdit(state.editingBookingId, existing);
            }
          } else {
            synchronizeHotelSelect();
            setDateInputMins();
            updateDateDisplays();
          }
        } catch (err) {
          console.error('Failed to refresh hotels on modal show', err);
        }
      });
      registrationModal.addEventListener('hidden.bs.modal', () => {
        setFormToCreateMode();
      });
    }
    // fallback: refresh when New Booking button is clicked
    const newBookingBtns = document.querySelectorAll('[data-bs-target="#registration-modal"]');
    if (newBookingBtns && newBookingBtns.length) {
      newBookingBtns.forEach((btn) => btn.addEventListener('click', async () => {
        setFormToCreateMode();
        try {
          await loadHotels();
          synchronizeHotelSelect();
        } catch (err) {
          console.error('Failed to refresh hotels on new booking click', err);
        }
      }));
    }
  }

  function synchronizeHotelFilter() {
    if (!els.hotelFilter) return;
    if (els.hotelFilter.value === state.selectedHotel) return;
    els.hotelFilter.value = state.selectedHotel;
  }

  function synchronizeHotelSelect() {
    if (!els.hotelSelect) return;
    if (els.hotelSelect.value === state.selectedHotel) return;
    els.hotelSelect.value = state.selectedHotel;
  }

  function validateDateRange() {
    if (!els.checkInInput || !els.checkOutInput) return true;
    const checkIn = new Date(els.checkInInput.value);
    const checkOut = new Date(els.checkOutInput.value);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return false;
    if (checkOut > checkIn) return true;
    const tomorrow = new Date(checkIn);
    tomorrow.setDate(checkIn.getDate() + 1);
    const fallback = tomorrow.toISOString().split('T')[0];
    els.checkOutInput.value = fallback;
    state.dateRange.checkOut = fallback;
    return false;
  }

  async function loadHotels() {
    try {
      const data = await client.get('/hotels', { auth: false, redirectOnAuthError: false });
      const hotels = Array.isArray(data?.hotels) ? data.hotels.slice() : [];
      hotels.sort((a, b) => {
        const nameA = (a?.name || '').toLowerCase();
        const nameB = (b?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      state.hotels = hotels;
      populateHotelOptions();
      synchronizeHotelSelect();
      synchronizeHotelFilter();
    } catch (err) {
      console.error('Failed to load hotels', err);
      notifyError('Unable to load hotels. Please refresh the page.');
    }
  }

  async function loadRoomDirectory() {
    try {
      const data = await client.get('/rooms', { redirectOnAuthError: false });
      const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
      const index = new Map();
      const byHotel = new Map();
      rooms.forEach((room) => {
        const hotelName = room?.hotelName || '';
        const normalizedRoomNo = normalizeRoomNo(room?.roomNo);
        if (!normalizedRoomNo) return;
        const canonicalHotel = canonicalHotelName(hotelName);
        const normalizedStatus = normalizeRoomStatus(room?.status) || 'active';
        const priceValue = Number(room?.pricePerNight ?? room?.price ?? 0) || 0;
        const entry = {
          ...room,
          hotelName,
          normalizedHotel: canonicalHotel,
          normalizedRoomNo,
          status: normalizedStatus,
          pricePerNight: priceValue,
        };
        const key = buildRoomKey(hotelName, normalizedRoomNo);
        index.set(key, entry);
        const bucketKey = canonicalHotel || '__unknown__';
        if (!byHotel.has(bucketKey)) {
          byHotel.set(bucketKey, []);
        }
        byHotel.get(bucketKey).push(entry);
      });
      state.roomDirectoryIndex = index;
      state.roomDirectoryByHotel = byHotel;
      state.roomDirectoryLoadedAt = Date.now();
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        console.warn('Insufficient permissions to retrieve room directory', err);
      } else {
        console.warn('Failed to load room directory', err);
      }
      if (!state.roomDirectoryIndex || !(state.roomDirectoryIndex instanceof Map)) {
        state.roomDirectoryIndex = new Map();
      }
      if (!state.roomDirectoryByHotel || !(state.roomDirectoryByHotel instanceof Map)) {
        state.roomDirectoryByHotel = new Map();
      }
    }
  }

  async function refreshRoomDirectoryIfStale() {
    const now = Date.now();
    if (!state.roomDirectoryLoadedAt || now - state.roomDirectoryLoadedAt > ROOM_DIRECTORY_TTL_MS) {
      await loadRoomDirectory();
    }
  }

  function populateHotelOptions() {
    const fragment = document.createDocumentFragment();
    state.hotels.forEach((hotel) => {
      if (!hotel?.name) return;
      const option = document.createElement('option');
      option.value = hotel.name;
      option.textContent = hotel.name;
      fragment.appendChild(option);
    });
    if (els.hotelSelect) {
      // keep the placeholder option at the top
      els.hotelSelect.innerHTML = '<option value="">Select Hotel</option>';
      els.hotelSelect.appendChild(fragment.cloneNode(true));
    }
    if (els.hotelFilter) {
      els.hotelFilter.innerHTML = '<option value="">All Hotels</option>';
      els.hotelFilter.appendChild(fragment);
    }
  }

  async function loadBookings() {
    try {
      const data = await client.get('/bookings');
      const rawBookings = Array.isArray(data?.bookings) ? data.bookings : [];

      state.bookings = rawBookings.map((booking) => ({
        ...booking,
        roomNo: normalizeRoomNo(booking?.roomNo),
      }));
      state.bookingsById = new Map();
      state.bookings.forEach((booking) => {
        const primaryId = booking?._id || booking?.id || booking?.bookingId;
        const fallbackId = primaryId || `${booking?.hotelName || 'booking'}-${booking?.roomNo || 'room'}-${booking?.checkInDate || Date.now()}`;
        state.bookingsById.set(String(fallbackId), booking);
        if (primaryId) {
          state.bookingsById.set(String(primaryId), booking);
        }
      });
      const currentUser = client.getCurrentUser();
        state.myBookings = state.bookings.filter((booking) => isBookingOwnedByUser(booking, currentUser));
      const userRole = (currentUser?.role || 'user').toLowerCase();
      const isPrivileged = userRole !== 'user';
      if (isPrivileged) {
        state.visibleBookings = state.bookings.slice();
      } else {
        state.visibleBookings = state.myBookings.slice();
      }
      clearAvailabilityCache();
      renderBookingTable();
      validateRoomAvailability(false);
    } catch (err) {
      console.error('Failed to load bookings', err);
      notifyError(err?.message || 'Unable to load bookings.');
    }
  }

  function renderBookingTable() {
    if (!els.bookingTableBody) return;
    if (!state.visibleBookings.length) {
      els.bookingTableBody.innerHTML = `<tr><td colspan="12">No bookings found.</td></tr>`;
      return;
    }

    const currentUser = client.getCurrentUser();
    const isPrivileged = (currentUser?.role || 'user').toLowerCase() !== 'user';

    const rows = state.visibleBookings
      .slice()
      .sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate))
      .map((booking, idx) => {
        const meta = parseNotes(booking?.notes);
        const price = typeof booking?.price === 'number' ? booking.price : Number(booking?.price) || 0;
        const status = (booking?.status || 'Booked').replace(/_/g, ' ');
        const serverBookingId = booking?._id || booking?.id || booking?.bookingId;
        const normalizedStatus = typeof booking?.status === 'string' ? booking.status.toLowerCase() : '';
        const isCancelable = normalizedStatus ? !['cancelled', 'checked_out'].includes(normalizedStatus) : true;
        const isOwner = isBookingOwnedByUser(booking, currentUser);
        const canCancel = isCancelable && (isPrivileged || isOwner) && Boolean(serverBookingId);
        const canEdit = Boolean(serverBookingId) && !['cancelled', 'checked_out'].includes(normalizedStatus) && (isPrivileged || isOwner);

        const actions = [];
        if (canEdit) {
          actions.push(`<button class="btn btn-sm btn-outline-primary w-100 text-nowrap booking-edit-btn" data-booking-action="edit" data-booking-id="${escapeHtml(String(serverBookingId))}">Edit</button>`);
        }
        if (canCancel) {
          actions.push(`<button class="btn btn-sm btn-outline-danger w-100 text-nowrap booking-cancel-btn" data-booking-action="cancel" data-booking-id="${escapeHtml(String(serverBookingId))}">Cancel</button>`);
        }
        const actionMarkup = actions.length ? `<div class="d-grid gap-2">${actions.join('')}</div>` : '—';
        return `
          <tr>
            <td class="no-print" data-label="Sr">${idx + 1}</td>
            <td data-label="Hotel">${escapeHtml(booking?.hotelName || '—')}</td>
            <td data-label="Room No">${escapeHtml(booking?.roomNo || '—')}</td>
            <td data-label="Room Type">${escapeHtml(meta.roomType || '—')}</td>
            <td data-label="Room Class">${escapeHtml(meta.roomClass || '—')}</td>
            <td data-label="Check In">${formatDate(booking?.checkInDate)}</td>
            <td data-label="Check Out">${formatDate(booking?.checkOutDate)}</td>
            <td data-label="People">${escapeHtml(String(booking?.totalPeople ?? '—'))}</td>
            <td data-label="Price">${formatPrice(price)}</td>
            <td data-label="Payment">${escapeHtml(meta.paymentMethod || '—')}</td>
            <td class="no-print" data-label="Status">${escapeHtml(status)}</td>
            <td class="no-print action-cell" data-label="Action">${actionMarkup}</td>
          </tr>
        `;
      });

    els.bookingTableBody.innerHTML = rows.join('');
    bindBookingTableActions();
  }

  function bindBookingTableActions() {
    if (!els.bookingTableBody) return;
    els.bookingTableBody.querySelectorAll('[data-booking-action]').forEach((btn) => {
      const action = btn.getAttribute('data-booking-action');
      const bookingId = btn.getAttribute('data-booking-id');
      if (!bookingId || !action) return;
      if (action === 'cancel') {
        btn.addEventListener('click', () => {
          handleCancelBooking(bookingId, btn);
        });
      }
      if (action === 'edit') {
        btn.addEventListener('click', () => {
          handleEditBooking(bookingId);
        });
      }
    });
  }

  async function handleCancelBooking(rawBookingId, triggerBtn) {
    const normalizedId = String(rawBookingId);
    const booking = state.bookingsById.get(normalizedId);
    if (!booking) {
      notifyError('Unable to locate that booking. Please refresh and try again.');
      return;
    }

    const prompt = `Cancel booking for Room ${booking.roomNo || ''} at ${booking.hotelName || ''}?`;
    const confirmed = await confirmAction(prompt);
    if (!confirmed) return;

    const serverId = booking?._id || booking?.id || booking?.bookingId;
    if (!serverId) {
      notifyError('This booking cannot be cancelled automatically. Please contact support.');
      return;
    }

    try {
      toggleButtonLoading(triggerBtn, true);
      await client.patch(`/bookings/${serverId}`, { status: 'cancelled' });
      notifySuccess('Booking cancelled successfully.');
      await loadBookings();
      clearAvailabilityCache();
      await refreshAvailability();
    } catch (err) {
      console.error('Failed to cancel booking', err);
      const message = err?.data?.message || err?.message || 'Unable to cancel booking.';
      notifyError(message);
    } finally {
      toggleButtonLoading(triggerBtn, false);
    }
  }

  function parseNotes(value) {
    if (!value) return { roomType: '', roomClass: '', paymentMethod: '' };
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return {
          roomType: parsed.roomType || '',
          roomClass: parsed.roomClass || '',
          paymentMethod: parsed.paymentMethod || '',
        };
      }
      return { roomType: '', roomClass: '', paymentMethod: '' };
    } catch (err) {
      // if notes are plain text we keep it in paymentMethod column for visibility
      return { roomType: '', roomClass: '', paymentMethod: String(value) };
    }
  }

  function isBookingOwnedByUser(booking, user) {
    if (!booking || !user) return false;
    const idMatches = booking.userId && user.id && String(booking.userId) === String(user.id);
    const emailMatches = booking.userEmail && user.email && booking.userEmail === user.email;
    const createdByEmailMatches = booking.createdBy && user.email && booking.createdBy === user.email;
    const createdByIdMatches = booking.createdBy && user.id && String(booking.createdBy) === String(user.id);
    return Boolean(idMatches || emailMatches || createdByEmailMatches || createdByIdMatches);
  }

  async function refreshAvailability() {
    await refreshRoomDirectoryIfStale();
    if (!state.hotels.length) {
      renderRoomGrid();
      updateRoomStats([]);
      return;
    }

    if (!state.selectedHotel) {
      await ensureAvailabilityForAll(state.dateRange);
      renderRoomGrid();
      return;
    }

    const key = buildAvailabilityKey(state.selectedHotel, state.dateRange);
    if (!state.availabilityCache.has(key)) {
      await fetchAvailability(state.selectedHotel, state.dateRange);
    }
    renderRoomGrid();
  }

  function buildAvailabilityKey(hotelName, range) {
    const normalizedHotel = hotelName || ALL_HOTELS_CACHE_KEY;
    return `${normalizedHotel}__${range.checkIn}__${range.checkOut}`;
  }

  function clearAvailabilityCache(hotelName) {
    if (!hotelName) {
      state.availabilityCache.clear();
      return;
    }
    const normalizedHotel = hotelName || ALL_HOTELS_CACHE_KEY;
    const prefix = `${normalizedHotel}__`;
    Array.from(state.availabilityCache.keys()).forEach((key) => {
      if (key.startsWith(prefix)) {
        state.availabilityCache.delete(key);
      }
    });
  }

  async function fetchAvailability(hotelName, range) {
    try {
      const query = {
        hotelName,
        checkInDate: range.checkIn,
        checkOutDate: range.checkOut,
      };
      const data = await client.get('/availability', { auth: false, query, redirectOnAuthError: false });
      const key = buildAvailabilityKey(hotelName, range);
      const rooms = Array.isArray(data?.available)
        ? data.available.map((room) => ({
            ...room,
            roomNo: normalizeRoomNo(room?.roomNo),
          }))
        : [];
      state.availabilityCache.set(key, rooms);
    } catch (err) {
      console.error('Failed to load availability', err);
      notifyError(err?.message || 'Unable to load availability.');
      state.availabilityCache.set(buildAvailabilityKey(hotelName, range), []);
    }
  }

  async function ensureAvailabilityForAll(range) {
    if (!state.hotels.length) return;
    const tasks = state.hotels
      .filter((hotel) => hotel?.name)
      .map((hotel) => ensureAvailabilityFor(hotel.name, range));
    await Promise.all(tasks);
  }

  function getAggregatedAvailability(range) {
    const allRooms = [];
    if (!Array.isArray(state.hotels) || !state.hotels.length) return allRooms;
    state.hotels.forEach((hotel) => {
      if (!hotel?.name) return;
      const key = buildAvailabilityKey(hotel.name, range);
      const rooms = state.availabilityCache.get(key);
      if (!Array.isArray(rooms)) return;
      rooms.forEach((room) => {
        const normalizedRoomNo = normalizeRoomNo(room?.roomNo);
        if (!normalizedRoomNo) return;
        allRooms.push({
          ...room,
          roomNo: normalizedRoomNo,
          hotelName: room?.hotelName || hotel.name,
        });
      });
    });
    return allRooms;
  }

  function renderRoomGrid() {
    if (!els.roomGrid) return;
    if (!state.selectedHotel) {
      const availableRooms = getAggregatedAvailability(state.dateRange);
      const overlappingBookingsAll = state.bookings.filter((booking) =>
        isBlockingStatus(booking?.status) &&
        hasDateOverlap(state.dateRange.checkIn, state.dateRange.checkOut, booking.checkInDate, booking.checkOutDate)
      );

      const roomState = new Map();

      availableRooms.forEach((room) => {
        const displayRoomNo = normalizeRoomNo(room?.roomNo);
        if (!displayRoomNo) return;
  const key = buildRoomKey(room.hotelName || state.selectedHotel || '', displayRoomNo);
        const existing = roomState.get(key);
        if (!existing) {
          roomState.set(key, {
            status: 'available',
            hotelName: room.hotelName || '',
            roomNo: displayRoomNo,
            room,
          });
        } else {
          if (!existing.room) existing.room = room;
          if (!existing.roomNo) existing.roomNo = displayRoomNo;
        }
      });

      overlappingBookingsAll.forEach((booking) => {
        const displayRoomNo = normalizeRoomNo(booking?.roomNo);
        if (!displayRoomNo) return;
    const key = buildRoomKey(booking.hotelName || state.selectedHotel || '', displayRoomNo);
        const existing = roomState.get(key);
        roomState.set(key, {
          status: 'booked',
          hotelName: booking.hotelName,
          roomNo: displayRoomNo,
          booking,
          room: existing?.room,
        });
      });

      mergeDirectoryRoomsIntoState(roomState, '');

      const allEntries = Array.from(roomState.values());
      const statsAvailable = allEntries.filter((entry) => entry.status === 'available');
      const statsBooked = allEntries.filter((entry) => entry.status === 'booked');
      const statsUnavailable = allEntries.filter((entry) => entry.status === 'unavailable');
      updateRoomStats(
        statsAvailable.map((entry) => entry.room || entry),
        statsBooked.map((entry) => entry.booking || entry),
        statsUnavailable.map((entry) => entry.room || entry),
      );

      const needle = state.searchTerm ? state.searchTerm.toLowerCase() : '';
      const filteredAvailable = [];
      const filteredBooked = [];
      const filteredUnavailable = [];

      allEntries.forEach((entry) => {
        const haystack = entry.status === 'booked'
          ? `${entry.hotelName || ''} ${entry.roomNo || ''} ${(entry.booking?.fullname || '')}`.toLowerCase()
          : `${entry.hotelName || ''} ${entry.roomNo || ''} ${(entry.room?.type || '')} ${entry.status === 'unavailable' ? 'temporarily unavailable service' : ''}`.toLowerCase();
        if (!needle || haystack.includes(needle)) {
          if (entry.status === 'booked') {
            filteredBooked.push(entry);
          } else if (entry.status === 'unavailable') {
            filteredUnavailable.push(entry);
          } else {
            filteredAvailable.push(entry);
          }
        }
      });

      if (!filteredAvailable.length && !filteredBooked.length && !filteredUnavailable.length) {
        els.roomGrid.innerHTML = `<div class="col-12"><div class="alert alert-info">No rooms found for the selected dates. Adjust the filters to see more results.</div></div>`;
        return;
      }

      const fragments = document.createDocumentFragment();

      if (filteredAvailable.length) {
        fragments.appendChild(buildRoomSectionHeading('Available Rooms'));
        filteredAvailable.forEach((entry) => {
          const info = entry.room || {};
          fragments.appendChild(buildRoomCard({
            title: `${escapeHtml(entry.hotelName || '—')} — Room ${escapeHtml(entry.roomNo || '')}`,
            subtitle: info.type ? `Type: ${escapeHtml(info.type)}` : '',
            details: [
              info.capacity ? `${info.capacity} guests` : '',
              info.pricePerNight ? formatPrice(info.pricePerNight) : '',
            ].filter(Boolean).join(' · '),
            badgeClass: 'bg-success',
            badgeLabel: 'Available',
            variant: 'available',
          }));
        });
      }

      if (filteredBooked.length) {
        fragments.appendChild(buildRoomSectionHeading('Booked Rooms'));
        filteredBooked.forEach((entry) => {
          const booking = entry.booking || {};
          const meta = parseNotes(booking.notes);
          const priceValue = Number(booking.price);
          fragments.appendChild(buildRoomCard({
            title: `${escapeHtml(entry.hotelName || '—')} — Room ${escapeHtml(entry.roomNo || '')}`,
            subtitle: booking.fullname ? `Guest: ${escapeHtml(booking.fullname)}` : '',
            details: [
              `Check-in: ${formatDate(booking.checkInDate)}`,
              `Check-out: ${formatDate(booking.checkOutDate)}`,
              Number.isFinite(priceValue) ? `Total: ${formatPrice(priceValue)}` : '',
              meta.paymentMethod ? `Payment: ${escapeHtml(meta.paymentMethod)}` : '',
            ].filter(Boolean).join(' · '),
            badgeClass: 'bg-primary',
            badgeLabel: formatBookingStatusLabel(booking.status),
            variant: 'booked',
          }));
        });
      }

      if (filteredUnavailable.length) {
        fragments.appendChild(buildRoomSectionHeading('Temporarily Unavailable'));
        filteredUnavailable.forEach((entry) => {
          const info = entry.room || {};
          fragments.appendChild(buildRoomCard({
            title: `${escapeHtml(entry.hotelName || '—')} — Room ${escapeHtml(entry.roomNo || '')}`,
            subtitle: info.type ? `Type: ${escapeHtml(info.type)}` : '',
            details: [
              info.capacity ? `${info.capacity} guests` : '',
              info.pricePerNight ? formatPrice(info.pricePerNight) : '',
            ].filter(Boolean).join(' · '),
            badgeClass: 'bg-secondary',
            badgeLabel: 'Temporarily Unavailable',
            variant: 'unavailable',
          }));
        });
      }

      els.roomGrid.innerHTML = '';
      els.roomGrid.appendChild(fragments);
      return;
    }

    const key = buildAvailabilityKey(state.selectedHotel, state.dateRange);
    const availableRooms = state.availabilityCache.get(key) || [];
    const selectedHotelCanonical = canonicalHotelName(state.selectedHotel);
    const overlappingBookings = state.bookings.filter((booking) =>
      canonicalHotelName(booking?.hotelName) === selectedHotelCanonical &&
      isBlockingStatus(booking?.status) &&
      hasDateOverlap(state.dateRange.checkIn, state.dateRange.checkOut, booking.checkInDate, booking.checkOutDate)
    );

    const roomState = new Map();

    availableRooms.forEach((room) => {
      const displayRoomNo = normalizeRoomNo(room?.roomNo);
      if (!displayRoomNo) return;
      const keyWithRoom = buildRoomKey(state.selectedHotel, displayRoomNo);
      const existing = roomState.get(keyWithRoom);
      if (!existing) {
        roomState.set(keyWithRoom, {
          status: 'available',
          hotelName: state.selectedHotel,
          roomNo: displayRoomNo,
          room,
        });
      } else {
        if (!existing.room) existing.room = room;
        if (!existing.roomNo) existing.roomNo = displayRoomNo;
      }
    });

    overlappingBookings.forEach((booking) => {
      const displayRoomNo = normalizeRoomNo(booking?.roomNo);
      if (!displayRoomNo) return;
    const keyWithRoom = buildRoomKey(state.selectedHotel, displayRoomNo);
      const existing = roomState.get(keyWithRoom);
      roomState.set(keyWithRoom, {
        status: 'booked',
        hotelName: state.selectedHotel,
        roomNo: displayRoomNo,
        booking,
        room: existing?.room,
      });
    });

    mergeDirectoryRoomsIntoState(roomState, state.selectedHotel);

    const allEntries = Array.from(roomState.values());
    const statsAvailable = allEntries.filter((entry) => entry.status === 'available');
    const statsBooked = allEntries.filter((entry) => entry.status === 'booked');
    const statsUnavailable = allEntries.filter((entry) => entry.status === 'unavailable');
    updateRoomStats(
      statsAvailable.map((entry) => entry.room || entry),
      statsBooked.map((entry) => entry.booking || entry),
      statsUnavailable.map((entry) => entry.room || entry),
    );

    const needle = state.searchTerm ? state.searchTerm.toLowerCase() : '';
    const filteredAvailable = [];
    const filteredBooked = [];
    const filteredUnavailable = [];

    allEntries.forEach((entry) => {
      const haystack = entry.status === 'booked'
        ? `${state.selectedHotel || ''} ${entry.roomNo || ''} ${(entry.booking?.fullname || '')}`.toLowerCase()
        : `${state.selectedHotel || ''} ${entry.roomNo || ''} ${(entry.room?.type || '')} ${entry.status === 'unavailable' ? 'temporarily unavailable service' : ''}`.toLowerCase();
      if (!needle || haystack.includes(needle)) {
        if (entry.status === 'booked') {
          filteredBooked.push(entry);
        } else if (entry.status === 'unavailable') {
          filteredUnavailable.push(entry);
        } else {
          filteredAvailable.push(entry);
        }
      }
    });

    if (!filteredAvailable.length && !filteredBooked.length && !filteredUnavailable.length) {
      els.roomGrid.innerHTML = `<div class="col-12"><div class="alert alert-warning">No rooms found for the selected filters.</div></div>`;
      return;
    }

    const fragments = document.createDocumentFragment();

    if (filteredAvailable.length) {
      fragments.appendChild(buildRoomSectionHeading('Available Rooms'));
      filteredAvailable.forEach((entry) => {
        const info = entry.room || {};
        fragments.appendChild(buildRoomCard({
          title: `Room ${escapeHtml(entry.roomNo || '')}`,
          subtitle: info.type ? `Type: ${escapeHtml(info.type)}` : '',
          details: [
            info.capacity ? `${info.capacity} guests` : '',
            info.pricePerNight ? formatPrice(info.pricePerNight) : '',
          ].filter(Boolean).join(' · '),
          badgeClass: 'bg-success',
          badgeLabel: 'Available',
          variant: 'available',
        }));
      });
    }

    if (filteredBooked.length) {
      fragments.appendChild(buildRoomSectionHeading('Booked Rooms'));
      filteredBooked.forEach((entry) => {
        const booking = entry.booking || {};
        const meta = parseNotes(booking.notes);
        const priceValue = Number(booking.price);
        fragments.appendChild(buildRoomCard({
          title: `Room ${escapeHtml(entry.roomNo || '')}`,
          subtitle: booking.fullname ? `Guest: ${escapeHtml(booking.fullname)}` : '',
          details: [
            `Check-in: ${formatDate(booking.checkInDate)}`,
            `Check-out: ${formatDate(booking.checkOutDate)}`,
            Number.isFinite(priceValue) ? `Total: ${formatPrice(priceValue)}` : '',
            meta.paymentMethod ? `Payment: ${escapeHtml(meta.paymentMethod)}` : '',
          ].filter(Boolean).join(' · '),
          badgeClass: 'bg-primary',
          badgeLabel: formatBookingStatusLabel(booking.status),
          variant: 'booked',
        }));
      });
    }

    if (filteredUnavailable.length) {
      fragments.appendChild(buildRoomSectionHeading('Temporarily Unavailable'));
      filteredUnavailable.forEach((entry) => {
        const info = entry.room || {};
        fragments.appendChild(buildRoomCard({
          title: `Room ${escapeHtml(entry.roomNo || '')}`,
          subtitle: info.type ? `Type: ${escapeHtml(info.type)}` : '',
          details: [
            info.capacity ? `${info.capacity} guests` : '',
            info.pricePerNight ? formatPrice(info.pricePerNight) : '',
          ].filter(Boolean).join(' · '),
          badgeClass: 'bg-secondary',
          badgeLabel: 'Temporarily Unavailable',
          variant: 'unavailable',
        }));
      });
    }

    els.roomGrid.innerHTML = '';
    els.roomGrid.appendChild(fragments);
  }

  function buildRoomSectionHeading(text) {
    const wrapper = document.createElement('div');
    wrapper.className = 'col-12 room-section-heading';
    wrapper.innerHTML = `<h4 class="mb-3">${escapeHtml(text)}</h4>`;
    return wrapper;
  }

  function buildRoomCard({ title, subtitle, details, badgeClass, badgeLabel, variant = 'available' }) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-4 col-xl-3';
    col.innerHTML = `
      <div class="room-card ${variant} h-100 border rounded p-3 shadow-sm">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h5 class="mb-1">${title}</h5>
            ${subtitle ? `<p class="mb-1 text-muted">${subtitle}</p>` : ''}
          </div>
          <span class="badge ${badgeClass}">${escapeHtml(badgeLabel)}</span>
        </div>
        ${details ? `<p class="mb-0 small text-muted">${details}</p>` : ''}
      </div>
    `;
    return col;
  }

  function updateRoomStats(availableRooms, bookedRooms = [], unavailableRooms = []) {
    if (!els.totalRoomsCount || !els.availableRoomsCount || !els.bookedRoomsCount) return;
    const availableCount = Array.isArray(availableRooms) ? availableRooms.filter(Boolean).length : 0;
    const bookedCount = Array.isArray(bookedRooms) ? bookedRooms.filter(Boolean).length : 0;
    const unavailableCount = Array.isArray(unavailableRooms) ? unavailableRooms.filter(Boolean).length : 0;
    const total = availableCount + bookedCount + unavailableCount;
    els.availableRoomsCount.textContent = String(availableCount);
    els.bookedRoomsCount.textContent = String(bookedCount);
    els.totalRoomsCount.textContent = String(total);
    if (els.unavailableRoomsCount) {
      els.unavailableRoomsCount.textContent = String(unavailableCount);
    }
  }

  function hasDateOverlap(startA, endA, startB, endB) {
    const aStart = new Date(startA);
    const aEnd = new Date(endA);
    const bStart = new Date(startB);
    const bEnd = new Date(endB);
    if ([aStart, aEnd, bStart, bEnd].some((d) => Number.isNaN(d.getTime()))) return false;
    return aStart < bEnd && bStart < aEnd;
  }

  function calculateStayNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  }

  function formatTotalPrice(nightlyRate, checkIn, checkOut) {
    if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) return '';
    const nights = calculateStayNights(checkIn, checkOut) || 1;
    const total = nightlyRate * nights;
    return Number.isFinite(total) ? Number(total.toFixed(2)).toString() : '';
  }

  function updatePriceInputFromState() {
    if (!els.priceInput) return;
    const nightlyRate = state.activeNightlyRate;
    if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) {
      els.priceInput.value = '';
      return;
    }
    const checkIn = els.checkInInput?.value || state.dateRange.checkIn;
    const checkOut = els.checkOutInput?.value || state.dateRange.checkOut;
    const total = formatTotalPrice(nightlyRate, checkIn, checkOut);
    els.priceInput.value = total;
  }

  function toDateInputValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const normalized = value === undefined || value === null ? '' : String(value);
    if (!normalized) {
      selectEl.value = '';
      return;
    }
    let option = Array.from(selectEl.options || []).find((opt) => opt.value === normalized);
    if (!option) {
      option = document.createElement('option');
      option.value = normalized;
      option.textContent = normalized;
      selectEl.appendChild(option);
    }
    selectEl.value = normalized;
  }

  function setRoomMetaField(fieldEl, value) {
    if (!fieldEl) return;
    const normalized = value === undefined || value === null ? '' : String(value).trim();
    fieldEl.value = normalized;
  }

  function extractRoomMeta(room) {
    if (!room || typeof room !== 'object') {
      return { roomType: '', roomClass: '' };
    }
    return {
      roomType: String(
        room.roomType || room.type || room.category || room.roomCategory || room.room_type || '',
      ).trim(),
      roomClass: String(
        room.roomClass || room.class || room.tier || room.level || room.roomClassName || room.room_class || '',
      ).trim(),
    };
  }

  function syncRoomMetaFields(metaOverride) {
    const meta = metaOverride || state.activeRoomMeta || { roomType: '', roomClass: '' };
    setRoomMetaField(els.roomTypeField, meta.roomType || '');
    setRoomMetaField(els.roomClassField, meta.roomClass || '');
    if (els.roomTypeField) {
      els.roomTypeField.readOnly = true;
      els.roomTypeField.classList.toggle('text-muted', !meta.roomType);
      els.roomTypeField.placeholder = meta.roomType ? '' : 'Auto-filled';
    }
    if (els.roomClassField) {
      els.roomClassField.readOnly = true;
      els.roomClassField.classList.toggle('text-muted', !meta.roomClass);
      els.roomClassField.placeholder = meta.roomClass ? '' : 'Auto-filled';
    }
  }

  function setFormToCreateMode() {
    state.editingBookingId = null;
    state.activeNightlyRate = null;
    state.activeRoomMeta = { roomType: '', roomClass: '' };
    state.dateRange = getDefaultDateRange();
    if (els.bookingModalTitle) {
      els.bookingModalTitle.textContent = defaultModalTitle;
    }
    if (els.bookingSubmitBtn) {
      els.bookingSubmitBtn.textContent = defaultSubmitLabel;
    }
    if (els.bookingForm) {
      els.bookingForm.reset();
      ['fullname', 'mobile'].forEach((field) => clearFieldError(els.bookingForm, field));
      seedDateInputs();
    }
    if (els.priceInput) els.priceInput.value = '';
    clearRoomAvailabilityWarning();
    syncRoomMetaFields();
  }

  function showBookingModal() {
    if (!els.bookingModal) return;
    const bootstrapModal = window.bootstrap?.Modal?.getOrCreateInstance(els.bookingModal) || (window.bootstrap ? new window.bootstrap.Modal(els.bookingModal) : null);
    if (bootstrapModal) {
      bootstrapModal.show();
    } else {
      els.bookingModal.classList.add('show');
      els.bookingModal.style.display = 'block';
    }
  }

  function populateFormForEdit(bookingId, booking) {
    state.editingBookingId = String(bookingId);
    if (els.bookingForm) {
      ['fullname', 'mobile'].forEach((field) => clearFieldError(els.bookingForm, field));
    }
    if (els.bookingModalTitle) {
      els.bookingModalTitle.textContent = 'Edit Booking';
    }
    if (els.bookingSubmitBtn) {
      els.bookingSubmitBtn.textContent = 'Update Booking';
    }

    if (els.fullnameInput) els.fullnameInput.value = booking?.fullname || '';
    if (els.hotelSelect) {
      setSelectValue(els.hotelSelect, booking?.hotelName || '');
    }
    if (els.roomNoInput) els.roomNoInput.value = normalizeRoomNo(booking?.roomNo);
    if (els.peopleInput) els.peopleInput.value = booking?.totalPeople || 1;

    const meta = parseNotes(booking?.notes);
    const mergedMeta = {
      roomType: meta.roomType || booking?.roomType || booking?.type || '',
      roomClass: meta.roomClass || booking?.roomClass || booking?.class || '',
    };
    state.activeRoomMeta = mergedMeta;
    syncRoomMetaFields(mergedMeta);
    setSelectValue(els.paymentSelect, meta.paymentMethod || '');

    if (els.checkInInput) els.checkInInput.value = toDateInputValue(booking?.checkInDate);
    if (els.checkOutInput) els.checkOutInput.value = toDateInputValue(booking?.checkOutDate);
    if (els.mobileInput) els.mobileInput.value = booking?.mobile || '';
    if (els.priceInput) els.priceInput.value = booking?.price != null ? String(booking.price) : '';

    const editNights = calculateStayNights(booking?.checkInDate, booking?.checkOutDate);
    if (editNights > 0 && Number.isFinite(Number(booking?.price))) {
      const nightly = Number(booking.price) / editNights;
      state.activeNightlyRate = Number.isFinite(nightly) && nightly > 0 ? nightly : state.activeNightlyRate;
    } else {
      state.activeNightlyRate = state.activeNightlyRate || null;
    }

    ensureDateDisplaySpans();
    setDateInputMins();
    updateDateDisplays();
    updatePriceInputFromState();
    validateRoomAvailability(false);
  }

  function handleEditBooking(rawBookingId) {
    const bookingId = String(rawBookingId);
    const booking = state.bookingsById.get(bookingId);
    if (!booking) {
      notifyError('Unable to load that booking. Please refresh and try again.');
      return;
    }
    populateFormForEdit(bookingId, booking);
    showBookingModal();
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();
    if (!els.bookingForm) return;

    ['fullname', 'mobile'].forEach((field) => clearFieldError(els.bookingForm, field));

    const formData = new FormData(els.bookingForm);
    const isEditing = Boolean(state.editingBookingId);
    const rawPrice = formData.get('price');
    const hasPriceValue = rawPrice !== null && rawPrice !== '';
    const numericPrice = hasPriceValue ? Number(rawPrice) : NaN;
    const priceForPayload = hasPriceValue && Number.isFinite(numericPrice) ? numericPrice : undefined;
    const normalizedRoomNo = normalizeRoomNo(formData.get('roomNo'));
    if (els.roomNoInput) {
      els.roomNoInput.value = normalizedRoomNo;
    }

    const rawFullname = (formData.get('fullname') || '').trim();
    if (els.fullnameInput) {
      els.fullnameInput.value = rawFullname;
    }
    if (rawFullname.length < 4) {
      setFieldError(els.bookingForm, 'fullname', 'Full name must be at least 4 characters long.');
      if (els.fullnameInput) {
        els.fullnameInput.focus();
      }
      return;
    }

    const normalizedPhone = normalizePhoneNumber(formData.get('mobile'));
    if (els.mobileInput) {
      els.mobileInput.value = normalizedPhone;
    }
    if (!isValidPhoneNumber(normalizedPhone)) {
      setFieldError(els.bookingForm, 'mobile', 'Phone number must start with 09 and contain exactly 11 digits.');
      if (els.mobileInput) {
        els.mobileInput.focus();
      }
      return;
    }

    if (!validateRoomAvailability(true)) {
      return;
    }

    const payload = {
      hotelName: formData.get('hotel') || '',
      roomNo: normalizedRoomNo,
      fullname: rawFullname,
      mobile: normalizedPhone,
      checkInDate: formData.get('checkInDate') || '',
      checkOutDate: formData.get('checkOutDate') || '',
      totalPeople: Number(formData.get('totalPeople')) || 1,
      price: priceForPayload,
      notice: JSON.stringify({
        roomType: (state.activeRoomMeta?.roomType || formData.get('roomType') || '').trim(),
        roomClass: (state.activeRoomMeta?.roomClass || formData.get('roomClass') || '').trim(),
        paymentMethod: formData.get('paymentMethod') || '',
      }),
    };

    if (!payload.hotelName || !payload.roomNo || !payload.fullname || !payload.checkInDate || !payload.checkOutDate) {
      notifyError('Please fill in all required fields.');
      return;
    }

    const stayNights = calculateStayNights(payload.checkInDate, payload.checkOutDate) || 1;
    let totalPrice = (hasPriceValue && Number.isFinite(numericPrice)) ? numericPrice : undefined;
    if (!Number.isFinite(totalPrice) && Number.isFinite(state.activeNightlyRate) && state.activeNightlyRate > 0) {
      totalPrice = state.activeNightlyRate * stayNights;
    }
    if (Number.isFinite(totalPrice)) {
      totalPrice = Number(totalPrice.toFixed(2));
    }

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      notifyError('Room price could not be determined. Please select a valid hotel, room, and stay length.');
      return;
    }

    payload.price = totalPrice;

    try {
      toggleSubmitState(true);
      if (isEditing) {
        await client.put(`/bookings/${state.editingBookingId}`, payload);
      } else {
        await client.post('/bookings', payload);
      }
      await loadBookings();
      await refreshAvailability();
      closeBookingModal();
      if (!isEditing) {
        els.bookingForm.reset();
        seedDateInputs();
      } else {
        state.editingBookingId = null;
      }
      state.activeNightlyRate = null;
      notifySuccess(isEditing ? 'Booking updated successfully.' : 'Booking created successfully.');
    } catch (err) {
      console.error(isEditing ? 'Failed to update booking' : 'Failed to create booking', err);
      const details = Array.isArray(err?.data?.details) ? `\n- ${err.data.details.join('\n- ')}` : '';
      const fallback = isEditing ? 'Could not update booking.' : 'Could not create booking.';
      const message = (err?.data?.message || err?.message || fallback) + details;
      notifyError(message);
    } finally {
      toggleSubmitState(false);
    }
  }

  function toggleSubmitState(isSubmitting) {
    if (!els.bookingSubmitBtn) return;
    const isEditing = Boolean(state.editingBookingId);
    els.bookingSubmitBtn.disabled = isSubmitting;
    if (isSubmitting) {
      els.bookingSubmitBtn.textContent = isEditing ? 'Updating…' : 'Submitting…';
    } else {
      els.bookingSubmitBtn.textContent = isEditing ? 'Update Booking' : defaultSubmitLabel;
    }
  }

  function closeBookingModal() {
    const modalEl = document.getElementById('registration-modal');
    if (!modalEl) return;
    const bootstrapInstance = window.bootstrap?.Modal?.getInstance?.(modalEl) || (window.bootstrap ? new window.bootstrap.Modal(modalEl) : null);
    if (bootstrapInstance) {
      bootstrapInstance.hide();
    } else {
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
    }
  }

  let priceLookupTimeout;
  function updatePriceField() {
    if (!els.hotelSelect || !els.roomNoInput || !els.priceInput) return;
    const hotelName = els.hotelSelect.value;
    const rawRoomNo = els.roomNoInput.value;
    const roomNo = normalizeRoomNo(rawRoomNo);
    if (roomNo !== rawRoomNo) {
      els.roomNoInput.value = roomNo;
    }
    clearRoomAvailabilityWarning();
    if (!hotelName || !roomNo) {
      els.priceInput.value = '';
      state.activeNightlyRate = null;
      state.activeRoomMeta = { roomType: '', roomClass: '' };
      syncRoomMetaFields();
      return;
    }

    const directoryRecord = getRoomDirectoryRecord(hotelName, roomNo);
    const directoryMeta = extractRoomMeta(directoryRecord || {});
    state.activeRoomMeta = {
      roomType: (directoryMeta.roomType || '').trim(),
      roomClass: (directoryMeta.roomClass || '').trim(),
    };
    syncRoomMetaFields();

    if (directoryRecord && isRoomTemporarilyUnavailable(directoryRecord)) {
      state.activeNightlyRate = null;
      updatePriceInputFromState();
      setRoomAvailabilityWarning('Temporarily unavailable');
      return;
    }

    const canonicalRoomNo = canonicalRoomId(roomNo);
    const currentBookingId = state.editingBookingId ? String(state.editingBookingId) : '';
    const { checkIn, checkOut } = getFormDateRange();
    const existingBooking = currentBookingId
      ? state.bookingsById.get(currentBookingId) || state.bookings.find((booking) => getBookingIdentifier(booking) === currentBookingId)
      : null;
    if (priceLookupTimeout) clearTimeout(priceLookupTimeout);
    priceLookupTimeout = setTimeout(async () => {
      try {
        const range = { checkIn: els.checkInInput?.value || state.dateRange.checkIn, checkOut: els.checkOutInput?.value || state.dateRange.checkOut };
        const availability = await ensureAvailabilityFor(hotelName, range);
        const match = availability.find((room) => canonicalRoomId(room.roomNo) === canonicalRoomNo);
        let nightlyRate = null;
        const baseMeta = {
          roomType: (directoryMeta.roomType || '').trim(),
          roomClass: (directoryMeta.roomClass || '').trim(),
        };
        let metaForRoom = { ...baseMeta };
        if (match) {
          nightlyRate = Number(match.pricePerNight) || null;
          const matchMeta = extractRoomMeta(match);
          if (matchMeta.roomType) metaForRoom.roomType = matchMeta.roomType;
          if (matchMeta.roomClass) metaForRoom.roomClass = matchMeta.roomClass;
        } else if (state.editingBookingId) {
          const editing = state.bookingsById.get(state.editingBookingId);
          if (editing && editing.hotelName === hotelName && canonicalRoomId(editing.roomNo) === canonicalRoomNo) {
            const editNights = calculateStayNights(editing.checkInDate, editing.checkOutDate) || 1;
            const derivedNightly = editNights > 0 ? Number(editing.price) / editNights : null;
            nightlyRate = Number.isFinite(derivedNightly) && derivedNightly > 0 ? derivedNightly : null;
            metaForRoom = {
              roomType: editing.roomType || editing.type || baseMeta.roomType || '',
              roomClass: editing.roomClass || editing.class || baseMeta.roomClass || '',
            };
          }
        }

        if ((!metaForRoom.roomType || !metaForRoom.roomClass) && existingBooking && canonicalRoomId(existingBooking.roomNo) === canonicalRoomNo) {
          const existingMeta = parseNotes(existingBooking.notes || existingBooking.notice);
          if (!metaForRoom.roomType) {
            metaForRoom.roomType = existingMeta.roomType || existingBooking.roomType || existingBooking.type || '';
          }
          if (!metaForRoom.roomClass) {
            metaForRoom.roomClass = existingMeta.roomClass || existingBooking.roomClass || existingBooking.class || '';
          }
        }
        state.activeNightlyRate = Number.isFinite(nightlyRate) && nightlyRate > 0 ? nightlyRate : null;
        updatePriceInputFromState();
        if (!match) {
          let derivedNightly = null;
          if (existingBooking && canonicalRoomId(existingBooking.roomNo) === canonicalRoomNo) {
            const nights = calculateStayNights(existingBooking.checkInDate, existingBooking.checkOutDate) || 1;
            if (Number.isFinite(Number(existingBooking.price)) && nights > 0) {
              derivedNightly = Number(existingBooking.price) / nights;
            }
          } else {
            const conflict = findBlockingBookingForRoom(hotelName, roomNo, checkIn, checkOut, currentBookingId);
            if (conflict && Number.isFinite(Number(conflict.price))) {
              const conflictNights = calculateStayNights(conflict.checkInDate, conflict.checkOutDate) || 1;
              if (conflictNights > 0) {
                derivedNightly = Number(conflict.price) / conflictNights;
              }
            }
          }
          if (Number.isFinite(derivedNightly) && derivedNightly > 0) {
            state.activeNightlyRate = Number(derivedNightly.toFixed(2));
            updatePriceInputFromState();
          }
        }

        state.activeRoomMeta = {
          roomType: (metaForRoom.roomType || '').trim(),
          roomClass: (metaForRoom.roomClass || '').trim(),
        };
        syncRoomMetaFields();
      } catch (err) {
        console.error('Failed to fetch room price', err);
        syncRoomMetaFields(state.activeRoomMeta);
      }
    }, 200);
  }

  function getFormDateRange() {
    const checkIn = els.checkInInput?.value || state.dateRange.checkIn;
    const checkOut = els.checkOutInput?.value || state.dateRange.checkOut;
    return { checkIn, checkOut };
  }

  function ensureRoomNoFeedback() {
    if (!els.roomNoInput) return null;
    let feedback = els.roomNoInput.parentElement?.querySelector('.room-no-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback room-no-feedback';
      feedback.textContent = '';
      els.roomNoInput.insertAdjacentElement('afterend', feedback);
    }
    return feedback;
  }

  function getBookingIdentifier(booking) {
    if (!booking) return '';
    const primary = booking?._id || booking?.id || booking?.bookingId || booking?.uuid;
    if (primary) return String(primary);
    return `${booking?.hotelName || 'booking'}-${booking?.roomNo || 'room'}-${booking?.checkInDate || ''}-${booking?.fullname || ''}`;
  }

  function findBlockingBookingForRoom(hotelName, roomNo, checkIn, checkOut, excludeBookingId) {
    const canonicalHotel = canonicalHotelName(hotelName);
    const canonicalRoom = canonicalRoomId(roomNo);
    if (!canonicalRoom) return null;
    return state.bookings.find((booking) => {
      if (!isBlockingStatus(booking?.status)) return false;
      const bookingId = getBookingIdentifier(booking);
      if (excludeBookingId && bookingId && bookingId === excludeBookingId) return false;
      const bookingHotel = canonicalHotelName(booking?.hotelName);
      if (canonicalHotel && bookingHotel && bookingHotel !== canonicalHotel) return false;
      if (canonicalRoomId(booking?.roomNo) !== canonicalRoom) return false;
      return hasDateOverlap(checkIn, checkOut, booking?.checkInDate, booking?.checkOutDate);
    }) || null;
  }

  function setRoomAvailabilityWarning(message) {
    if (!els.roomNoInput) return;
    const normalized = message ? String(message).trim() : '';
    if (normalized) {
      els.roomNoInput.setCustomValidity(normalized);
      els.roomNoInput.classList.add('is-invalid');
      const feedback = ensureRoomNoFeedback();
      if (feedback) feedback.textContent = normalized;
      state.roomAvailabilityWarning = normalized;
    } else {
      els.roomNoInput.setCustomValidity('');
      els.roomNoInput.classList.remove('is-invalid');
      const feedback = ensureRoomNoFeedback();
      if (feedback) feedback.textContent = '';
      state.roomAvailabilityWarning = '';
    }
  }

  function clearRoomAvailabilityWarning() {
    setRoomAvailabilityWarning('');
  }

  function validateRoomAvailability(shouldAlert = false) {
    if (!els.roomNoInput) return true;
    const hotelName = els.hotelSelect?.value || state.selectedHotel;
    let roomNo = els.roomNoInput.value || '';
    const normalizedRoom = normalizeRoomNo(roomNo);
    if (normalizedRoom !== roomNo) {
      roomNo = normalizedRoom;
      els.roomNoInput.value = normalizedRoom;
    }

    if (!hotelName || !normalizedRoom) {
      clearRoomAvailabilityWarning();
      return true;
    }

    const { checkIn, checkOut } = getFormDateRange();
    if (!checkIn || !checkOut) {
      clearRoomAvailabilityWarning();
      return true;
    }

    const excludeId = state.editingBookingId ? String(state.editingBookingId) : '';
    const directoryRecord = getRoomDirectoryRecord(hotelName, normalizedRoom);
    if (directoryRecord && isRoomTemporarilyUnavailable(directoryRecord)) {
      const message = 'Temporarily unavailable';
      setRoomAvailabilityWarning(message);
      updatePriceInputFromState();
      if (shouldAlert) {
        els.roomNoInput.reportValidity();
      }
      return false;
    }

    const conflict = findBlockingBookingForRoom(hotelName, normalizedRoom, checkIn, checkOut, excludeId);

    if (conflict) {
      const message = 'Already booked';
      setRoomAvailabilityWarning(message);
      updatePriceInputFromState();
      if (shouldAlert) {
        els.roomNoInput.reportValidity();
      }
      return false;
    }

    clearRoomAvailabilityWarning();
    updatePriceInputFromState();
    return true;
  }

  async function ensureAvailabilityFor(hotelName, range) {
    const key = buildAvailabilityKey(hotelName, range);
    if (!state.availabilityCache.has(key)) {
      await fetchAvailability(hotelName, range);
    }
    return state.availabilityCache.get(key) || [];
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // return next day's date string in YYYY-MM-DD (suitable for input[type=date].value)
  function nextDateString(yyyyMmDd) {
    const d = new Date(yyyyMmDd);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  function setDateInputMins() {
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    if (els.checkInInput) els.checkInInput.min = iso;
    if (els.checkOutInput) els.checkOutInput.min = nextDateString(iso);
    if (els.checkInFilter) els.checkInFilter.min = iso;
    if (els.checkOutFilter) els.checkOutFilter.min = nextDateString(iso);
  }

  // Add small inline MM/DD/YY display spans next to date inputs if not present
  function ensureDateDisplaySpans() {
    const inputs = [
      { input: els.checkInInput, name: 'checkInInput' },
      { input: els.checkOutInput, name: 'checkOutInput' },
    ];
    inputs.forEach(({ input, name }) => {
      if (!input) return;
      const id = `${name}-display`;
      if (!document.getElementById(id)) {
        const span = document.createElement('small');
        span.id = id;
        span.className = 'text-muted ms-2 date-display-small';
        span.style.fontSize = '0.9em';
        input.parentNode.appendChild(span);
      }
    });
  }

  function updateDateDisplays() {
    const map = [
      { input: els.checkInInput, id: 'checkInInput-display' },
      { input: els.checkOutInput, id: 'checkOutInput-display' },
    ];
    map.forEach(({ input, id }) => {
      const span = document.getElementById(id);
      if (!span || !input) return;
      if (!input.value) {
        span.textContent = '';
        return;
      }
      const d = new Date(input.value);
      if (Number.isNaN(d.getTime())) { span.textContent = ''; return; }
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      span.textContent = `${mm}/${dd}/${yy}`;
    });
  }

  const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return '—';
    return usdFormatter.format(amount);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function notifyError(message) {
    if (window.Swal) {
      window.Swal.fire('Error', message, 'error');
    } else {
      alert(message);
    }
  }

  function notifySuccess(message) {
    if (window.Swal) {
      window.Swal.fire('Success', message, 'success');
    } else {
      alert(message);
    }
  }

  async function confirmAction(message) {
    if (window.Swal?.fire) {
      const result = await window.Swal.fire({
        title: 'Cancel booking?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel it',
        cancelButtonText: 'No',
        reverseButtons: true,
        focusCancel: true,
      });
      return Boolean(result?.isConfirmed);
    }
    return window.confirm(message);
  }

  function toggleButtonLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
      if (!btn.dataset.originalContent) {
        btn.dataset.originalContent = btn.innerHTML;
      }
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Cancelling...
      `;
    } else {
      if (btn.dataset.originalContent) {
        btn.innerHTML = btn.dataset.originalContent;
        delete btn.dataset.originalContent;
      }
      btn.disabled = false;
    }
  }
})();
