document.addEventListener('DOMContentLoaded', () => {
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  const themeBtns = document.querySelectorAll('.theme-btn');
  
  function updateThemeUI(theme) {
    themeBtns.forEach(btn => {
      if (btn.getAttribute('data-theme-value') === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  chrome.storage.sync.get(['uiTheme'], (data) => {
    if (data.uiTheme) {
      applyTheme(data.uiTheme);
      updateThemeUI(data.uiTheme);
    }
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = btn.getAttribute('data-theme-value');
      applyTheme(theme);
      updateThemeUI(theme);
      chrome.storage.sync.set({ uiTheme: theme });
    });
  });

  const autoRedirectCheckbox = document.getElementById('autoRedirect');
  
  // Elements for custom select
  const customSelectWrapper = document.getElementById('customSelectWrapper');
  const selectTrigger = document.getElementById('selectTrigger');
  const customOptions = document.getElementById('customOptions');
  const selectedAccountDisplay = document.getElementById('selectedAccountDisplay');
  const accountIndexValue = document.getElementById('accountIndexValue');

  const serviceSelectInput = document.getElementById('serviceSelect');
  const serviceSelectWrapper = document.getElementById('serviceSelectWrapper');
  const serviceSelectTrigger = document.getElementById('serviceSelectTrigger');
  const serviceOptions = document.querySelectorAll('.service-option');
  const selectedServiceDisplay = document.getElementById('selectedServiceDisplay');
  
  const serviceIcons = {
    'drive': '../../assets/icons/drive.webp',
    'gemini': '../../assets/icons/gemini.png',
    'classroom': '../../assets/icons/classroom.png',
    'mail': '../../assets/icons/mail.webp',
    'meet': '../../assets/icons/meet.webp',
    'docs': '../../assets/icons/docs.webp'
  };
  let serviceAccounts = {
    drive: "0", gemini: "0", classroom: "0", mail: "0", meet: "0", docs: "0"
  };
  let currentService = serviceSelectInput ? serviceSelectInput.value : "drive";
  let cachedAccountsList = [];
  
  const syncAccountsBtn = document.getElementById('syncAccountsBtn');
  if (syncAccountsBtn) {
    syncAccountsBtn.addEventListener('click', () => {
      chrome.tabs.create({url: 'https://accounts.google.com/SignOutOptions?hl=id', active: false});
    });
  }
  
  // Toggle custom select open/close
  selectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    customSelectWrapper.classList.toggle('open');
    if (serviceSelectWrapper) serviceSelectWrapper.classList.remove('open');
  });

  if (serviceSelectTrigger) {
    serviceSelectTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      serviceSelectWrapper.classList.toggle('open');
      customSelectWrapper.classList.remove('open');
    });
  }

  // Close custom select when clicking outside
  document.addEventListener('click', (e) => {
    if (!customSelectWrapper.contains(e.target)) {
      customSelectWrapper.classList.remove('open');
    }
    if (serviceSelectWrapper && !serviceSelectWrapper.contains(e.target)) {
      serviceSelectWrapper.classList.remove('open');
    }
  });

  function updateServiceSelect(val) {
    if (!serviceSelectInput) return;
    serviceSelectInput.value = val;
    currentService = val;
    
    if (serviceOptions) {
      serviceOptions.forEach(o => o.classList.remove('selected'));
      const targetOpt = document.querySelector(`.service-option[data-value="${val}"]`);
      if (targetOpt) {
        targetOpt.classList.add('selected');
        const img = targetOpt.querySelector('img').src;
        const name = targetOpt.querySelector('.account-name').textContent;
        if (selectedServiceDisplay) {
          selectedServiceDisplay.innerHTML = `
            <img src="${img}" alt="${name}" class="service-icon">
            <span class="selected-text" style="font-weight: 500;">${name}</span>
          `;
        }
      }
    }
  }

  if (serviceOptions) {
    serviceOptions.forEach(opt => {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        const val = this.getAttribute('data-value');
        updateServiceSelect(val);
        serviceSelectWrapper.classList.remove('open');
        
        accountIndexValue.value = serviceAccounts[currentService];
        if (cachedAccountsList.length > 0) {
          processExtractedDOMAccounts(cachedAccountsList);
        } else {
          useFallbackAccounts();
        }
      });
    });
  }
  
  // 1. Dapatkan tab aktif untuk auto-select layanan
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs.length > 0 && serviceSelectInput) {
      try {
        const host = new URL(tabs[0].url).hostname;
        if (host === 'gemini.google.com') updateServiceSelect('gemini');
        else if (host === 'classroom.google.com') updateServiceSelect('classroom');
        else if (host === 'mail.google.com') updateServiceSelect('mail');
        else if (host === 'meet.google.com') updateServiceSelect('meet');
        else if (host === 'docs.google.com') updateServiceSelect('docs');
        else if (host === 'drive.google.com') updateServiceSelect('drive');
      } catch(e) {}
    }

    // 2. Muat pengaturan yang tersimpan
    chrome.storage.sync.get(['serviceAccounts', 'autoRedirectEnabled'], (data) => {
      if (data.serviceAccounts !== undefined) {
        serviceAccounts = { ...serviceAccounts, ...data.serviceAccounts };
      }
      
      if (serviceSelectInput) {
        accountIndexValue.value = serviceAccounts[currentService];
      }
      
      if (data.autoRedirectEnabled !== undefined) {
        autoRedirectCheckbox.checked = data.autoRedirectEnabled;
      } else {
        autoRedirectCheckbox.checked = true;
      }
      
      // 3. Deteksi akun Google yang sedang login
      fetchGoogleAccounts();
    });
  });

  function fetchGoogleAccounts() {
      // Sesuai permintaan, langsung deteksi ke link SignOutOptions karena paling akurat
      fetch('https://accounts.google.com/SignOutOptions')
      .then(res => res.text())
      .then(html => {
          let doc = new DOMParser().parseFromString(html, 'text/html');
          let accounts = [];
          
          let activeEmail = "";
          let activeName = "Akun Aktif";
          let activeAvatar = "default_avatar.png";
          let activeIndex = 0;
          
          let walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
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
                      accounts.push({index, email, name, avatarUrl});
                  }
              }
          }
          
          if (accounts.length > 0) {
              accounts.sort((a,b) => a.index - b.index);
              processExtractedDOMAccounts(accounts);
          } else {
              tryFetchFromStorage(); // Jika gagal karena alasan tertentu, coba baca storage
          }
      })
      .catch(err => {
          console.error("Gagal ambil dari SignOutOptions:", err);
          tryFetchFromStorage();
      });
  }

  function tryFetchFromStorage() {
      chrome.storage.local.get(['cachedGoogleAccounts'], (res) => {
          if (res.cachedGoogleAccounts && res.cachedGoogleAccounts.length > 0) {
              let domResult = res.cachedGoogleAccounts;
              domResult.sort((a,b) => a.index - b.index);
              processExtractedDOMAccounts(domResult);
          } else {
              useFallbackAccounts();
          }
      });
  }

  function processExtractedDOMAccounts(accounts) {
      cachedAccountsList = accounts;
      if (accounts.length === 0) return useFallbackAccounts();

      customOptions.innerHTML = '';
      let foundSelected = false;
      const currentSavedIndex = serviceAccounts[currentService];

      accounts.forEach((acc) => {
          const isSelected = (acc.index.toString() === currentSavedIndex.toString());
          if (isSelected) foundSelected = true;
          
          const optionHTML = `
            <div class="account-option ${isSelected ? 'selected' : ''}" data-value="${acc.index}">
              <img src="${acc.avatarUrl}" alt="Avatar" class="account-avatar">
              <div class="account-details">
                <span class="account-name">${acc.name}</span>
                <span class="account-email">${acc.email}</span>
              </div>
            </div>
          `;
          customOptions.insertAdjacentHTML('beforeend', optionHTML);
          
          if (isSelected) {
            updateSelectedDisplay(acc.name, acc.email, acc.index, acc.avatarUrl);
          }
      });
      
      if (!foundSelected && accounts.length > 0) {
          updateSelectedDisplay(accounts[0].name, accounts[0].email, accounts[0].index, accounts[0].avatarUrl);
          accountIndexValue.value = accounts[0].index.toString();
      }
      
      attachOptionListeners();
  }

  function attachOptionListeners() {
      // Gunakan customOptions.querySelectorAll agar tidak menimpa elemen service-option!
      customOptions.querySelectorAll('.account-option').forEach(opt => {
          // Hapus event listener lama dengan cloneNode jika diperlukan, atau hindari penambahan berulang
          // Karena isi customOptions selalu di-innerHTML = '', listener lama otomatis terhapus!
          opt.addEventListener('click', function() {
            customOptions.querySelectorAll('.account-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            
            const val = this.getAttribute('data-value');
            const img = this.querySelector('img').src;
            const name = this.querySelector('.account-name').textContent;
            const email = this.querySelector('.account-email').textContent;
            
            accountIndexValue.value = val;
            serviceAccounts[currentService] = val; // Simpan index akun untuk layanan ini saja
            
            selectedAccountDisplay.innerHTML = `
              <img src="${img}" alt="Avatar" class="account-avatar">
              <div class="account-details">
                <span class="account-name">${name}</span>
                <span class="account-email">${email}</span>
              </div>
            `;
            
            customSelectWrapper.classList.remove('open');
            saveAndApplySettings();
          });
      });
  }

  function processAccountData(text) {
    let cleanText = text;
    if (text.startsWith(")]}'")) {
      cleanText = text.replace(")]}'", "").trim();
    }
    
    try {
      const data = JSON.parse(cleanText);
      const accounts = data[1]; // Array data akun
      
      customOptions.innerHTML = '';
      
      if (accounts && accounts.length > 0) {
        cachedAccountsList = [];
        
        accounts.forEach((acc, arrayIndex) => {
          const email = acc[0];
          const authuserIndex = (typeof acc[1] === 'number') ? acc[1] : arrayIndex;
          const name = acc[2] || email;
          
          let avatarUrl = 'default_avatar.png'; 
          for (let i = 0; i < acc.length; i++) {
            if (typeof acc[i] === 'string' && acc[i].startsWith('https://')) {
              avatarUrl = acc[i];
              break;
            }
          }
          
          cachedAccountsList.push({index: authuserIndex, email: email, name: name, avatarUrl: avatarUrl});
        });
        
        processExtractedDOMAccounts(cachedAccountsList);
        
      } else {
        useFallbackAccounts();
      }
    } catch (e) {
      console.error("Gagal memproses data akun Google:", e);
      useFallbackAccounts();
    }
  }
  
  function updateSelectedDisplay(name, email, index, avatarUrl) {
     selectedAccountDisplay.innerHTML = `
        <img src="${avatarUrl}" alt="Avatar" class="account-avatar">
        <div class="account-details">
          <span class="account-name">${name}</span>
          <span class="account-email">${email}</span>
        </div>
      `;
  }
  
  function useFallbackAccounts() {
    customOptions.innerHTML = '';
    const defaultAvatar = 'default_avatar.png';
    let foundSelected = false;
    
    const currentSavedIndex = serviceAccounts[currentService];
    
    // Kurangi fallback menjadi maksimal 5 akun (0-4) agar tidak berlebihan seperti 10
    for(let i = 0; i < 5; i++) {
       const isSelected = (i.toString() === currentSavedIndex.toString());
       if (isSelected) foundSelected = true;
       
       const optionHTML = `
          <div class="account-option ${isSelected ? 'selected' : ''}" data-value="${i}">
            <img src="${defaultAvatar}" alt="Avatar" class="account-avatar">
            <div class="account-details">
              <span class="account-name">Akun ke-${i+1}</span>
              <span class="account-email">Index ${i}</span>
            </div>
          </div>
        `;
        customOptions.insertAdjacentHTML('beforeend', optionHTML);
        
        if (isSelected) {
            updateSelectedDisplay(`Akun ke-${i+1}`, `Index ${i}`, i, defaultAvatar);
        }
    }
    
    if (!foundSelected) {
       updateSelectedDisplay(`Akun ke-1`, `Index 0`, 0, defaultAvatar);
       accountIndexValue.value = "0";
    }
    
    attachOptionListeners();
  }

  // Event listener saat toggle diubah, otomatis terapkan setting juga
  autoRedirectCheckbox.addEventListener('change', () => {
    saveAndApplySettings();
  });

  // Fungsi untuk menyimpan pengaturan dan menerapkan redirect
  function saveAndApplySettings() {
    const autoRedirectEnabled = autoRedirectCheckbox.checked;

    chrome.storage.sync.set({
      serviceAccounts: serviceAccounts,
      autoRedirectEnabled: autoRedirectEnabled
    }, () => {
      
      // Update tab yang sedang terbuka
      if (autoRedirectEnabled) {
        const queryUrls = [
          "*://drive.google.com/*", 
          "*://gemini.google.com/*",
          "*://classroom.google.com/*",
          "*://mail.google.com/*",
          "*://meet.google.com/*",
          "*://docs.google.com/*"
        ];
        chrome.tabs.query({url: queryUrls}, function(tabs) {
          tabs.forEach(tab => {
            try {
              const urlObj = new URL(tab.url);
              let newUrl = tab.url;
              let shouldRedirect = false;
              let accountIndex = "0";
              
              if (urlObj.hostname === 'drive.google.com') {
                accountIndex = serviceAccounts.drive || "0";
                if (urlObj.pathname.includes('/u/')) {
                   newUrl = newUrl.replace(/\/u\/\d+\//, `/u/${accountIndex}/`);
                   shouldRedirect = true;
                } else if (urlObj.searchParams.has('authuser')) {
                   urlObj.searchParams.set('authuser', accountIndex);
                   newUrl = urlObj.toString();
                   shouldRedirect = true;
                } else {
                  if (urlObj.pathname.startsWith('/drive/folders/')) {
                    newUrl = newUrl.replace('/drive/folders/', `/drive/u/${accountIndex}/folders/`);
                    shouldRedirect = true;
                  } else if (urlObj.pathname.startsWith('/drive/my-drive')) {
                    newUrl = newUrl.replace('/drive/my-drive', `/drive/u/${accountIndex}/my-drive`);
                    shouldRedirect = true;
                  } else if (urlObj.pathname.startsWith('/file/d/') || urlObj.pathname.startsWith('/open')) {
                    urlObj.searchParams.set('authuser', accountIndex);
                    newUrl = urlObj.toString();
                    shouldRedirect = true;
                  }
                }
              } 
              else if (urlObj.hostname === 'gemini.google.com' || urlObj.hostname === 'classroom.google.com') {
                const svc = urlObj.hostname === 'gemini.google.com' ? 'gemini' : 'classroom';
                accountIndex = serviceAccounts[svc] || "0";
                if (urlObj.pathname.includes('/u/')) {
                   newUrl = newUrl.replace(/\/u\/\d+\//, `/u/${accountIndex}/`);
                   shouldRedirect = true;
                } else {
                   newUrl = `${urlObj.origin}/u/${accountIndex}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
                   shouldRedirect = true;
                }
              }
              else if (urlObj.hostname === 'mail.google.com') {
                accountIndex = serviceAccounts.mail || "0";
                if (urlObj.pathname.includes('/u/')) {
                   newUrl = newUrl.replace(/\/u\/\d+\//, `/u/${accountIndex}/`);
                   shouldRedirect = true;
                } else if (urlObj.pathname.startsWith('/mail/')) {
                   newUrl = newUrl.replace('/mail/', `/mail/u/${accountIndex}/`);
                   shouldRedirect = true;
                } else {
                   urlObj.searchParams.set('authuser', accountIndex);
                   newUrl = urlObj.toString();
                   shouldRedirect = true;
                }
              }
              else if (urlObj.hostname === 'meet.google.com') {
                accountIndex = serviceAccounts.meet || "0";
                if (urlObj.pathname.includes('/u/')) {
                   newUrl = newUrl.replace(/\/u\/\d+\//, `/u/${accountIndex}/`);
                   shouldRedirect = true;
                } else {
                   urlObj.searchParams.set('authuser', accountIndex);
                   newUrl = urlObj.toString();
                   shouldRedirect = true;
                }
              }
              else if (urlObj.hostname === 'docs.google.com') {
                accountIndex = serviceAccounts.docs || "0";
                if (urlObj.pathname.includes('/u/')) {
                   newUrl = newUrl.replace(/\/u\/\d+\//, `/u/${accountIndex}/`);
                   shouldRedirect = true;
                } else if (urlObj.searchParams.has('authuser')) {
                   urlObj.searchParams.set('authuser', accountIndex);
                   newUrl = urlObj.toString();
                   shouldRedirect = true;
                } else {
                   urlObj.searchParams.set('authuser', accountIndex);
                   newUrl = urlObj.toString();
                   shouldRedirect = true;
                }
              }
              
              if (shouldRedirect && newUrl !== tab.url) {
                chrome.tabs.update(tab.id, { url: newUrl });
              }
            } catch (e) {
              console.error("Gagal update tab", e);
            }
          });
        });
      }
    });
  } // <-- End of saveAndApplySettings

  // Dengarkan perubahan pada storage lokal agar popup otomatis ter-refresh setelah sinkronisasi!
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.cachedGoogleAccounts) {
      if (changes.cachedGoogleAccounts.newValue && changes.cachedGoogleAccounts.newValue.length > 0) {
        cachedAccountsList = changes.cachedGoogleAccounts.newValue;
        // Re-render ulang daftarnya langsung!
        processExtractedDOMAccounts(cachedAccountsList);
        
        // Tampilkan notifikasi kecil bahwa sinkronisasi sukses
        const status = document.getElementById('status');
        if (status) {
          status.textContent = "Data akun berhasil disinkronkan!";
          status.style.opacity = 1;
          setTimeout(() => { status.style.opacity = 0; }, 3000);
        }
      }
    }
  });
});
