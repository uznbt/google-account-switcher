// Hanya handle navigasi utama (main frame)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  try {
    const urlObj = new URL(details.url);
    
    const supportedHosts = ['drive.google.com', 'gemini.google.com', 'classroom.google.com', 'mail.google.com', 'meet.google.com', 'docs.google.com'];
    
    // Cek apakah URL tersebut didukung
    if (supportedHosts.includes(urlObj.hostname)) {
      
      // Jangan redirect jika sudah ada index akun (/u/X/) atau parameter authuser
      if (!urlObj.pathname.includes('/u/') && !urlObj.searchParams.has('authuser')) {
        
        chrome.storage.sync.get(['serviceAccounts', 'autoRedirectEnabled'], (data) => {
          const autoRedirectEnabled = data.autoRedirectEnabled !== undefined ? data.autoRedirectEnabled : true;
          
          let serviceAccounts = data.serviceAccounts || {
            drive: "3", gemini: "3", classroom: "3", mail: "3", meet: "3", docs: "3"
          };
          
          if (autoRedirectEnabled) {
            let newUrl = details.url;
            let shouldRedirect = false;
            let accountIndex = "3";
            
            if (urlObj.hostname === 'drive.google.com') {
              accountIndex = serviceAccounts.drive || "3";
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
            else if (urlObj.hostname === 'gemini.google.com') {
              accountIndex = serviceAccounts.gemini || "3";
              newUrl = `${urlObj.origin}/u/${accountIndex}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
              shouldRedirect = true;
            }
            else if (urlObj.hostname === 'classroom.google.com') {
              accountIndex = serviceAccounts.classroom || "3";
              newUrl = `${urlObj.origin}/u/${accountIndex}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
              shouldRedirect = true;
            }
            else if (urlObj.hostname === 'mail.google.com') {
              accountIndex = serviceAccounts.mail || "3";
              if (urlObj.pathname.startsWith('/mail/')) {
                newUrl = newUrl.replace('/mail/', `/mail/u/${accountIndex}/`);
                shouldRedirect = true;
              } else {
                urlObj.searchParams.set('authuser', accountIndex);
                newUrl = urlObj.toString();
                shouldRedirect = true;
              }
            }
            else if (urlObj.hostname === 'meet.google.com') {
              accountIndex = serviceAccounts.meet || "3";
              urlObj.searchParams.set('authuser', accountIndex);
              newUrl = urlObj.toString();
              shouldRedirect = true;
            }
            else if (urlObj.hostname === 'docs.google.com') {
              accountIndex = serviceAccounts.docs || "3";
              urlObj.searchParams.set('authuser', accountIndex);
              newUrl = urlObj.toString();
              shouldRedirect = true;
            }
            
            if (shouldRedirect) {
              chrome.tabs.update(details.tabId, { url: newUrl });
            }
          }
        });
      }
    }
  } catch (e) {
    console.error("Error processing URL in Extension", e);
  }
});

// Listener untuk pesan dari popup atau content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchGoogleAccounts") {
    fetch('https://accounts.google.com/ListAccounts?list_account_names=true', {
      credentials: 'include'
    })
    .then(res => res.text())
    .then(text => sendResponse({success: true, data: text}))
    .catch(err => sendResponse({success: false, error: err.toString()}));
    
    return true; // Indicates async response
  }
  
  if (request.action === "closeCurrentTab" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});
