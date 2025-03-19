/**
 * SignaturePad - A smooth canvas-based signature drawing pad
 * @version 1.0.0
 * @author Rahul S
 * @license MIT
 */
class SignaturePad {
  /**
   * Creates a new SignaturePad instance
   * @param {string|HTMLElement} container - CSS selector or DOM element to contain the signature pad
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    // Get the container element
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
      
    if (!this.container) {
      throw new Error('Container element not found');
    }
    
    // Default options
    this.options = Object.assign({
      penColor: '#000000',
      penSize: 2,
      backgroundColor: '#FFFFFF',
      width: null,  // Will use container width if null
      height: 200,
      showDate: false,
      showCustomText: false,
      customText: '',
      addBorder: false,
      format: 'png', // png, jpeg, svg
      className: 'signature-pad',
      dark: false
    }, options);
    
    // State variables
    this.isDrawing = false;
    this.hasSignature = false;
    this.currentPath = [];
    this.drawingHistory = [];
    
    // Create the UI
    this._init();
  }
  
  /**
   * Initializes the signature pad
   * @private
   */
  _init() {
    // Create container structure
    this.container.classList.add(this.options.className);
    if (this.options.dark) {
      this.container.classList.add('dark');
    }
    
    // Create main content wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'sigpad-wrapper';
    
    // Create canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'sigpad-canvas-container';
    
    // Create drawing canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sigpad-canvas';
    this.ctx = this.canvas.getContext('2d');
    
    // Create empty message
    this.emptyMessage = document.createElement('div');
    this.emptyMessage.className = 'sigpad-empty-message';
    this.emptyMessage.textContent = 'Sign here';
    
    // Add canvas and message to container
    this.canvasContainer.appendChild(this.canvas);
    this.canvasContainer.appendChild(this.emptyMessage);
    this.wrapper.appendChild(this.canvasContainer);
    
    // Create controls container
    this.controls = document.createElement('div');
    this.controls.className = 'sigpad-controls';
    
    // Create buttons
    this.clearButton = this._createButton('Clear', 'sigpad-btn-clear');
    this.undoButton = this._createButton('Undo', 'sigpad-btn-undo');
    this.saveButton = this._createButton('Save', 'sigpad-btn-save');
    this.downloadButton = this._createButton('Download', 'sigpad-btn-download');
    
    // Add buttons to controls
    this.controls.appendChild(this.clearButton);
    this.controls.appendChild(this.undoButton);
    this.controls.appendChild(this.saveButton);
    this.controls.appendChild(this.downloadButton);
    
    // Add controls to wrapper
    this.wrapper.appendChild(this.controls);
    
    // Add wrapper to container
    this.container.appendChild(this.wrapper);
    
    // Set canvas dimensions
    this._resizeCanvas();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Set initial pen properties
    this._setPenProperties();
  }
  
  /**
   * Creates a button element
   * @private
   */
  _createButton(text, className) {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    return button;
  }
  
