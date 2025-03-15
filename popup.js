document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');
  let currentData = null;

  // Helper functions for download button
  function hideDownloadButton() {
    if (downloadBtn) {
      downloadBtn.classList.remove('visible');
    }
  }

  function showDownloadButton() {
    if (downloadBtn) {
      downloadBtn.classList.add('visible');
    }
  }

  // Helper function to extract key terms
  function extractKeyTerms(text) {
    const terms = new Set();
    
    // Find technical terms (capitalized words)
    const technicalTerms = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    technicalTerms.forEach(term => terms.add(term));
    
    // Find abbreviations
    const abbreviations = text.match(/\b[A-Z]{2,}\b/g) || [];
    abbreviations.forEach(term => terms.add(term));
    
    return Array.from(terms);
  }

  // Helper function to extract main concepts
  function extractMainConcepts(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    return sentences.filter(sentence => 
      sentence.includes(' is ') ||
      sentence.includes(' are ') ||
      sentence.includes(' refers to ') ||
      sentence.includes(' defined as ') ||
      sentence.includes(' means ') ||
      /\b(propose|present|introduce|develop)\b/i.test(sentence)
    );
  }

  // Function to generate research questions
  function generateResearchQuestions(data) {
    const questionsContainer = document.getElementById('questions-container');
    if (!questionsContainer) return;

    const questions = [];
    
    // Extract domain-specific terms and concepts
    const keyTerms = extractKeyTerms(data.abstract + ' ' + data.methodology);
    const concepts = extractMainConcepts(data.abstract + ' ' + data.methodology);
    
    // Generate domain-specific questions
    if (data.abstract && data.findings) {
      // Theoretical framework questions
      if (concepts.length > 0) {
        questions.push(
          `How does this research extend or challenge existing theories in ${keyTerms[0] || 'the field'}?`,
          `What theoretical implications do these findings have for ${keyTerms[1] || 'the domain'}?`
        );
      }

      // Methodology questions
      if (data.methodology) {
        const methodTerms = extractKeyTerms(data.methodology);
        questions.push(
          `Why was ${methodTerms[0] || 'this methodology'} chosen over alternative approaches?`,
          `How might the ${methodTerms[1] || 'methodology'} be improved for future studies?`
        );
      }

      // Results interpretation
      const statFindings = data.findings.match(/\b\d+(?:\.\d+)?%|\bp\s*<\s*0\.0[0-9]+|\b(?:significant|correlation)\b.*?[.!?]/gi) || [];
      if (statFindings.length > 0) {
        questions.push(
          'How do the statistical findings support or challenge the research hypotheses?',
          'What alternative interpretations of the results might be possible?'
        );
      }

      // Limitations and future work
      if (data.limitations) {
        questions.push(
          'How could future research address the limitations identified in this study?',
          'What methodological improvements could strengthen the findings?'
        );
      }
    }

    // Render questions
    questionsContainer.innerHTML = questions.map(question => `
      <div class="research-question">
        <p>${question}</p>
      </div>
    `).join('');
  }

  // Helper function to highlight key concepts
  function highlightKeyConcepts(text) {
    // Common academic and research-related patterns
    const patterns = [
      /(?:defined|known as|called|termed)\s+(?:["']([^"']+)["']|(\w+(?:\s+\w+){0,3}))/gi,
      /(?:proposed|introduced|developed|implemented)\s+(?:a|an|the)?\s+(\w+(?:\s+\w+){0,3})/gi,
      /(?:key|main|important|significant|novel)\s+(\w+(?:\s+\w+){0,3})/gi,
      /(?:\w+(?:\s+\w+){0,3})\s+(?:approach|method|technique|algorithm|framework|model|methods)/gi
    ];

    let highlightedText = text;
    patterns.forEach(pattern => {
      highlightedText = highlightedText.replace(pattern, (match, p1) => {
        return `<span class="highlight-concept">${match}</span>`;
      });
    });
    
    return highlightedText;
  }

  // Helper function to update content sections
  function updateContent(sectionId, content) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.innerHTML = `
        <div class="section" id="${sectionId}-section">
          <div class="section-header">${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}</div>
          <div class="section-content">${highlightKeyConcepts(content)}</div>
        </div>
      `;
    }
  }

  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    tabContents.forEach(tab => tab.classList.remove('active'));
    tabButtons.forEach(button => button.classList.remove('active'));

    const selectedTab = document.getElementById(`${tabId}-tab`);
    const selectedButton = document.querySelector(`[data-tab="${tabId}"]`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedButton) selectedButton.classList.add('active');
  }

  // Add click handlers to tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Initialize UI elements
  hideDownloadButton();
  results.style.display = 'none';
  error.style.display = 'none';
  loading.style.display = 'none';

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    if (message.action === 'analysisComplete') {
      // Hide loading state
      loading.style.display = 'none';
      error.style.display = 'none';
      summarizeBtn.disabled = false;

      // Store the response data
      currentData = message.data;

      // Update UI with results
      updateContent('abstract', message.data.abstract || 'No abstract found');
      updateContent('findings', message.data.findings || 'No key findings found');
      updateContent('methodology', message.data.methodology || 'No methodology found');
      updateContent('limitations', message.data.limitations || 'No limitations found');
      updateContent('references', message.data.references || 'No references found');

      // Generate research questions
      generateResearchQuestions(message.data);

      // Show results and download button
      results.style.display = 'block';
      showDownloadButton();
      
      // Switch to summary tab
      switchTab('summary');
    } else if (message.action === 'analysisError') {
      // Hide loading state and show error
      loading.style.display = 'none';
      error.textContent = 'Error: ' + message.error;
      error.style.display = 'block';
      summarizeBtn.disabled = false;
      hideDownloadButton();
    }
  });

  // Summarize button click handler
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
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Inject content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (err) {
        console.error('Script injection error:', err);
        // Continue anyway as the script might already be injected
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { 
        action: 'summarize',
        url: tab.url
      });

    } catch (err) {
      console.error('Error:', err);
      error.textContent = 'Error: ' + (err.message || 'Could not analyze the paper. Make sure you\'re on a page with a research paper.');
      error.style.display = 'block';
      loading.style.display = 'none';
      summarizeBtn.disabled = false;
      hideDownloadButton();
    }
  });

  // Download button click handler
  downloadBtn.addEventListener('click', () => {
    if (!currentData) return;

    const content = [
      'Research Paper Summary\n',
      '===================\n\n',
      'Abstract:\n---------\n',
      currentData.abstract || 'No abstract found',
      '\n\nKey Findings:\n-------------\n',
      currentData.findings || 'No key findings found',
      '\n\nMethodology:\n------------\n',
      currentData.methodology || 'No methodology found',
      '\n\nLimitations:\n------------\n',
      currentData.limitations || 'No limitations found',
      '\n\nReferences:\n-----------\n',
      currentData.references || 'No references found'
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper_summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}); 