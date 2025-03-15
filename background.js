// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Research Paper Summarizer installed');
});

// Listen for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // You could add functionality here to detect if the page is a research paper
    // and show the extension icon in a different state
  }
}); 