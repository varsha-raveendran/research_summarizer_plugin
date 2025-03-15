#!/bin/bash

# Create lib directory if it doesn't exist
mkdir -p lib

# Download PDF.js files
curl -L "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" -o "lib/pdf.min.js"
curl -L "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" -o "lib/pdf.worker.min.js"

# Make the script executable
chmod +x download-pdfjs.sh 