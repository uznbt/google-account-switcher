function scanAccounts() {
  // 1. Jika script ini berjalan di dalam iframe SignOutOptions, ambil daftar akun dari DOM-nya!
  if (window.location.hostname === 'accounts.google.com' && window.location.pathname === '/SignOutOptions') {
    let accounts = [];
    let activeIndex = 0;

    let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      let text = node.nodeValue.trim();
      if (text.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        let email = text;
        let container = node.parentElement.closest('a, div, li') || node.parentElement;

        let href = container.getAttribute('href') || (container.querySelector('a') ? container.querySelector('a').getAttribute('href') : "");
        let authMatch = href ? href.match(/authuser=(\d+)/) : null;
        let index = authMatch ? parseInt(authMatch[1]) : accounts.length;

        let img = container.querySelector('img');
        let avatarUrl = img ? img.src : chrome.runtime.getURL('assets/images/default_avatar.png');

        let name = "Akun " + index;
        let nameLines = [];
        let nameWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let nNode;
        while (nNode = nameWalker.nextNode()) {
          let nt = nNode.nodeValue.trim();
          if (nt && nt !== email && nt.length > 1 && !nt.toLowerCase().includes('sembunyikan') && !nt.toLowerCase().includes('kelola') && !nt.toLowerCase().includes('ubah') && !nt.toLowerCase().includes('tambahkan')) {
            nameLines.push(nt);
          }
        }
        if (nameLines.length > 0) name = nameLines[nameLines.length - 1];

        if (!accounts.find(acc => acc.email === email)) {
          accounts.push({ index, email, name, avatarUrl });
        }
      }
    }

    if (accounts.length > 0) {
      accounts.sort((a, b) => a.index - b.index);
      chrome.storage.local.set({ cachedGoogleAccounts: accounts }, () => {
        // Sesuai permintaan, langsung tutup tab otomatis setelah sukses tersimpan
        chrome.runtime.sendMessage({ action: "closeCurrentTab" });
      });
    }
    return; // Selesai!
  }

  // 2. Jika kita berada di halaman Google utama (misal Drive), buat iframe tersembunyi ke SignOutOptions
  // Ini akan memicu eksekusi blok kode di atas untuk mengambil akun
  if (window === window.top && window.location.hostname.includes('google.com')) {
    if (!document.getElementById('hidden-account-scraper')) {
      let iframe = document.createElement('iframe');
      iframe.id = 'hidden-account-scraper';
      iframe.src = 'https://accounts.google.com/SignOutOptions';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
  }
}

chrome.storage.sync.get(['masterSwitchEnabled'], (data) => {
  if (data.masterSwitchEnabled === false) return; // Ekstensi mati

  const observer = new MutationObserver(() => {
    scanAccounts();
    if (!window.hasSentFallbackMessage) {
      checkForAccessDenied();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  scanAccounts();
  checkForAccessDenied();
});

function checkForAccessDenied() {
  if (window.location.hostname === 'accounts.google.com') return;

  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();
  const url = window.location.href;

  const isAccessDenied =
    url.includes('requestaccess') ||
    title.includes('memerlukan akses') ||
    title.includes('you need access') ||
    title.includes('minta akses') ||
    title.includes('request access') ||
    bodyText.includes('anda memerlukan akses') ||
    bodyText.includes('you need access') ||
    bodyText.includes('minta akses') ||
    bodyText.includes('request access');

  if (isAccessDenied) {
    if (window.hasSentFallbackMessage) return;
    window.hasSentFallbackMessage = true;

    chrome.runtime.sendMessage({
      action: "triggerAutoFallback",
      url: window.location.href
    });
  }
}

// --- Auto-Mute Google Meet Logic ---
function autoMuteMeet() {
  if (window.location.hostname !== 'meet.google.com') return;
  // Pastikan kita ada di URL ruangan (misal /abc-defg-hij), bukan di beranda
  if (window.location.pathname.length < 5) return;

  chrome.storage.sync.get(['autoMuteMicEnabled', 'autoMuteCamEnabled'], (data) => {
    const muteMic = data.autoMuteMicEnabled !== false;
    const muteCam = data.autoMuteCamEnabled !== false;

    if (!muteMic && !muteCam) return;

    let micMuted = !muteMic;
    let camMuted = !muteCam;
    let attempts = 0;

    // Cek setiap 500ms selama maksimal 15 detik
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        return;
      }

      if (!micMuted) {
        // Deteksi lewat teks aria-label (Turn off, Matikan, Nonaktifkan) ATAU lewat data-is-muted="false"
        const micBtn = document.querySelector('[aria-label*="turn off microphone" i], [aria-label*="matikan mikrofon" i], [aria-label*="nonaktifkan mikrofon" i], [data-tooltip*="turn off microphone" i], [data-tooltip*="matikan mikrofon" i], [data-tooltip*="nonaktifkan mikrofon" i], div[role="button"][data-is-muted="false"][aria-label*="mikrofon" i], div[role="button"][data-is-muted="false"][aria-label*="microphone" i]');
        if (micBtn) {
          micBtn.click();
          micMuted = true;
          console.log("[Account Switcher] Mikrofon berhasil dimatikan otomatis.");
        }
      }

      if (!camMuted) {
        const camBtn = document.querySelector('[aria-label*="turn off camera" i], [aria-label*="matikan kamera" i], [aria-label*="nonaktifkan kamera" i], [data-tooltip*="turn off camera" i], [data-tooltip*="matikan kamera" i], [data-tooltip*="nonaktifkan kamera" i], div[role="button"][data-is-muted="false"][aria-label*="kamera" i], div[role="button"][data-is-muted="false"][aria-label*="camera" i]');
        if (camBtn) {
          camBtn.click();
          camMuted = true;
          console.log("[Account Switcher] Kamera berhasil dimatikan otomatis.");
        }
      }

      if (micMuted && camMuted) {
        clearInterval(interval);
      }
    }, 500);
  });
}

