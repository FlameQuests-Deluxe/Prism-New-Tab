document.addEventListener('DOMContentLoaded', () => {
  const containerButtonsDiv = document.getElementById('container-buttons');
  const settingsIcon = document.getElementById('settings-icon');
  const homeIcon = document.getElementById('home-icon');
  const optionsPage = document.getElementById('options-page');
  const form = document.getElementById('container-urls');
  const saveButton = document.getElementById('save');
  const backgroundTypeInputs = document.querySelectorAll('input[name="backgroundType"]');
  const localImageInput = document.getElementById('localImage');
  const chooseLocalImageButton = document.getElementById('chooseLocalImage');
  const refreshContainersButton = document.getElementById('refresh-containers');

  // Set background image
  setBackgroundFromStorage();

  // Load containers and check for mapped URLs
  loadContainersAndUrls();

  // Add click event listener to the settings icon
  settingsIcon.addEventListener('click', showOptionsPage);

  // Add click event listener to the home icon
  homeIcon.addEventListener('click', showHomePage);

  // Toggle local image option visibility and update background immediately
  backgroundTypeInputs.forEach(input => {
    input.addEventListener('change', (event) => {
      const newBackgroundType = event.target.value;
      toggleLocalImageOption(newBackgroundType);
      updateBackgroundImmediately(newBackgroundType);
    });
  });

  // Handle local image selection
  chooseLocalImageButton.addEventListener('click', () => {
    localImageInput.click();
  });

  localImageInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
      chooseLocalImageButton.textContent = 'Change Local Image';
      updateLocalImageImmediately(event.target.files[0]);
    }
  });

  // Save settings
  saveButton.addEventListener('click', saveSettings);

  // Refresh containers
  refreshContainersButton.addEventListener('click', refreshContainers);

  function checkForMappedUrls(containerUrls) {
    // Check if there are any non-empty, non-about:blank URLs mapped
    return Object.values(containerUrls).some(url => url && url !== 'about:blank');
  }

  function showOptionsPage() {
    containerButtonsDiv.style.display = 'none';
    optionsPage.style.display = 'block';
    settingsIcon.style.display = 'none';
    homeIcon.style.display = 'block';
    loadContainersAndUrls();
  }

  function showHomePage() {
    containerButtonsDiv.style.display = 'flex';
    optionsPage.style.display = 'none';
    settingsIcon.style.display = 'block';
    homeIcon.style.display = 'none';
    loadContainersAndUrls();
  }

  function loadContainersAndUrls() {
    browser.storage.local.get(['containers', 'containerUrls', 'backgroundType', 'localImagePath']).then((result) => {
      const containers = result.containers || [];
      const containerUrls = result.containerUrls || {};
      const backgroundType = result.backgroundType || 'photo';
      const localImagePath = result.localImagePath || '';

      // Check if there are any mapped URLs
      const hasMappedUrls = checkForMappedUrls(containerUrls);

      if (!hasMappedUrls) {
        // Show configuration message if no URLs are mapped
        containerButtonsDiv.innerHTML = `
          <div class="first-time-notice">
            Configure your custom new tab by clicking on the settings button at the bottom right
          </div>
        `;
      } else {
        // Create container buttons for mapped URLs
        containerButtonsDiv.innerHTML = '';
        createContainerButtons(containers, containerUrls);
      }

      // Clear and create form inputs
      form.innerHTML = '';
      createContainerUrlInputs(containers, containerUrls);

      // Set the saved background type
      document.querySelector(`input[name="backgroundType"][value="${backgroundType}"]`).checked = true;

      // Show/hide local image button based on selected background type
      toggleLocalImageOption(backgroundType);

      if (localImagePath) {
        chooseLocalImageButton.textContent = 'Change Local Image';
      }
    });
  }

  // Rest of the code remains the same...
  function createContainerButtons(containers, containerUrls) {
    // Group containers by URL
    const groupedContainers = {};
    containers.forEach(container => {
      const url = containerUrls[container.cookieStoreId] || '';
      // Only add containers that have a URL mapped (exclude empty and about:blank)
      if (url && url !== 'about:blank') {
        if (!groupedContainers[url]) {
          groupedContainers[url] = [];
        }
        groupedContainers[url].push(container);
      }
    });

    // Create buttons for each group
    Object.entries(groupedContainers).forEach(([url, containerGroup]) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'container-group';

      // Create favicon container
      const faviconContainer = document.createElement('div');
      faviconContainer.className = 'favicon-container';
      const favicon = document.createElement('img');
      favicon.src = getFaviconUrl(url);
      favicon.alt = `${url} favicon`;
      favicon.onload = () => {
        const primaryColor = getPrimaryColor(favicon);
        containerGroup.forEach(container => {
          const button = document.querySelector(`button[data-cookie-store-id="${container.cookieStoreId}"]`);
          if (button) {
            button.style.backgroundColor = primaryColor;
          }
        });
      };
      faviconContainer.appendChild(favicon);
      faviconContainer.onclick = () => openAllContainerTabs(containerGroup, url);
      groupDiv.appendChild(faviconContainer);

      // Create buttons for each container in the group
      containerGroup.forEach(container => {
        const button = createContainerButton(container, url);
        groupDiv.appendChild(button);
      });

      containerButtonsDiv.appendChild(groupDiv);
    });
  }

  function createContainerUrlInputs(containers, containerUrls) {
    containers.forEach(container => {
      const div = document.createElement('div');
      div.className = 'container-url-input';
      div.innerHTML = `
        <label for="${container.cookieStoreId}">${container.name}:</label>
        <input type="url" id="${container.cookieStoreId}" name="${container.cookieStoreId}" 
               value="${containerUrls[container.cookieStoreId] || ''}">
      `;
      form.appendChild(div);
    });
  }

  function createContainerButton(container, url) {
    const button = document.createElement('button');
    button.textContent = container.name;
    button.className = 'container-button';
    button.dataset.cookieStoreId = container.cookieStoreId;
    button.dataset.url = url;
    button.onclick = openInContainerAndReplacePage;
    return button;
  }

  function getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
      console.error('Invalid URL:', url);
      return '';
    }
  }

  function getPrimaryColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Only consider non-transparent pixels
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    
    if (count > 0) {
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      return `rgb(${r},${g},${b})`;
    }
    
    return 'rgb(128,128,128)'; // Default to gray if no color is found
  }

  function openInContainerAndReplacePage(event) {
    const cookieStoreId = event.target.dataset.cookieStoreId;
    const url = event.target.dataset.url;
    
    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
      const currentTab = tabs[0];
      
      browser.tabs.create({
        url: url,
        cookieStoreId: cookieStoreId,
        index: currentTab.index
      }).then((newTab) => {
        browser.tabs.remove(currentTab.id);
        console.log(`Opened new tab in container with cookieStoreId: ${cookieStoreId} and URL: ${url}`);
      }).catch((error) => {
        console.error(`Error opening new tab: ${error}`);
      });
    });
  }

  function openAllContainerTabs(containerGroup, url) {
    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
      const currentTab = tabs[0];
      
      containerGroup.forEach((container, index) => {
        browser.tabs.create({
          url: url,
          cookieStoreId: container.cookieStoreId,
          index: currentTab.index + index + 1
        }).then((newTab) => {
          console.log(`Opened new tab in container with cookieStoreId: ${container.cookieStoreId} and URL: ${url}`);
        }).catch((error) => {
          console.error(`Error opening new tab: ${error}`);
        });
      });
      
      browser.tabs.remove(currentTab.id);
    });
  }

  function toggleLocalImageOption(backgroundType) {
    if (backgroundType === 'local') {
      chooseLocalImageButton.style.display = 'inline-block';
    } else {
      chooseLocalImageButton.style.display = 'none';
    }
  }

  function updateBackgroundImmediately(newBackgroundType) {
    browser.storage.local.set({ backgroundType: newBackgroundType }).then(() => {
      browser.runtime.sendMessage({ action: 'updateBackground', backgroundType: newBackgroundType });
      setBackgroundFromStorage();
    });
  }

  function updateLocalImageImmediately(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const localImagePath = e.target.result;
      browser.storage.local.set({ localImagePath }).then(() => {
        browser.runtime.sendMessage({ action: 'updateBackground', backgroundType: 'local', localImagePath });
        setBackgroundFromStorage();
      });
    };
    reader.readAsDataURL(file);
  }

  function saveSettings() {
    const containerUrls = {};
    const inputs = form.querySelectorAll('input[type="url"]');
    inputs.forEach(input => {
      containerUrls[input.id] = input.value;
    });

    const backgroundType = document.querySelector('input[name="backgroundType"]:checked').value;

    browser.storage.local.set({ containerUrls, backgroundType }).then(() => {
      alert('Settings saved');
      showHomePage();
    });
  }

  function refreshContainers() {
    refreshContainersButton.classList.add('loading');
    browser.runtime.sendMessage({ action: 'updateContainerList' }).then(() => {
      loadContainersAndUrls();
      refreshContainersButton.classList.remove('loading');
    });
  }

  function setBackgroundFromStorage() {
    browser.storage.local.get(['currentBackground', 'backgroundType']).then((result) => {
      if (result.currentBackground) {
        if (result.backgroundType === 'local') {
          setZoomedBackground(result.currentBackground);
        } else {
          setZoomedBackground(result.currentBackground);
        }
      }
    });
  }

  function setZoomedBackground(imageUrl) {
    const body = document.body;
    body.style.backgroundImage = `url('${imageUrl}')`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundRepeat = 'no-repeat';
  }
});