browser.runtime.onInstalled.addListener(() => {
  updateContainerList();
  setRandomBackground();
  setUninstallURL();
});

browser.runtime.onStartup.addListener(() => {
  setRandomBackground();
  setUninstallURL();
});

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateBackground') {
    if (message.backgroundType === 'local' && message.localImagePath) {
      browser.storage.local.set({ currentBackground: message.localImagePath });
    } else {
      setRandomBackground(message.backgroundType);
    }
  }
});

// Add this new function to set the uninstall URL
function setUninstallURL() {
  browser.runtime.setUninstallURL("https://prismnewtabfeedback.netlify.app/");
}

function updateContainerList() {
  browser.contextualIdentities.query({}).then(
    (containers) => {
      let containerList = containers.map(container => ({
        cookieStoreId: container.cookieStoreId,
        name: container.name,
        color: container.color,
        icon: container.icon
      }));
      browser.storage.local.get('containerUrls').then((result) => {
        const containerUrls = result.containerUrls || {};
        browser.storage.local.set({ containers: containerList, containerUrls: containerUrls });
      });
    },
    (error) => console.error(`Error: ${error}`)
  );
}

function setRandomBackground(backgroundType) {
  browser.storage.local.get(['backgroundType', 'localImagePath']).then((result) => {
    const currentBackgroundType = backgroundType || result.backgroundType || 'photo';
    if (currentBackgroundType === 'local' && result.localImagePath) {
      browser.storage.local.set({ currentBackground: result.localImagePath });
    } else {
      const images = currentBackgroundType === 'abstract' 
        ? ['abstract1.avif', 'abstract2.avif', 'abstract3.avif', 'abstract4.avif', 'abstract5.avif', 'abstract6.avif', 'abstract7.avif', 'abstract8.avif']
        : ['photo1.avif', 'photo2.avif', 'photo3.avif', 'photo4.avif', 'photo5.avif'];
      
      const randomImage = images[Math.floor(Math.random() * images.length)];
      browser.storage.local.set({ currentBackground: randomImage });
    }
  });
}