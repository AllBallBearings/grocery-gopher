document.getElementById('addToCartBtn').addEventListener('click', () => {
  const groceryListText = document.getElementById('groceryList').value;
  const items = groceryListText.split('\n').map(item => item.trim()).filter(item => item !== '');
  const statusDiv = document.getElementById('status');

  if (items.length === 0) {
    statusDiv.textContent = 'Please enter some items.';
    return;
  }

  statusDiv.textContent = 'Processing...';

  // Send items to the background script
  chrome.runtime.sendMessage({ action: "addItemsToCart", items: items }, response => {
    if (chrome.runtime.lastError) {
        statusDiv.textContent = 'Error communicating with background: ' + chrome.runtime.lastError.message;
        console.error(chrome.runtime.lastError.message);
    } else if (response && response.status === "error") {
        statusDiv.textContent = response.message;
    } else if (response && response.status === "success") {
        statusDiv.textContent = "Items sent to be processed.";
    }
    // You might get more detailed feedback from content.js if you set up more listeners
  });
});

// Listen for status updates from content script (optional, more advanced)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updatePopupStatus") {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = request.message;
    }
});