// --- Auto-Mute Zoom Logic ---
function autoMuteZoom() {
  if (!window.location.hostname.includes('zoom.us')) return;

  chrome.storage.sync.get(['autoMuteMicEnabled', 'autoMuteCamEnabled'], (data) => {
    const muteMic = data.autoMuteMicEnabled !== false;
    const muteCam = data.autoMuteCamEnabled !== false;

    if (!muteMic && !muteCam) return;

    let micMuted = !muteMic;
    let camMuted = !muteCam;
    let attempts = 0;

    // Zoom web client loading takes time. Check every 1000ms up to 20 seconds
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 20) {
        clearInterval(interval);
        return;
      }

      // Deteksi tombol Mute & Video Zoom (Cari button dengan kata 'mute' atau 'video' yang belum dicoret)
      // Zoom Web biasanya menggunakan class spesifik atau aria-label
      if (!micMuted) {
        const micBtn = document.querySelector('button[aria-label*="mute my audio" i], button[aria-label*="bisukan audio saya" i], button.join-audio-container__btn');
        if (micBtn && !micBtn.classList.contains('is-muted')) {
          micBtn.click();
          micMuted = true;
          console.log("[Account Switcher] Mikrofon Zoom berhasil dimatikan otomatis.");
        }
      }

      if (!camMuted) {
        const camBtn = document.querySelector('button[aria-label*="stop video" i], button[aria-label*="hentikan video" i], button.join-video-container__btn');
        if (camBtn && !camBtn.classList.contains('is-muted')) {
          camBtn.click();
          camMuted = true;
          console.log("[Account Switcher] Kamera Zoom berhasil dimatikan otomatis.");
        }
      }

      if (micMuted && camMuted) {
        clearInterval(interval);
      }
    }, 1000);
  });
}

