// content.js

// Helper function to introduce delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to wait for an element to be available
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const intervalTime = 100;
    let elapsedTime = 0;
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
      elapsedTime += intervalTime;
      if (elapsedTime >= timeout) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }
    }, intervalTime);
  });
}

async function processItem(item) {
  console.log(`Processing: ${item}`);
  // Optional: Send status back to popup
  chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `Searching for ${item}...` });


  try {
    const searchInput = await waitForElement('input#SearchBar-input');
    const searchForm = searchInput.closest('form'); // Assuming input is inside the form

    if (!searchForm) {
        console.error("Search form not found!");
        chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `Error: Search form not found for ${item}.` });
        return;
    }

    searchInput.value = item;
    // Simulate input event to trigger any JavaScript listeners on the page
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true })); // Some sites might need 'change'

    await delay(500); // Small delay for the site to react to input

    // Submit the form
    // Harris Teeter seems to use a button click for search, not just form submission
    const searchButton = await waitForElement('button[aria-label="search"]', 5000);
    if (searchButton) {
        searchButton.click();
    } else {
        // Fallback to form submission if button not found or specific logic needed
        // searchForm.submit(); // This might not work if the site relies on JS for search
        console.warn("Search button not explicitly found, relying on input change + potential auto-search or manual click if form.submit() is not effective.");
    }


    // Wait for search results to load. This is tricky.
    // We'll wait for the product grid container to potentially update.
    // A more robust way would be to detect a network request completion or a specific loading spinner disappearing.
    await delay(3000); // Crude delay, needs improvement

    // Find the first product card. This is a simplification.
    // You'd ideally iterate through product cards and find the best match.
    const productCards = document.querySelectorAll('div[data-testid^="product-card-"]');
    if (productCards.length === 0) {
      console.log(`No product cards found for "${item}".`);
      chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `No results for ${item}.` });
      return;
    }

    // Let's try to find the most relevant product card.
    // For now, we'll take the first one that seems to be a primary product.
    // A more advanced approach would be to check the product title more closely.
    let targetCard = null;
    for (const card of productCards) {
        const descriptionElement = card.querySelector('span[data-testid="cart-page-item-description"]');
        if (descriptionElement && descriptionElement.textContent.toLowerCase().includes(item.split(' ')[0].toLowerCase())) { // Basic check
            targetCard = card;
            break;
        }
    }
    
    if (!targetCard) {
        targetCard = productCards[0]; // Default to the first card if no better match
        console.warn(`Could not find a highly relevant card for "${item}", using the first result.`);
    }


    if (targetCard) {
      const addToCartButton = targetCard.querySelector('button[data-testid="kds-QuantityStepper-ctaButton"]');
      if (addToCartButton) {
        const productName = targetCard.querySelector('span[data-testid="cart-page-item-description"]')?.textContent || 'Unknown Product';
        console.log(`Found "${productName}", attempting to add to cart.`);
        chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `Adding ${productName} to cart...` });

        addToCartButton.scrollIntoView({ behavior: "smooth", block: "center" });
        await delay(500); // Wait for scroll
        addToCartButton.click();
        console.log(`Clicked "Add to Cart" for "${productName}".`);
        await delay(2000); // Wait for cart update/modal
        
        // Handle potential "Added to cart" modals or other UI changes here if necessary
        // For example, if a modal pops up, you might need to find and click a "close" button.

      } else {
        console.log(`"Add to Cart" button not found in the first product card for "${item}".`);
        chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `Add button not found for ${item}.` });
      }
    } else {
      console.log(`No product found for "${item}".`);
      chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `No product found for ${item}.` });
    }

  } catch (error) {
    console.error(`Error processing item "${item}":`, error);
    chrome.runtime.sendMessage({ action: "updatePopupStatus", message: `Error with ${item}: ${error.message}` });
  }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "processGroceryList") {
    console.log("Content script received grocery list:", request.items);
    chrome.runtime.sendMessage({ action: "updatePopupStatus", message: "Starting to process list..." });

    for (const item of request.items) {
      await processItem(item);
      // Wait a bit between items to be less like a bot and allow the page to settle
      await delay(2000 + Math.random() * 1000); // 2-3 second delay
    }
    console.log("Finished processing grocery list.");
    chrome.runtime.sendMessage({ action: "updatePopupStatus", message: "All items processed!" });
    sendResponse({status: "success", message: "All items processed."}); // Notify popup
  }
  return true; // for async sendResponse
});

console.log("Harris Teeter Cart Adder content script loaded.");
