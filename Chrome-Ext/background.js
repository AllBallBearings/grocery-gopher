chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addItemsToCart") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.startsWith("https://www.harristeeter.com")) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content.js"]
        }, () => {
          // After script is injected, send the items list
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "processGroceryList",
            items: request.items
          });
        });
      } else {
        console.error("Not on Harris Teeter website or no active tab found.");
        // Optionally, notify the popup
        // sendResponse({status: "error", message: "Please navigate to HarrisTeeter.com"});
      }
    });
    return true; // Indicates you wish to send a response asynchronously
  }
});