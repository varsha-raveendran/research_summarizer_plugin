document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');

  summarizeBtn.addEventListener('click', async () => {
    try {
      // Show loading state
      loading.style.display = 'block';
      results.style.display = 'none';
      error.style.display = 'none';
      summarizeBtn.disabled = true;

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Inject the content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'summarize' });

      if (response.error) {
        throw new Error(response.error);
      }

      // Update UI with results
      document.getElementById('abstract').textContent = response.abstract || 'No abstract found';
      document.getElementById('findings').textContent = response.findings || 'No key findings found';
      document.getElementById('methodology').textContent = response.methodology || 'No methodology found';
      document.getElementById('limitations').textContent = response.limitations || 'No limitations found';
      document.getElementById('references').textContent = response.references || 'No references found';

      // Show results
      results.style.display = 'block';
    } catch (err) {
      error.textContent = 'Error: ' + (err.message || 'Could not analyze the paper. Make sure you\'re on a page with a research paper.');
      error.style.display = 'block';
    } finally {
      loading.style.display = 'none';
      summarizeBtn.disabled = false;
    }
  });
}); 