  /**
   * Sets up event listeners
   * @private
   */
  _setupEventListeners() {
    // Resize listener
    window.addEventListener('resize', () => this._resizeCanvas());
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this._startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this._draw(e));
    this.canvas.addEventListener('mouseup', () => this._stopDrawing());
    this.canvas.addEventListener('mouseout', () => this._stopDrawing());
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this._startDrawing(e));
    this.canvas.addEventListener('touchmove', (e) => this._draw(e));
    this.canvas.addEventListener('touchend', () => this._stopDrawing());
    
    // Button events
    this.clearButton.addEventListener('click', () => this.clear());
    this.undoButton.addEventListener('click', () => this.undo());
    this.saveButton.addEventListener('click', () => this._save());
    this.downloadButton.addEventListener('click', () => this.download());
  }
  
  /**
   * Resizes the canvas to fit the container
   * @private
   */
  _resizeCanvas() {
    // Store current image data if canvas already has content
    let imageData = null;
    if (this.canvas.width > 0 && this.canvas.height > 0 && this.hasSignature) {
      imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Set canvas dimensions
    const width = this.options.width || this.canvasContainer.clientWidth;
    this.canvas.width = width;
    this.canvas.height = this.options.height;
    
    // Reset the context properties after resize
    this._setPenProperties();
    
    // Restore image if there was content
    if (imageData) {
      this.ctx.putImageData(imageData, 0, 0);
    }
  }
  
  /**
   * Sets pen drawing properties
   * @private
   */
  _setPenProperties() {
    this.ctx.lineWidth = this.options.penSize;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = this.options.penColor;
  }
  
  /**
   * Starts a new drawing path
   * @private
   */
  _startDrawing(e) {
    e.preventDefault();
    this.isDrawing = true;
    
    // Start a new path
    this.currentPath = [];
    
    const point = this._getPointFromEvent(e);
    this.currentPath.push({
      x: point.x,
      y: point.y,
      color: this.options.penColor,
      size: this.options.penSize
    });
    
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }
  
  /**
   * Continues drawing along a path
   * @private
   */
  _draw(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    
    const point = this._getPointFromEvent(e);
    
    this.currentPath.push({
      x: point.x,
      y: point.y,
      color: this.options.penColor,
      size: this.options.penSize
    });
    
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
    
    if (!this.hasSignature) {
      this.hasSignature = true;
      this.emptyMessage.style.display = 'none';
    }
    
    // Trigger custom draw event
    this._triggerEvent('draw', { point });
  }
  
  /**
   * Stops drawing and saves the path
   * @private
   */
  _stopDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    this.ctx.beginPath();
    
    if (this.currentPath.length > 0) {
      this.drawingHistory.push(this.currentPath);
      this.currentPath = [];
    }
  }
  
  /**
   * Gets coordinates from mouse or touch event
   * @private
   */
  _getPointFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    let x, y;
    
    if (e.type.includes('touch')) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    return { x, y };
  }
  
  /**
   * Redraws the canvas from history
   * @private
   */
  _redrawCanvas() {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Redraw all paths
    for (const path of this.drawingHistory) {
      if (path.length < 2) continue;
      
      for (let i = 0; i < path.length - 1; i++) {
        const point = path[i];
        const nextPoint = path[i + 1];
        
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.lineTo(nextPoint.x, nextPoint.y);
        this.ctx.strokeStyle = point.color;
        this.ctx.lineWidth = point.size;
        this.ctx.stroke();
      }
    }
    
    // Reset to current options
    this._setPenProperties();
  }
  
  /**
   * Saves signature to localStorage
   * @private
   */
  _save() {
    if (!this.hasSignature) {
      this._triggerEvent('error', { message: 'No signature to save' });
      return;
    }
    
    try {
      localStorage.setItem('savedSignature', this.toDataURL());
      this._triggerEvent('save', { dataUrl: this.toDataURL() });
    } catch (e) {
      this._triggerEvent('error', { message: e.message });
    }
  }
  
  /**
   * Triggers a custom event
   * @private
   */
  _triggerEvent(eventName, detail) {
    const event = new CustomEvent(`sigpad:${eventName}`, { 
      detail,
      bubbles: true,
      cancelable: true
    });
    this.container.dispatchEvent(event);
  }
  
  /**
   * Generates the final image with options
   * @private
   */
  _generateImage(format) {
    // Create a temporary canvas for the final image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Calculate padding for the border if needed
    const padding = this.options.addBorder ? 20 : 0;
    
    // Calculate extra height for text
    const hasCustomText = this.options.showCustomText && this.options.customText;
    const extraHeight = (this.options.showDate || hasCustomText) ? 30 : 0;
    
    tempCanvas.width = this.canvas.width + (padding * 2);
    tempCanvas.height = this.canvas.height + (padding * 2) + extraHeight;
    
    // Fill with background color
    tempCtx.fillStyle = this.options.backgroundColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Add border if option is enabled
    if (this.options.addBorder) {
      tempCtx.strokeStyle = '#000000';
      tempCtx.lineWidth = 2;
      tempCtx.strokeRect(
        padding / 2, 
        padding / 2, 
        tempCanvas.width - padding, 
        tempCanvas.height - padding - extraHeight
      );
    }
    
    // Draw the signature
    tempCtx.drawImage(this.canvas, padding, padding);
    
    // Prepare text to add at the bottom
    if (extraHeight > 0) {
      tempCtx.font = '14px Arial';
      tempCtx.fillStyle = '#000000';
      
      // Position for text content
      const textY = tempCanvas.height - 15;
      
      // Add custom text on the left if enabled
      if (hasCustomText) {
        tempCtx.textAlign = 'left';
        tempCtx.fillText(this.options.customText, padding, textY);
      }
      
      // Add date and time on the right if enabled
      if (this.options.showDate) {
        const now = new Date();
        const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        
        tempCtx.textAlign = 'right';
        tempCtx.fillText(dateString, tempCanvas.width - padding, textY);
      }
    }
    
    // Convert to requested format
    let mimeType;
    switch (format) {
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'svg':
        return this._createSVG();
      default:
        mimeType = 'image/png';
    }
    
    return tempCanvas.toDataURL(mimeType);
  }
  
  /**
   * Creates an SVG version of the signature
   * @private
   */
  _createSVG() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", this.canvas.width);
    svg.setAttribute("height", this.canvas.height);
    svg.setAttribute("viewBox", `0 0 ${this.canvas.width} ${this.canvas.height}`);
    
    // Add white background
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", this.options.backgroundColor);
    svg.appendChild(rect);
    
    // Convert paths to SVG
    for (const path of this.drawingHistory) {
      if (!path.length || path.length < 2) continue;
        
      const pathElement = document.createElementNS(svgNS, "path");
      let d = `M ${path[0].x} ${path[0].y}`;
      
      for (let i = 1; i < path.length; i++) {
        d += ` L ${path[i].x} ${path[i].y}`;
      }
      
      pathElement.setAttribute("d", d);
      pathElement.setAttribute("fill", "none");
      pathElement.setAttribute("stroke", path[0].color);
      pathElement.setAttribute("stroke-width", path[0].size);
      pathElement.setAttribute("stroke-linecap", "round");
      pathElement.setAttribute("stroke-linejoin", "round");
      
      svg.appendChild(pathElement);
    }
    
    // Convert the SVG to a data URL
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
    
    return URL.createObjectURL(svgBlob);
  }
  
  /*** PUBLIC API ***/
  
  /**
   * Clears the signature pad
   * @return {SignaturePad} This instance for chaining
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasSignature = false;
    this.emptyMessage.style.display = 'flex';
    this.drawingHistory = [];
    this.currentPath = [];
    this._triggerEvent('clear');
    return this;
  }
  
  /**
   * Undoes the last stroke
   * @return {SignaturePad} This instance for chaining
   */
  undo() {
    if (this.drawingHistory.length === 0) return this;
    
    this.drawingHistory.pop();
    this._redrawCanvas();
    
    if (this.drawingHistory.length === 0) {
      this.hasSignature = false;
      this.emptyMessage.style.display = 'flex';
    }
    
    this._triggerEvent('undo');
    return this;
  }
  
  /**
   * Returns the signature as a data URL
   * @param {string} [format='png'] - The image format (png, jpeg, svg)
   * @return {string} The signature as a data URL
   */
  toDataURL(format = null) {
    if (!this.hasSignature) {
      return '';
    }
    
    format = format || this.options.format;
    return this._generateImage(format);
  }
  
  /**
   * Downloads the signature as an image
   * @param {string} [filename='signature'] - The name of the file
   * @param {string} [format=null] - The image format (defaults to options.format)
   */
  download(filename = 'signature', format = null) {
    if (!this.hasSignature) {
      this._triggerEvent('error', { message: 'No signature to download' });
      return;
    }
    
    format = format || this.options.format;
    const dataUrl = this.toDataURL(format);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}.${format}`;
    link.click();
    
    this._triggerEvent('download', { dataUrl, filename, format });
  }
  
  /**
   * Loads a saved signature from localStorage
   * @return {boolean} Whether the signature was successfully loaded
   */
  load() {
    try {
      const savedSignature = localStorage.getItem('savedSignature');
      if (!savedSignature) {
        this._triggerEvent('error', { message: 'No saved signature found' });
        return false;
      }
      
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.hasSignature = true;
        this.emptyMessage.style.display = 'none';
        this.drawingHistory = [{
          type: 'image',
          src: savedSignature
        }];
        this._triggerEvent('load', { dataUrl: savedSignature });
      };
      img.src = savedSignature;
      return true;
    } catch (e) {
      this._triggerEvent('error', { message: e.message });
      return false;
    }
  }
  
  /**
   * Sets an option
   * @param {string} name - The option name
   * @param {*} value - The option value
   * @return {SignaturePad} This instance for chaining
   */
  setOption(name, value) {
    this.options[name] = value;
    
    // Update specific properties if needed
    if (name === 'penColor') {
      this.ctx.strokeStyle = value;
    } else if (name === 'penSize') {
      this.ctx.lineWidth = value;
    } else if (name === 'height' || name === 'width') {
      this._resizeCanvas();
    } else if (name === 'dark') {
      if (value) {
        this.container.classList.add('dark');
      } else {
        this.container.classList.remove('dark');
      }
    }
    
    return this;
  }
  
  /**
   * Sets multiple options
   * @param {Object} options - The options object
   * @return {SignaturePad} This instance for chaining
   */
  setOptions(options) {
    for (const [key, value] of Object.entries(options)) {
      this.setOption(key, value);
    }
    return this;
  }
  
  /**
   * Checks if the signature pad has a signature
   * @return {boolean} Whether the pad has a signature
   */
  isEmpty() {
    return !this.hasSignature;
  }
  
  /**
   * Enables the signature pad
   * @return {SignaturePad} This instance for chaining
   */
  enable() {
    this.canvas.style.pointerEvents = 'auto';
    return this;
  }
  
  /**
   * Disables the signature pad
   * @return {SignaturePad} This instance for chaining
   */
  disable() {
    this.canvas.style.pointerEvents = 'none';
    return this;
  }
  
  /**
   * Destroys the signature pad instance
   */
  destroy() {
    // Remove all event listeners
    window.removeEventListener('resize', this._resizeCanvas);
    
    // Remove DOM elements
    this.container.innerHTML = '';
    
    // Clear references
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    
    this._triggerEvent('destroy');
  }
}

// Make it available in browser and as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignaturePad;
} else {
  window.SignaturePad = SignaturePad;
} 
