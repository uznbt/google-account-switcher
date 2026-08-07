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
                let avatarUrl = img ? img.src : "default_avatar.png";

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

const observer = new MutationObserver(() => {
    scanAccounts();
});
observer.observe(document.body, { childList: true, subtree: true });

scanAccounts();
