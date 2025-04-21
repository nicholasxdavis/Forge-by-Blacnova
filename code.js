// CodePlayground.js - Production Ready Code Playground Implementation
document.addEventListener('DOMContentLoaded', function() {
  // Initialize editors
  const htmlEditor = ace.edit('html-editor');
  const cssEditor = ace.edit('css-editor');
  const jsEditor = ace.edit('js-editor');
  
  // Configure editors
  configureEditor(htmlEditor, 'html', '<!DOCTYPE html>\n<html>\n<head>\n  <title>Playground</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>');
  configureEditor(cssEditor, 'css', 'body {\n  font-family: Arial, sans-serif;\n  text-align: center;\n  padding: 2rem;\n}');
  configureEditor(jsEditor, 'javascript', 'console.log("Welcome to the playground!");\n\ndocument.querySelector("h1").addEventListener("click", () => {\n  console.log("Heading clicked!");\n});');
  
  // Preview elements
  const previewFrame = document.getElementById('preview-frame');
  const previewContainer = document.getElementById('preview-container');
  const consolePanel = document.getElementById('console-panel');
  const consoleOutput = document.getElementById('console-output');
  const consoleInput = document.getElementById('console-input');
  const consoleBadge = document.getElementById('console-badge');
  
  // Button elements
  const runButton = document.getElementById('run-code');
  const formatButton = document.getElementById('format-code');
  const clearButton = document.getElementById('clear-code');
  const saveButton = document.getElementById('save-snippet');
  const shareButton = document.getElementById('share-snippet');
  const toggleConsoleButton = document.getElementById('toggle-console');
  const togglePreviewButton = document.getElementById('toggle-preview');
  
  // State management
  let isConsoleOpen = false;
  let isFullscreenPreview = false;
  let consoleHistory = [];
  let historyIndex = -1;
  
  // Initialize the playground
  initPlayground();
  
  // Function to configure an Ace editor instance
  function configureEditor(editor, mode, defaultValue) {
    editor.setTheme('ace/theme/chrome');
    editor.session.setMode(`ace/mode/${mode}`);
    editor.setValue(defaultValue, -1);
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      fontSize: '14px',
      tabSize: 2,
      useSoftTabs: true,
      showPrintMargin: false
    });
    
    // Add keyboard shortcuts
    editor.commands.addCommand({
      name: 'runCode',
      bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
      exec: runCode
    });
    
    editor.commands.addCommand({
      name: 'formatCode',
      bindKey: { win: 'Ctrl-Shift-F', mac: 'Command-Shift-F' },
      exec: formatCode
    });
  }
  
  // Initialize playground functionality
  function initPlayground() {
    // Run initial code
    runCode();
    
    // Set up event listeners
    runButton.addEventListener('click', runCode);
    formatButton.addEventListener('click', formatCode);
    clearButton.addEventListener('click', clearCode);
    saveButton.addEventListener('click', saveSnippet);
    shareButton.addEventListener('click', shareSnippet);
    toggleConsoleButton.addEventListener('click', toggleConsole);
    togglePreviewButton.addEventListener('click', togglePreview);
    
    // Console input handling
    consoleInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        executeConsoleCommand();
      } else if (e.key === 'ArrowUp') {
        navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        navigateHistory(1);
      }
    });
    
    // Override console.log and friends
    overrideConsoleMethods();
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Ctrl+H for HTML editor focus
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        htmlEditor.focus();
      }
      
      // Ctrl+C for CSS editor focus
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        cssEditor.focus();
      }
      
      // Ctrl+J for JS editor focus
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        jsEditor.focus();
      }
      
      // Ctrl+P for preview toggle
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        togglePreview();
      }
    });
  }
  
  // Run the code and update preview
  function runCode() {
    try {
      // Get editor values
      const html = htmlEditor.getValue();
      const css = cssEditor.getValue();
      const js = jsEditor.getValue();
      
      // Clear console
      consoleOutput.innerHTML = '';
      consoleBadge.classList.add('hidden');
      
      // Generate preview HTML
      const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>${css}</style>
          <script>
            // Override console methods to capture output
            const originalConsole = {
              log: console.log,
              warn: console.warn,
              error: console.error,
              info: console.info
            };
            
            function sendToParent(type, ...args) {
              window.parent.postMessage({
                type: 'console',
                method: type,
                args: args.map(arg => {
                  if (typeof arg === 'object') {
                    try {
                      return JSON.stringify(arg);
                    } catch (e) {
                      return String(arg);
                    }
                  }
                  return arg;
                })
              }, '*');
            }
            
            console.log = (...args) => {
              originalConsole.log(...args);
              sendToParent('log', ...args);
            };
            
            console.warn = (...args) => {
              originalConsole.warn(...args);
              sendToParent('warn', ...args);
            };
            
            console.error = (...args) => {
              originalConsole.error(...args);
              sendToParent('error', ...args);
            };
            
            console.info = (...args) => {
              originalConsole.info(...args);
              sendToParent('info', ...args);
            };
            
            // Error handling
            window.addEventListener('error', (event) => {
              sendToParent('error', event.message, event.filename, event.lineno, event.colno);
            });
            
            // Unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
              sendToParent('error', 'Unhandled Promise Rejection:', event.reason);
            });
          </script>
        </head>
        <body>${html}</body>
        <script>${js}</script>
        </html>
      `;
      
      // Update preview frame
      const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
      previewDoc.open();
      previewDoc.write(previewHtml);
      previewDoc.close();
      
    } catch (error) {
      logToConsole('error', 'Error executing code:', error.message);
    }
  }
  
  // Format code using built-in Ace beautify
  function formatCode() {
    try {
      // HTML formatting (simple indentation)
      const htmlSession = htmlEditor.getSession();
      const htmlValue = htmlEditor.getValue();
      htmlEditor.setValue(htmlValue, -1);
      htmlSession.setUndoManager(new ace.UndoManager());
      
      // CSS formatting
      const cssBeautify = ace.require('ace/ext/beautify');
      cssBeautify.beautify(cssEditor.session);
      
      // JS formatting
      const jsBeautify = ace.require('ace/ext/beautify');
      jsBeautify.beautify(jsEditor.session);
      
    } catch (error) {
      logToConsole('error', 'Error formatting code:', error.message);
    }
  }
  
  // Clear all editors
  function clearCode() {
    if (confirm('Are you sure you want to clear all code?')) {
      htmlEditor.setValue('', -1);
      cssEditor.setValue('', -1);
      jsEditor.setValue('', -1);
      logToConsole('log', 'All editors cleared.');
    }
  }
  
  // Save snippet to localStorage
  function saveSnippet() {
    try {
      const snippet = {
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue(),
        timestamp: new Date().getTime()
      };
      
      localStorage.setItem('codePlaygroundSnippet', JSON.stringify(snippet));
      logToConsole('log', 'Snippet saved to browser storage.');
    } catch (error) {
      logToConsole('error', 'Error saving snippet:', error.message);
    }
  }
  
  // Share snippet via URL
  function shareSnippet() {
    try {
      const snippet = {
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue()
      };
      
      const base64 = btoa(JSON.stringify(snippet));
      const url = new URL(window.location.href);
      url.searchParams.set('snippet', base64);
      
      navigator.clipboard.writeText(url.toString())
        .then(() => {
          logToConsole('log', 'Shareable URL copied to clipboard!');
        })
        .catch(err => {
          logToConsole('error', 'Failed to copy URL:', err.message);
          prompt('Copy this URL to share:', url.toString());
        });
    } catch (error) {
      logToConsole('error', 'Error sharing snippet:', error.message);
    }
  }
  
  // Toggle console visibility
  function toggleConsole() {
    isConsoleOpen = !isConsoleOpen;
    
    if (isConsoleOpen) {
      consolePanel.classList.remove('hidden');
      previewFrame.style.height = 'calc(100% - 150px)';
    } else {
      consolePanel.classList.add('hidden');
      previewFrame.style.height = '100%';
    }
  }
  
  // Toggle preview fullscreen
  function togglePreview() {
    isFullscreenPreview = !isFullscreenPreview;
    
    if (isFullscreenPreview) {
      previewContainer.classList.add('fixed', 'inset-0', 'z-50', 'bg-white');
      previewContainer.classList.remove('relative');
      previewFrame.style.height = '100vh';
    } else {
      previewContainer.classList.remove('fixed', 'inset-0', 'z-50', 'bg-white');
      previewContainer.classList.add('relative');
      previewFrame.style.height = isConsoleOpen ? 'calc(100% - 150px)' : '100%';
    }
  }
  
  // Override console methods to capture output
  function overrideConsoleMethods() {
    // Listen for messages from the preview iframe
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'console') {
        logToConsole(event.data.method, ...event.data.args);
      }
    });
  }
  
  // Log messages to the console panel
  function logToConsole(method, ...args) {
    const methodColors = {
      log: 'text-gray-200',
      warn: 'text-yellow-400',
      error: 'text-red-400',
      info: 'text-blue-400'
    };
    
    const color = methodColors[method] || 'text-gray-200';
    const message = args.join(' ');
    const timestamp = new Date().toLocaleTimeString();
    
    const line = document.createElement('div');
    line.className = `flex ${color} text-sm`;
    line.innerHTML = `
      <span class="text-gray-500 mr-2">[${timestamp}]</span>
      <span>${message}</span>
    `;
    
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    
    // Show badge if console is closed
    if (!isConsoleOpen) {
      consoleBadge.classList.remove('hidden');
    }
  }
  
  // Execute command in console
  function executeConsoleCommand() {
    const command = consoleInput.value.trim();
    if (!command) return;
    
    // Add to history
    consoleHistory.push(command);
    historyIndex = consoleHistory.length;
    
    // Display command
    logToConsole('log', `> ${command}`);
    
    try {
      // Execute in preview frame context
      const result = previewFrame.contentWindow.eval(command);
      
      // Display result
      if (result !== undefined) {
        logToConsole('log', String(result));
      }
    } catch (error) {
      logToConsole('error', error.message);
    }
    
    // Clear input
    consoleInput.value = '';
  }
  
  // Navigate console history
  function navigateHistory(direction) {
    if (consoleHistory.length === 0) return;
    
    historyIndex = Math.max(0, Math.min(consoleHistory.length, historyIndex + direction));
    
    if (historyIndex >= 0 && historyIndex < consoleHistory.length) {
      consoleInput.value = consoleHistory[historyIndex];
    } else if (historyIndex === consoleHistory.length) {
      consoleInput.value = '';
    }
  }
  
  // Load snippet from URL or localStorage
  function loadSnippet() {
    try {
      // Check URL for snippet
      const urlParams = new URLSearchParams(window.location.search);
      const urlSnippet = urlParams.get('snippet');
      
      if (urlSnippet) {
        const snippet = JSON.parse(atob(urlSnippet));
        if (snippet.html) htmlEditor.setValue(snippet.html, -1);
        if (snippet.css) cssEditor.setValue(snippet.css, -1);
        if (snippet.js) jsEditor.setValue(snippet.js, -1);
        logToConsole('log', 'Snippet loaded from URL.');
        return;
      }
      
      // Check localStorage for snippet
      const savedSnippet = localStorage.getItem('codePlaygroundSnippet');
      if (savedSnippet) {
        const snippet = JSON.parse(savedSnippet);
        if (snippet.html) htmlEditor.setValue(snippet.html, -1);
        if (snippet.css) cssEditor.setValue(snippet.css, -1);
        if (snippet.js) jsEditor.setValue(snippet.js, -1);
        logToConsole('log', 'Snippet loaded from browser storage.');
      }
    } catch (error) {
      logToConsole('error', 'Error loading snippet:', error.message);
    }
  }
  
  // Initial load of any saved snippet
  loadSnippet();
});