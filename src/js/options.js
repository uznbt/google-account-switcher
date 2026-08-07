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
  const autoFallbackCheckbox = document.getElementById('autoFallback');
  const servicesGrid = document.getElementById('servicesGrid');
  const accountsGrid = document.getElementById('accountsGrid');
  const serviceCardTemplate = document.getElementById('serviceCardTemplate');

  // Custom Rules DOM
  const newRuleUrlInput = document.getElementById('newRuleUrl');
  const newRuleAccountSelect = document.getElementById('newRuleAccountSelect');
  const newRuleAccountOptions = document.getElementById('newRuleAccountOptions');
  const newRuleSelectedDisplay = document.getElementById('newRuleSelectedDisplay');
  const newRuleAccountIndex = document.getElementById('newRuleAccountIndex');
  const addRuleBtn = document.getElementById('addRuleBtn');
  const rulesList = document.getElementById('rulesList');
  let customLinkRules = [];
  
  // Initialize Data
  chrome.storage.sync.get(['serviceAccounts', 'autoRedirectEnabled', 'autoFallbackEnabled', 'customLinkRules'], (data) => {
    if (data.serviceAccounts) {
      serviceAccounts = { ...serviceAccounts, ...data.serviceAccounts };
    }
    if (data.customLinkRules) {
      customLinkRules = data.customLinkRules;
    }
    autoRedirectCheckbox.checked = data.autoRedirectEnabled !== false; // default true
    
    if (autoFallbackCheckbox) {
      autoFallbackCheckbox.checked = data.autoFallbackEnabled !== false; // default true
      autoFallbackCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ autoFallbackEnabled: autoFallbackCheckbox.checked });
      });
    }
    
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
      renderNewRuleOptions();
      renderRules();
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

  // --- Custom Rules Logic ---
  if (newRuleAccountSelect) {
    newRuleAccountSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select.open').forEach(el => {
        if (el !== newRuleAccountSelect) el.classList.remove('open');
      });
      newRuleAccountSelect.classList.toggle('open');
    });
  }

  function renderNewRuleOptions() {
    if (!newRuleAccountOptions) return;
    newRuleAccountOptions.innerHTML = '';
    cachedAccountsList.forEach(acc => {
      const opt = document.createElement('div');
      opt.className = 'account-option';
      opt.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer;";
      opt.innerHTML = `
        <img src="${acc.avatarUrl}" alt="Avatar" class="avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
        <div class="details" style="display: flex; flex-direction: column;">
          <span class="name" style="font-size: 14px; font-weight: 500;">${acc.name}</span>
        </div>
      `;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        newRuleAccountIndex.value = acc.index;
        updateDisplay(newRuleSelectedDisplay, acc);
        newRuleAccountSelect.classList.remove('open');
      });
      opt.addEventListener('mouseover', () => opt.style.background = 'var(--hover-bg)');
      opt.addEventListener('mouseout', () => opt.style.background = 'transparent');
      newRuleAccountOptions.appendChild(opt);
    });
    
    if (cachedAccountsList.length > 0 && newRuleAccountIndex) {
      newRuleAccountIndex.value = cachedAccountsList[0].index;
      updateDisplay(newRuleSelectedDisplay, cachedAccountsList[0]);
    }
  }

  if (addRuleBtn) {
    addRuleBtn.addEventListener('click', () => {
      const url = newRuleUrlInput.value.trim();
      const accountIndex = newRuleAccountIndex.value;
      
      if (!url || !accountIndex) return;
      
      customLinkRules.push({ url, accountIndex, id: Date.now().toString() });
      chrome.storage.sync.set({ customLinkRules }, () => {
        newRuleUrlInput.value = '';
        renderRules();
      });
    });
  }

  function renderRules() {
    if (!rulesList) return;
    if (customLinkRules.length === 0) {
      rulesList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px;">Belum ada aturan tautan khusus.</div>';
      return;
    }
    
    rulesList.innerHTML = '';
    customLinkRules.forEach(rule => {
      const acc = cachedAccountsList.find(a => a.index.toString() === rule.accountIndex.toString());
      const accountName = acc ? acc.name : `Akun ke-${parseInt(rule.accountIndex)+1}`;
      
      const item = document.createElement('div');
      item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--hover-bg); border: 1px solid var(--border-color); border-radius: 8px;";
      
      item.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; padding-right: 12px;">
          <strong style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${rule.url}">${rule.url}</strong>
          <span style="font-size: 13px; color: var(--text-muted);">Dibuka dengan: ${accountName}</span>
        </div>
        <button class="delete-rule-btn" data-id="${rule.id}" title="Hapus Aturan" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s;">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;
      
      const delBtn = item.querySelector('.delete-rule-btn');
      delBtn.addEventListener('mouseover', () => delBtn.style.background = '#fee2e2');
      delBtn.addEventListener('mouseout', () => delBtn.style.background = 'none');
      delBtn.addEventListener('click', () => {
        customLinkRules = customLinkRules.filter(r => r.id !== rule.id);
        chrome.storage.sync.set({ customLinkRules }, renderRules);
      });
      
      rulesList.appendChild(item);
    });
  }

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
    if (namespace === 'sync') {
      if (changes.serviceAccounts) {
        serviceAccounts = { ...serviceAccounts, ...changes.serviceAccounts.newValue };
        renderServices();
      }
      if (changes.customLinkRules) {
        customLinkRules = changes.customLinkRules.newValue;
        renderRules();
      }
    }
  });

});
