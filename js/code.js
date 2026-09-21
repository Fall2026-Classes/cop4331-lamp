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

let userId = 0;
let firstName = '';
let lastName = '';


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
    } else if (onError) {
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
      if (status === 401) {
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
    return;
  }

  const nameEl = document.getElementById('userName');
  if (nameEl) {
    const display = (firstName + ' ' + lastName).trim() || 'user #' + userId;
    nameEl.innerHTML = 'Logged in as <strong>' + esc(display) + '</strong>';
  }

  loadContacts();
}

function doLogout() {
  const expired = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = 'firstName' + expired;
  document.cookie = 'lastName' + expired;
  document.cookie = 'userId' + expired;

  userId = 0;
  firstName = '';
  lastName = '';
  window.location.href = 'index.html';
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
//  Contacts: create / update
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


// ============================================================
//  Contacts: delete
// ============================================================

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
