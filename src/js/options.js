document.addEventListener('DOMContentLoaded', () => {
  
  const servicesList = [
    { id: 'drive', name: 'Google Drive', icon: '../../assets/icons/drive.webp' },
    { id: 'docs', name: 'Google Docs', icon: '../../assets/icons/docs.webp' },
    { id: 'mail', name: 'Gmail', icon: '../../assets/icons/mail.webp' },
    { id: 'meet', name: 'Google Meet', icon: '../../assets/icons/meet.webp' },
    { id: 'classroom', name: 'Google Classroom', icon: '../../assets/icons/classroom.png' },
    { id: 'gemini', name: 'Google Gemini', icon: '../../assets/icons/gemini.png' }
  ];

  let serviceAccounts = {
    drive: "0", gemini: "0", classroom: "0", mail: "0", meet: "0", docs: "0"
  };
  let cachedAccountsList = [];

  // Theme Management
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

  // Settings
  const autoRedirectCheckbox = document.getElementById('autoRedirect');
  const servicesGrid = document.getElementById('servicesGrid');
  const accountsGrid = document.getElementById('accountsGrid');
  const serviceCardTemplate = document.getElementById('serviceCardTemplate');
  
  // Initialize Data
  chrome.storage.sync.get(['serviceAccounts', 'autoRedirectEnabled'], (data) => {
    if (data.serviceAccounts) {
      serviceAccounts = { ...serviceAccounts, ...data.serviceAccounts };
    }
    autoRedirectCheckbox.checked = data.autoRedirectEnabled !== false; // default true
    
    // Fetch local accounts
    chrome.storage.local.get(['cachedGoogleAccounts'], (res) => {
      if (res.cachedGoogleAccounts && res.cachedGoogleAccounts.length > 0) {
        cachedAccountsList = res.cachedGoogleAccounts.sort((a,b) => a.index - b.index);
      } else {
        // Fallback
        for(let i = 0; i < 5; i++) {
           cachedAccountsList.push({
             index: i,
             email: `Index ${i}`,
             name: `Akun ke-${i+1}`,
             avatarUrl: '../../assets/images/default_avatar.png'
           });
        }
      }
      
      renderServices();
      renderAccountsGrid();
    });
  });

  function saveSettings() {
    chrome.storage.sync.set({
      serviceAccounts: serviceAccounts,
      autoRedirectEnabled: autoRedirectCheckbox.checked
    });
  }

  autoRedirectCheckbox.addEventListener('change', saveSettings);

  function renderServices() {
    servicesGrid.innerHTML = '';
    
    servicesList.forEach(service => {
      const clone = serviceCardTemplate.content.cloneNode(true);
      const card = clone.querySelector('.service-card');
      
      // Set service info
      card.querySelector('.service-icon').src = service.icon;
      card.querySelector('.service-name').textContent = service.name;
      
      // Setup Custom Select
      const selectWrapper = card.querySelector('.custom-select');
      const trigger = card.querySelector('.select-trigger');
      const optionsContainer = card.querySelector('.custom-options');
      const selectedDisplay = card.querySelector('.selected-display');
      
      const currentIndex = serviceAccounts[service.id];
      let selectedAcc = cachedAccountsList.find(acc => acc.index.toString() === currentIndex.toString());
      if (!selectedAcc && cachedAccountsList.length > 0) selectedAcc = cachedAccountsList[0];
      
      if (selectedAcc) {
        updateDisplay(selectedDisplay, selectedAcc);
      }

      // Populate options
      cachedAccountsList.forEach(acc => {
        const isSelected = (selectedAcc && acc.index === selectedAcc.index);
        const optHtml = `
          <div class="account-option ${isSelected ? 'selected' : ''}" data-value="${acc.index}">
             <img src="${acc.avatarUrl}" alt="Avatar" class="avatar">
             <div class="details">
               <span class="name">${acc.name}</span>
               <span class="email">${acc.email}</span>
             </div>
          </div>
        `;
        optionsContainer.insertAdjacentHTML('beforeend', optHtml);
      });
      
      // Event Listeners for Select
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close others
        document.querySelectorAll('.custom-select.open').forEach(el => {
          if (el !== selectWrapper) el.classList.remove('open');
        });
        selectWrapper.classList.toggle('open');
      });
      
      optionsContainer.querySelectorAll('.account-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          // Update selected visual
          optionsContainer.querySelectorAll('.account-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          
          const val = opt.getAttribute('data-value');
          serviceAccounts[service.id] = val;
          saveSettings();
          
          const acc = cachedAccountsList.find(a => a.index.toString() === val);
          if (acc) updateDisplay(selectedDisplay, acc);
          
          selectWrapper.classList.remove('open');
        });
      });
      
      servicesGrid.appendChild(clone);
    });
  }
  
  function updateDisplay(displayEl, account) {
    displayEl.querySelector('.avatar').src = account.avatarUrl;
    displayEl.querySelector('.name').textContent = account.name;
    // We could add email if space permits, but keeping it simple for trigger
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
  });

  function renderAccountsGrid() {
    accountsGrid.innerHTML = '';
    cachedAccountsList.forEach(acc => {
      const card = document.createElement('div');
      card.className = 'account-card';
      card.innerHTML = `
        <img src="${acc.avatarUrl}" alt="Avatar">
        <div class="details">
          <span class="name">${acc.name}</span>
          <span class="email">${acc.email}</span>
        </div>
      `;
      accountsGrid.appendChild(card);
    });
  }

  // Sync Button
  document.getElementById('syncAccountsBtn').addEventListener('click', () => {
    chrome.tabs.create({url: 'https://accounts.google.com/SignOutOptions?hl=id', active: true});
  });

  // Listen for storage changes from background or popup
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.cachedGoogleAccounts) {
      cachedAccountsList = changes.cachedGoogleAccounts.newValue.sort((a,b) => a.index - b.index);
      renderServices();
      renderAccountsGrid();
    }
    if (namespace === 'sync' && changes.serviceAccounts) {
      serviceAccounts = { ...serviceAccounts, ...changes.serviceAccounts.newValue };
      renderServices(); // update dropdown visuals
    }
  });

});
