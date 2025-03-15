document.addEventListener('DOMContentLoaded', function() {
  const summarizeBtn = document.getElementById('summarizeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const shuffleFlashcardsBtn = document.getElementById('shuffleFlashcards');

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

  // Handle flashcard flipping
  function handleFlashcardClick(event) {
    const flashcard = event.target.closest('.flashcard');
    if (flashcard && event.target.classList.contains('flashcard-button')) {
      flashcard.classList.toggle('flipped');
    }
  }

  function generateFlashcards(data) {
    const flashcardsContainer = document.getElementById('flashcards-container');
    const flashcards = [];

    // Generate flashcards from abstract
    if (data.abstract && data.abstract !== 'No abstract found') {
      flashcards.push({
        front: 'What is the main objective of this research?',
        back: data.abstract.split('.')[0] // First sentence of abstract
      });
    }

    // Generate flashcards from methodology
    if (data.methodology && data.methodology !== 'No methodology found') {
      flashcards.push({
        front: 'What methodology was used in this research?',
        back: data.methodology.split('.')[0]
      });
    }

    // Generate flashcards from findings
    if (data.findings && data.findings !== 'No findings found') {
      const findings = data.findings.split('.');
      findings.slice(0, 3).forEach(finding => {
        if (finding.trim()) {
          flashcards.push({
            front: 'What was one of the key findings?',
            back: finding.trim()
          });
        }
      });
    }

    // Generate flashcards from limitations
    if (data.limitations && data.limitations !== 'No limitations found') {
      flashcards.push({
        front: 'What are the limitations of this research?',
        back: data.limitations.split('.')[0]
      });
    }

    // Render flashcards without inline event handlers
    flashcardsContainer.innerHTML = flashcards.map((card, index) => `
      <div class="flashcard" data-index="${index}">
        <div class="flashcard-front">
          <strong>Question:</strong> ${card.front}
          <button class="flashcard-button" data-action="flip">Show Answer</button>
        </div>
        <div class="flashcard-back">
          <strong>Answer:</strong> ${card.back}
          <button class="flashcard-button" data-action="flip">Hide Answer</button>
        </div>
      </div>
    `).join('');

    // Add event listener for flashcard container
    flashcardsContainer.removeEventListener('click', handleFlashcardClick);
    flashcardsContainer.addEventListener('click', handleFlashcardClick);

    // Add shuffle functionality
    if (shuffleFlashcardsBtn) {
      shuffleFlashcardsBtn.onclick = () => {
        const container = document.getElementById('flashcards-container');
        const cards = Array.from(container.children);
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          container.appendChild(cards[j]);
        }
      };
    }
  }

  function generateResearchQuestions(data) {
    const questionsContainer = document.getElementById('questions-container');
    const questions = [];

    // Generate questions from abstract and findings
    if (data.abstract && data.findings) {
      questions.push(
        'How does this research contribute to the existing literature in the field?',
        'What are the potential implications of these findings for future research?',
        'How might the methodology be improved or extended for future studies?'
      );

      // Add specific questions based on the content
      if (data.methodology) {
        questions.push(
          'Why was this particular methodology chosen over other potential approaches?',
          'What are the advantages and limitations of the chosen methodology?'
        );
      }

      if (data.limitations) {
        questions.push(
          'How would you address these limitations in future research?',
          'What alternative approaches could be used to overcome these limitations?'
        );
      }
    }

    // Add general research questions
    questions.push(
      'How would you extend or build upon this research?',
      'What are the practical applications of these findings?',
      'How does this research align with or challenge existing theories in the field?'
    );

    // Render questions
    questionsContainer.innerHTML = questions.map(question => `
      <div class="research-question">
        ${question}
      </div>
    `).join('');
  }

  function downloadSummary(data) {
    const text = `Research Paper Summary\n\n` +
      `Abstract:\n${data.abstract}\n\n` +
      `Key Findings:\n${data.findings}\n\n` +
      `Methodology:\n${data.methodology}\n\n` +
      `Limitations:\n${data.limitations}\n\n` +
      `References:\n${data.references}\n\n` +
      `Study Questions:\n`;
    
    const questions = document.querySelectorAll('.research-question');
    questions.forEach(q => {
      text += `- ${q.textContent.trim()}\n`;
    });

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

  // Tab switching functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Show selected tab
      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

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

      // Generate flashcards and research questions
      generateFlashcards(response);
      generateResearchQuestions(response);

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