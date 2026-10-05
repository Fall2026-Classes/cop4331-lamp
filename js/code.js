// ============================================================
//  js/code.js — COP 4331 Contacts Manager
//  Talks to the PHP API under /api (see api/swagger for docs).
// ============================================================

const API_BASE =
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('najoalan'))
    ? '/api'
    : 'https://contacts.najoalan.xyz/api';

// Client-side minimum only. The API does not enforce a length.
const MIN_PASSWORD_LENGTH = 6;

let userId = 0;
let firstName = '';
let lastName = '';
let isAdmin = false;


// ============================================================
//  Small helpers
// ============================================================

function setResult(elementId, message, kind) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = 'result' + (kind ? ' ' + kind : '');
  el.textContent = message;
}

// Escape user-supplied text before putting it in innerHTML.
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// An admin can disable an account mid-session. Every endpoint then returns 403,
// so the session is dead and the only sensible move is to sign the user out.
function handleDisabledAccount() {
  clearSession();
  try {
    window.sessionStorage.setItem(
      'signOutReason', 'This account has been disabled by an administrator.');
  } catch (e) { /* storage unavailable, fall through to a plain redirect */ }
  window.location.href = 'index.html';
}

// Every request goes through here so auth headers stay consistent.
function apiRequest(method, path, body, onSuccess, onError) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, API_BASE + path, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

  if (userId > 0) {
    xhr.setRequestHeader('Authorization', 'Bearer ' + userId);
    xhr.setRequestHeader('X-User-Id', userId);
  }

  xhr.onreadystatechange = function () {
    if (this.readyState !== 4) return;

    let payload = {};
    try {
      payload = JSON.parse(xhr.responseText || '{}');
    } catch (e) {
      payload = {};
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      onSuccess(payload, xhr.status);
      return;
    }

    // 403 from requireEnabledUser() means this account was switched off.
    if (xhr.status === 403 && userId > 0) {
      handleDisabledAccount();
      return;
    }

    if (onError) {
      onError(payload.error || 'Request failed (HTTP ' + xhr.status + ')', xhr.status);
    }
  };

  try {
    xhr.send(body ? JSON.stringify(body) : null);
  } catch (err) {
    if (onError) onError(err.message, 0);
  }
}


// ============================================================
//  Login page
// ============================================================

function initLoginPage() {
  let reason = '';
  try {
    reason = window.sessionStorage.getItem('signOutReason') || '';
    window.sessionStorage.removeItem('signOutReason');
  } catch (e) { /* ignore */ }

  if (reason) setResult('loginResult', reason, 'fail');
}

function showPanel(which) {
  const login = document.getElementById('loginDiv');
  const register = document.getElementById('registerDiv');
  if (!login || !register) return;
  login.style.display = (which === 'login') ? '' : 'none';
  register.style.display = (which === 'register') ? '' : 'none';
}

function doLogin() {
  userId = 0;
  firstName = '';
  lastName = '';

  const login = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value;

  setResult('loginResult', '', '');

  if (!login || !password) {
    setResult('loginResult', 'Enter a username and password.', 'warn');
    return;
  }

  setResult('loginResult', 'Authenticating...', 'ok');

  apiRequest('POST', '/auth/login', { login: login, password: password },
    function (data) {
      userId = parseInt(data.id, 10) || 0;

      if (userId < 1) {
        setResult('loginResult', 'Username and password do not match.', 'fail');
        return;
      }

      firstName = data.firstName || '';
      lastName = data.lastName || '';
      saveCookie();
      window.location.href = 'contacts.html';
    },
    function (message, status) {
      if (status === 403) {
        // Disabled account: the API's own wording is the clearest thing to show.
        setResult('loginResult', message || 'This account has been disabled.', 'fail');
      } else if (status === 401) {
        setResult('loginResult', 'Username and password do not match.', 'fail');
      } else {
        setResult('loginResult', message, 'fail');
      }
    }
  );
}

function doRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const first = document.getElementById('regFirstName').value.trim();
  const last = document.getElementById('regLastName').value.trim();

  if (!username || !password) {
    setResult('registerResult', 'A username and password are required.', 'warn');
    return;
  }

  setResult('registerResult', 'Creating account...', 'ok');

  apiRequest('POST', '/auth/register',
    { username: username, password: password, first_name: first, last_name: last },
    function () {
      setResult('registerResult', 'Account created. Sign in to continue.', 'ok');
      document.getElementById('registerForm').reset();
      setTimeout(function () {
        showPanel('login');
        document.getElementById('loginName').value = username;
        document.getElementById('loginPassword').focus();
      }, 900);
    },
    function (message) {
      setResult('registerResult', message, 'fail');
    }
  );
}


