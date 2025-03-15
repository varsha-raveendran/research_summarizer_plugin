// Helper function to extract text content
function extractText(selector) {
  const elements = document.querySelectorAll(selector);
  return Array.from(elements)
    .map(el => el.textContent.trim())
    .filter(text => text.length > 0)
    .join('\n');
}

// Helper function to identify section by keywords
function findSection(keywords) {
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .section-title, .heading');
  for (const heading of headings) {
    const text = heading.textContent.toLowerCase();
    if (keywords.some(keyword => text.includes(keyword))) {
      let content = '';
      let element = heading.nextElementSibling;
      while (element && !element.matches('h1, h2, h3, h4, h5, h6, .section-title, .heading')) {
        content += element.textContent.trim() + '\n';
        element = element.nextElementSibling;
      }
      return content.trim();
    }
  }
  return '';
}

// Function to extract references
function extractReferences() {
  const refSection = findSection(['references', 'bibliography', 'citations']);
  if (refSection) {
    return refSection;
  }

  // Look for reference lists
  const references = document.querySelectorAll('.references li, #references li, .bibliography li');
  if (references.length > 0) {
    return Array.from(references)
      .map(ref => ref.textContent.trim())
      .join('\n');
  }

  return '';
}

// Main function to analyze the paper
function analyzePaper() {
  // Try to detect if we're on a PDF
  if (document.contentType === 'application/pdf') {
    return {
      error: 'PDF analysis is not supported in this version. Please use the HTML version of the paper if available.'
    };
  }

  // Extract abstract
  let abstract = findSection(['abstract']) ||
                extractText('.abstract') ||
                extractText('#abstract');

  // Extract methodology
  const methodology = findSection(['method', 'methodology', 'materials and methods', 'experimental']) ||
                     extractText('.methodology') ||
                     extractText('#methodology');

  // Extract findings/results
  const findings = findSection(['results', 'findings', 'discussion']) ||
                  extractText('.results') ||
                  extractText('#results');

  // Extract limitations
  const limitations = findSection(['limitation', 'limitations', 'future work']) ||
                     extractText('.limitations') ||
                     extractText('#limitations');

  // Extract references
  const references = extractReferences();

  // Validate if we found enough content
  if (!abstract && !methodology && !findings) {
    return {
      error: 'Could not identify research paper content on this page.'
    };
  }

  return {
    abstract: abstract || 'No abstract found',
    methodology: methodology || 'No methodology section found',
    findings: findings || 'No findings/results section found',
    limitations: limitations || 'No limitations section found',
    references: references || 'No references found'
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    const results = analyzePaper();
    sendResponse(results);
  }
  return true;
}); 