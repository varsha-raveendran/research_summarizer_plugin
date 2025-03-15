// This script ensures PDF.js is properly loaded and initialized
(function() {
  // Check if PDF.js is already loaded
  if (typeof window.pdfjsLib !== 'undefined') {
    return;
  }

  // Create script element for PDF.js
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('lib/pdf.min.js');
  script.onload = function() {
    // Initialize PDF.js worker
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
  };
  
  // Add script to page
  (document.head || document.documentElement).appendChild(script);
})(); 