// ============================================================
//  Session cookie
// ============================================================

function saveCookie() {
  const minutes = 20;
  const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
  const path = ';expires=' + expires + ';path=/';

  document.cookie = 'firstName=' + encodeURIComponent(firstName) + path;
  document.cookie = 'lastName=' + encodeURIComponent(lastName) + path;
  document.cookie = 'userId=' + userId + path;
}

// Parses the session cookie. Redirects to the login page and returns false
// when there is no usable session.
function readCookie() {
  userId = 0;
  firstName = '';
  lastName = '';

  document.cookie.split(';').forEach(function (pair) {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();

    if (key === 'firstName') firstName = decodeURIComponent(val);
    else if (key === 'lastName') lastName = decodeURIComponent(val);
    else if (key === 'userId') userId = parseInt(val, 10) || 0;
  });

  if (userId < 1) {
    window.location.href = 'index.html';
    return false;
  }

  const nameEl = document.getElementById('userName');
  if (nameEl) {
    const display = (firstName + ' ' + lastName).trim() || 'user #' + userId;
    nameEl.innerHTML = 'Logged in as <strong>' + esc(display) + '</strong>';
  }

  return true;
}

function clearSession() {
  const expired = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = 'firstName' + expired;
  document.cookie = 'lastName' + expired;
  document.cookie = 'userId' + expired;

  userId = 0;
  firstName = '';
  lastName = '';
  isAdmin = false;
}

function doLogout() {
  clearSession();
  window.location.href = 'index.html';
}


// ============================================================
//  Page initialisers
// ============================================================

function initContactsPage() {
  if (!readCookie()) return;
  loadContacts();
  checkAdminAccess(function (admin) {
    const link = document.getElementById('adminLink');
    if (link && admin) link.style.display = '';
  });
}

function initAdminPage() {
  if (!readCookie()) return;
  loadUsers();
}

// login.php does not return the user's role, so the only way to tell whether
// this account is an admin is to ask an admin-only endpoint and read the status.
// 200 = admin, 401 = standard user.
function checkAdminAccess(callback) {
  apiRequest('GET', '/users/getAllUsers', null,
    function () {
      isAdmin = true;
      callback(true);
    },
    function (message, status) {
      isAdmin = false;
      callback(false, status);
    }
  );
}


// ============================================================
//  Contacts: read
// ============================================================

function loadContacts() {
  apiRequest('GET', '/contacts/getAllContacts', null,
    function (data) {
      renderContacts(data.contacts || []);
      setResult('searchResult', '', '');
    },
    function (message) {
      renderContacts([]);
      setResult('searchResult', message, 'fail');
    }
  );
}

function searchContacts() {
  const term = document.getElementById('searchText').value.trim();

  if (!term) {
    loadContacts();
    return;
  }

  apiRequest('GET', '/contacts/getContactsByQuery?q=' + encodeURIComponent(term), null,
    function (data) {
      const rows = data.contacts || [];
      renderContacts(rows);
      setResult('searchResult',
        rows.length + (rows.length === 1 ? ' match' : ' matches') + ' for "' + term + '"',
        'ok');
    },
    function (message) {
      renderContacts([]);
      setResult('searchResult', message, 'fail');
    }
  );
}

function clearSearch() {
  document.getElementById('searchText').value = '';
  loadContacts();
}

function renderContacts(contacts) {
  const tbody = document.getElementById('contactList');
  const counter = document.getElementById('contactCount');
  if (!tbody) return;

  if (counter) {
    counter.textContent = contacts.length + (contacts.length === 1 ? ' row' : ' rows');
  }

  if (contacts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No contacts yet. Add one below.</td></tr>';
    return;
  }

  let html = '';
  contacts.forEach(function (c) {
    html +=
      '<tr>' +
        '<td>' + esc(c.firstName) + '</td>' +
        '<td>' + esc(c.lastName) + '</td>' +
        '<td>' + esc(c.email) + '</td>' +
        '<td>' + esc(c.phone) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="ghost" onclick="startEdit(' + c.id + ');">EDIT</button>' +
          '<button type="button" class="danger" onclick="deleteContact(' + c.id + ');">DELETE</button>' +
        '</div></td>' +
      '</tr>';
  });

  tbody.innerHTML = html;
}


// ============================================================
//  Contacts: create / update / delete
// ============================================================