// Panggil fungsi
chrome.storage.sync.get(['masterSwitchEnabled'], (data) => {
  if (data.masterSwitchEnabled === false) return; // Ekstensi mati

  autoMuteMeet();
  autoMuteZoom();
  initFormSaver();
});
// --- Penyelamat Google Form (Auto-Save Drafts) ---
function initFormSaver() {
  if (window.location.hostname !== 'docs.google.com' || !window.location.pathname.includes('/forms/')) return;
  // Hanya aktif di halaman pengisian form
  if (!window.location.pathname.endsWith('/viewform') && !window.location.pathname.endsWith('/formResponse')) return;

  chrome.storage.sync.get(['autoSaveFormEnabled'], (data) => {
    if (data.autoSaveFormEnabled !== true) return;

    // Ambil ID Form dari URL
    const formIdMatch = window.location.pathname.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/) || window.location.pathname.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (!formIdMatch) return;

    const formId = formIdMatch[1];
    const storageKey = `gform_draft_${formId}`;
    let isRestoring = false;
    let localDraft = {};

    chrome.storage.local.get([storageKey], (res) => {
      localDraft = res[storageKey] || {};

      // Jika ada di halaman selesai/terkirim, hapus drafnya!
      if (window.location.pathname.endsWith('/formResponse') || document.body.innerText.toLowerCase().includes('telah direkam') || document.body.innerText.toLowerCase().includes('has been recorded')) {
        chrome.storage.local.remove([storageKey]);
        return;
      }

      // Jika ada draft, tampilkan Toast UI
      if (Object.keys(localDraft).length > 0) {
        showDraftToast(storageKey, localDraft);
      }

      // Mulai polling pencatatan (setiap 2 detik agar tidak memberatkan browser)
      setInterval(() => {
        if (isRestoring) return;
        let changed = false;

        document.querySelectorAll('input[name^="entry."], textarea[name^="entry."]').forEach(el => {
          if (el.type === 'radio') {
            if (el.checked && localDraft[el.name] !== el.value) {
              localDraft[el.name] = el.value;
              changed = true;
            }
          } else if (el.type === 'checkbox') {
            if (!localDraft[el.name] || !Array.isArray(localDraft[el.name])) localDraft[el.name] = [];
            const arr = localDraft[el.name];
            if (el.checked && !arr.includes(el.value)) {
              arr.push(el.value);
              changed = true;
            } else if (!el.checked && arr.includes(el.value)) {
              localDraft[el.name] = arr.filter(v => v !== el.value);
              changed = true;
            }
          } else {
            if (el.value && localDraft[el.name] !== el.value) {
              localDraft[el.name] = el.value;
              changed = true;
            }
          }
        });

        if (changed) {
          chrome.storage.local.set({ [storageKey]: localDraft });
        }
      }, 2000);
    });

    function restoreDraft(draftData) {
      isRestoring = true;
      document.querySelectorAll('input[name^="entry."], textarea[name^="entry."]').forEach(el => {
        const savedVal = draftData[el.name];
        if (savedVal === undefined || savedVal === null) return;

        if (el.type === 'radio') {
          if (el.value === savedVal && !el.checked) {
            el.click(); // Klik menyimulasikan user click sehingga Google Forms memperbarui UI-nya
          }
        } else if (el.type === 'checkbox') {
          if (Array.isArray(savedVal) && savedVal.includes(el.value) && !el.checked) {
            el.click();
          } else if (Array.isArray(savedVal) && !savedVal.includes(el.value) && el.checked) {
            el.click();
          }
        } else {
          if (el.value !== savedVal) {
            el.value = savedVal;
            // Trigger event agar form sadar ada inputan baru
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            // Focus-blur untuk memperbaiki label mengambang (floating label) ala Material UI
            el.dispatchEvent(new Event('focus', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }
        }
      });
      setTimeout(() => isRestoring = false, 1500);
    }

    function showDraftToast(storageKey, draftData) {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: #333;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        border: 1px solid #555;
        z-index: 999999;
        font-family: sans-serif;
        display: flex;
        align-items: center;
        gap: 16px;
        animation: slideIn 0.3s ease-out;
      `;

      const animStyle = document.createElement('style');
      animStyle.textContent = `@keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
      document.head.appendChild(animStyle);

      toast.innerHTML = `
        <div>
          <strong style="display: block; font-size: 14px; margin-bottom: 4px;">Draf Ditemukan 🛡️</strong>
          <span style="font-size: 13px; opacity: 0.9;">Ekstensi menyimpan jawabanmu sebelumnya.</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="gas-restore-btn" style="background: #4285f4; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;">Pulihkan</button>
          <button id="gas-discard-btn" style="background: transparent; color: #ff8a80; border: 1px solid #ff8a80; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;">Hapus</button>
        </div>
      `;

      document.body.appendChild(toast);

      document.getElementById('gas-restore-btn').addEventListener('click', () => {
        restoreDraft(draftData);
        toast.remove();
      });

      document.getElementById('gas-discard-btn').addEventListener('click', () => {
        chrome.storage.local.remove([storageKey]);
        localDraft = {}; // Reset in memory too
        toast.remove();
      });
    }
  });
}
