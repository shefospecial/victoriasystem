// Simple event mechanism for product updates
const PRODUCT_UPDATED_EVENT = 'product-updated-event';

export const notifyProductUpdated = () => {
  // Set a timestamp to indicate when products were last updated
  localStorage.setItem(PRODUCT_UPDATED_EVENT, Date.now().toString());
  // Also dispatch a custom event for components that are already mounted
  window.dispatchEvent(new CustomEvent(PRODUCT_UPDATED_EVENT));
};

export const listenToProductUpdates = (callback) => {
  // Add event listener for real-time updates
  window.addEventListener(PRODUCT_UPDATED_EVENT, callback);
  
  return () => {
    // Cleanup function to remove event listener
    window.removeEventListener(PRODUCT_UPDATED_EVENT, callback);
  };
};