function submitContact() {
  const editingId = document.getElementById('editingId').value;

  const payload = {
    first_name: document.getElementById('contactFirstName').value.trim(),
    last_name:  document.getElementById('contactLastName').value.trim(),
    email:      document.getElementById('contactEmail').value.trim(),
    phone:      document.getElementById('contactPhone').value.trim()
  };

  if (!payload.first_name) {
    setResult('contactResult', 'A first name is required.', 'warn');
    return;
  }
  if (!payload.phone) {
    setResult('contactResult', 'A phone number is required.', 'warn');
    return;
  }

  if (editingId) {
    apiRequest('PUT', '/contacts/updateContactById?id=' + encodeURIComponent(editingId), payload,
      function () {
        setResult('contactResult', 'Contact updated.', 'ok');
        cancelEdit();
        loadContacts();
      },
      function (message) {
        setResult('contactResult', message, 'fail');
      }
    );
  } else {
    apiRequest('POST', '/contacts/createContact', payload,
      function () {
        setResult('contactResult', 'Contact added.', 'ok');
        document.getElementById('contactForm').reset();
        document.getElementById('editingId').value = '';
        loadContacts();
      },
      function (message) {
        setResult('contactResult', message, 'fail');
      }
    );
  }
}

function startEdit(id) {
  apiRequest('GET', '/contacts/getContactById?id=' + encodeURIComponent(id), null,
    function (c) {
      document.getElementById('editingId').value = c.id;
      document.getElementById('contactFirstName').value = c.firstName || '';
      document.getElementById('contactLastName').value = c.lastName || '';
      document.getElementById('contactEmail').value = c.email || '';
      document.getElementById('contactPhone').value = c.phone || '';

      document.getElementById('formHeading').textContent = 'Edit contact';
      document.getElementById('formMode').textContent = 'UPDATE Contacts SET ...';
      document.getElementById('submitContactButton').textContent = 'UPDATE CONTACT';
      document.getElementById('cancelEditButton').style.display = '';

      setResult('contactResult', '', '');
      document.getElementById('contactFirstName').focus();
      document.getElementById('contactForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    function (message) {
      setResult('contactResult', message, 'fail');
    }
  );
}

function cancelEdit() {
  document.getElementById('contactForm').reset();
  document.getElementById('editingId').value = '';
  document.getElementById('formHeading').textContent = 'Add a contact';
  document.getElementById('formMode').textContent = 'INSERT INTO Contacts';
  document.getElementById('submitContactButton').textContent = 'SAVE CONTACT';
  document.getElementById('cancelEditButton').style.display = 'none';
}

function deleteContact(id) {
  if (!window.confirm('Delete this contact? This cannot be undone.')) return;

  apiRequest('DELETE', '/contacts/deleteContactById?id=' + encodeURIComponent(id), null,
    function () {
      setResult('contactResult', 'Contact deleted.', 'ok');
      loadContacts();
    },
    function (message) {
      setResult('contactResult', message, 'fail');
    }
  );
}


// ============================================================
//  Admin: user list
// ============================================================

function loadUsers() {
  apiRequest('GET', '/users/getAllUsers', null,
    function (data) {
      isAdmin = true;
      document.getElementById('adminPanel').style.display = '';
      document.getElementById('notAdminNotice').style.display = 'none';
      renderUsers(data.users || []);
      setResult('userResult', '', '');
    },
    function (message, status) {
      if (status === 401) {
        // Signed in, but not an administrator.
        isAdmin = false;
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('resetPanel').style.display = 'none';
        document.getElementById('notAdminNotice').style.display = '';
        return;
      }
      document.getElementById('adminPanel').style.display = '';
      renderUsers([]);
      setResult('userResult', message, 'fail');
    }
  );
}

function renderUsers(users) {
  const tbody = document.getElementById('userList');
  const counter = document.getElementById('userCount');
  if (!tbody) return;

  if (counter) {
    counter.textContent = users.length + (users.length === 1 ? ' user' : ' users');
  }

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No users found.</td></tr>';
    return;
  }

  let html = '';
  users.forEach(function (u) {
    const name = ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || '&mdash;';
    const enabled = Number(u.isEnabled) === 1;
    const admin = String(u.role) === 'admin';
    const self = u.isSelf === true;

    const statusBadge = enabled
      ? '<span class="badge on">ENABLED</span>'
      : '<span class="badge off">DISABLED</span>';

    const roleBadge = '<span class="badge role' + (admin ? ' admin' : '') + '">' +
      esc(String(u.role || 'user').toUpperCase()) + '</span>';

    // The API refuses to change your own status, so the button is locked here too.
    const toggleLabel = enabled ? 'DISABLE' : 'ENABLE';
    const toggleClass = enabled ? 'danger' : 'ghost';
    const toggle = self
      ? '<button type="button" class="ghost" disabled>' + toggleLabel + '</button>'
      : '<button type="button" class="' + toggleClass + '" onclick="toggleUserStatus(' +
        u.id + ', ' + (enabled ? 0 : 1) + ');">' + toggleLabel + '</button>';

    html +=
      '<tr' + (self ? ' class="is-self"' : '') + '>' +
        '<td>' + esc(name) + (self ? '<span class="self-tag">YOU</span>' : '') + '</td>' +
        '<td>' + esc(u.login) + '</td>' +
        '<td>' + roleBadge + '</td>' +
        '<td>' + esc(u.contactCount) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><div class="row-actions">' +
          toggle +
          '<button type="button" class="ghost" onclick="startPasswordReset(' + u.id +
            ', \'' + esc(u.login).replace(/'/g, "\\'") + '\');">RESET PW</button>' +
        '</div></td>' +
      '</tr>';
  });

  tbody.innerHTML = html;
}


// ============================================================
//  Admin: enable / disable an account
// ============================================================

function toggleUserStatus(id, nextValue) {
  const turningOff = Number(nextValue) === 0;

  if (turningOff && !window.confirm(
      'Disable this account? The user will be signed out and blocked from ' +
      'logging in until the account is enabled again. Their contacts are kept.')) {
    return;
  }

  apiRequest('PUT', '/users/updateUserStatusById?id=' + encodeURIComponent(id),
    { isEnabled: nextValue },
    function (data) {
      setResult('userResult', data.message || 'Status updated.', 'ok');
      loadUsers();
    },
    function (message) {
      setResult('userResult', message, 'fail');
    }
  );
}


// ============================================================
//  Admin: reset another user's password
// ============================================================

function startPasswordReset(id, login) {
  document.getElementById('resetUserId').value = id;
  document.getElementById('resetHeading').textContent =
    'Set a new password for ' + login;
  document.getElementById('resetPanel').style.display = '';
  document.getElementById('resetForm').reset();
  document.getElementById('resetUserId').value = id;

  setResult('resetResult', '', '');
  document.getElementById('newPassword').focus();
  document.getElementById('resetPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelPasswordReset() {
  document.getElementById('resetForm').reset();
  document.getElementById('resetUserId').value = '';
  document.getElementById('resetPanel').style.display = 'none';
  setResult('resetResult', '', '');
}

function submitPasswordReset() {
  const id = document.getElementById('resetUserId').value;
  const password = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  if (!id) {
    setResult('resetResult', 'No user selected.', 'warn');
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    setResult('resetResult',
      'Use at least ' + MIN_PASSWORD_LENGTH + ' characters.', 'warn');
    return;
  }
  if (password !== confirm) {
    setResult('resetResult', 'The two passwords do not match.', 'warn');
    return;
  }

  setResult('resetResult', 'Saving...', 'ok');

  apiRequest('PUT', '/auth/changePassword?id=' + encodeURIComponent(id),
    { password: password },
    function () {
      setResult('userResult', 'Password updated.', 'ok');
      cancelPasswordReset();
    },
    function (message) {
      setResult('resetResult', message, 'fail');
    }
  );
}


// ============================================================
//  Background: Matrix digital rain
// ============================================================

(function () {
  const canvas = document.getElementById('rain');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const glyphs = ('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
                  '0123456789ABCDEFXYZ$+-*/=<>').split('');
  const fontSize = 16;
  let drops = [];
  let raf = null;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const columns = Math.ceil(window.innerWidth / fontSize);
    drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -60;
    }
  }

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.font = fontSize + 'px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';

    for (let i = 0; i < drops.length; i++) {
      const ch = glyphs[(Math.random() * glyphs.length) | 0];
      const y = drops[i] * fontSize;

      ctx.fillStyle = Math.random() > 0.94 ? '#d8ffe2' : '#00b32e';
      ctx.fillText(ch, i * fontSize, y);

      if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 0.55;
    }
    raf = requestAnimationFrame(draw);
  }

  function still() {
    ctx.font = fontSize + 'px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 120, 30, 0.3)';
    for (let x = 0; x < window.innerWidth; x += fontSize) {
      for (let y = 0; y < window.innerHeight; y += fontSize * 1.4) {
        if (Math.random() > 0.84) {
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
        }
      }
    }
  }

  function start() {
    resize();
    if (reduced) still(); else draw();
  }

  start();

  window.addEventListener('resize', function () {
    if (raf) cancelAnimationFrame(raf);
    start();
  });
})();
