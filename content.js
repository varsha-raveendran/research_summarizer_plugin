// Initialize PDF.js
if (typeof window.pdfjsLib === 'undefined') {
  console.error('PDF.js library not loaded!');
} else {
  // Set worker path
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
}

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

// Function to handle PDF analysis
async function analyzePDF() {
  try {
    if (typeof window.pdfjsLib === 'undefined') {
      throw new Error('PDF.js library not loaded. Please try reloading the page.');
    }

    // Fetch the PDF data
    const response = await fetch(window.location.href);
    const pdfData = await response.arrayBuffer();

    // Load the PDF
    const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    // Process the text into sections
    return processPDFContent(fullText);
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error('Failed to process PDF: ' + error.message);
  }
}

// Function to process PDF content into sections
function processPDFContent(text) {
  const sections = {
    abstract: '',
    methodology: '',
    findings: '',
    limitations: '',
    references: ''
  };

  // Split text into lines
  const lines = text.split('\n');
  let currentSection = null;

  // Keywords for each section
  const sectionKeywords = {
    abstract: ['abstract'],
    methodology: ['methodology', 'methods', 'experimental procedure', 'materials and methods'],
    findings: ['results', 'findings', 'discussion'],
    limitations: ['limitations', 'future work', 'constraints'],
    references: ['references', 'bibliography', 'works cited']
  };

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    
    // Check if line indicates a new section
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => line.includes(keyword))) {
        currentSection = section;
        continue;
      }
    }

    // Add content to current section
    if (currentSection && lines[i].trim()) {
      sections[currentSection] += lines[i] + '\n';
    }
    
    // If we haven't found any section yet and the line looks like abstract content
    if (!currentSection && !line.includes('abstract') && i < 20) {
      sections.abstract += lines[i] + '\n';
    }
  }

  // Clean up sections
  for (const section in sections) {
    sections[section] = sections[section].trim() || `No ${section} found`;
  }

  return sections;
}

// Main function to analyze the paper
async function analyzePaper() {
  // Check if we're on a PDF
  if (document.contentType === 'application/pdf') {
    return await analyzePDF();
  }

  // Handle HTML content
  const abstract = findSection(['abstract']) ||
                  extractText('.abstract') ||
                  extractText('#abstract');

  const methodology = findSection(['method', 'methodology', 'materials and methods', 'experimental']) ||
                     extractText('.methodology') ||
                     extractText('#methodology');

  const findings = findSection(['results', 'findings', 'discussion']) ||
                  extractText('.results') ||
                  extractText('#results');

  const limitations = findSection(['limitation', 'limitations', 'future work']) ||
                     extractText('.limitations') ||
                     extractText('#limitations');

  const references = extractReferences();

  // Validate if we found enough content
  if (!abstract && !methodology && !findings) {
    throw new Error('Could not identify research paper content on this page.');
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
    analyzePaper()
      .then(paperData => sendResponse(paperData))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Required for async response
  }
}); 