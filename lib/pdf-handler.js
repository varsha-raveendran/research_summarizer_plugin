// PDF.js worker
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');

// Function to extract text from a PDF
async function extractPDFContent(pdfData) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw error;
  }
}

// Function to identify sections in the PDF text
function identifySections(text) {
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
    sections[section] = sections[section].trim();
  }

  return sections;
}

// Listen for messages from content script
self.onmessage = async function(e) {
  if (e.data.action === 'processPDF') {
    try {
      const pdfContent = await extractPDFContent(e.data.pdfData);
      const sections = identifySections(pdfContent);
      self.postMessage({ success: true, sections });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  }
}; 