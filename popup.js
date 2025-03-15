document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');

  // Keywords to highlight
  const keywords = [
    'significant', 'results', 'found', 'shows', 'demonstrates', 'concludes',
    'analysis', 'study', 'research', 'experiment', 'methodology', 'data',
    'evidence', 'findings', 'conclusion', 'implications', 'suggests', 'indicates',
    'hypothesis', 'objective', 'purpose', 'framework', 'approach', 'limitation'
  ];

  function highlightKeywords(text) {
    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  function updateContent(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = highlightKeywords(content);
    }
  }

  function showDownloadButton() {
    downloadBtn.classList.add('visible');
  }

  function hideDownloadButton() {
    downloadBtn.classList.remove('visible');
  }

  function downloadSummary(data) {
    const text = `Research Paper Summary\n\n` +
      `Abstract:\n${data.abstract}\n\n` +
      `Key Findings:\n${data.findings}\n\n` +
      `Methodology:\n${data.methodology}\n\n` +
      `Limitations:\n${data.limitations}\n\n` +
      `References:\n${data.references}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Get the paper title or use a default name
    const title = document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'paper';
    a.download = `${title}_summary.txt`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
    } catch (err) {
      console.error('Failed to inject content script:', err);
      throw new Error('Failed to initialize paper analysis.');
    }
  }

  // Initialize download button
  let currentData = null;
  downloadBtn.addEventListener('click', () => {
    if (currentData) {
      downloadSummary(currentData);
    }
  });

  summarizeBtn.addEventListener('click', async () => {
    try {
      // Reset state
      currentData = null;
      hideDownloadButton();
      
      // Show loading state
      loading.style.display = 'block';
      results.style.display = 'none';
      error.style.display = 'none';
      summarizeBtn.disabled = true;

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject content script first
      await injectContentScript(tab.id);

      // Small delay to ensure content script is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'summarize' });

      if (response.error) {
        throw new Error(response.error);
      }

      // Store the response data
      currentData = response;

      // Update UI with results
      updateContent('abstract', response.abstract || 'No abstract found');
      updateContent('findings', response.findings || 'No key findings found');
      updateContent('methodology', response.methodology || 'No methodology found');
      updateContent('limitations', response.limitations || 'No limitations found');
      updateContent('references', response.references || 'No references found');

      // Show results and download button
      results.style.display = 'block';
      showDownloadButton();
    } catch (err) {
      error.textContent = 'Error: ' + (err.message || 'Could not analyze the paper. Make sure you\'re on a page with a research paper.');
      error.style.display = 'block';
      hideDownloadButton();
    } finally {
      loading.style.display = 'none';
      summarizeBtn.disabled = false;
    }
  });
}); 