function setupEditor(width, height) {
  const state = {
    dimensions: {
      width: 0,
      height: 0
    },
    pixelSize: getDefaultPixelSize(width, height),
    zooming: false,
    prevPinchDistance: 0,
    gridData: setupGridData(),
    ctx: undefined,
    color: '#ffffff',
    position: {
      x: 0, 
      y: 0
    },
    gridStart: {
      x: 0,
      y: 0
    }
  };
  
  function getDefaultPixelSize(width, height) {
    const canvasContainer = document.querySelector('#canvasContainer');
    const widthPixel = Math.floor(canvasContainer.offsetWidth / width);
    const heightPixel = Math.floor(canvasContainer.offsetHeight / height);
    
    return (widthPixel < heightPixel ? widthPixel : heightPixel) * 0.9;
  }
  
  function setupGridData() {
    const gridData = [];
    
    for (let x = 0; x < width; x++) {
      gridData[x] = [];
      for (let y = 0; y < height; y++) {
        gridData[x][y] = '#000000';
      }
    }
    
    return gridData;
  }
  
  function setupCanvas() {
    const canvasContainer = document.querySelector('#canvasContainer');
  
    state.dimensions.width = canvasContainer.offsetWidth;
    state.dimensions.height = canvasContainer.offsetHeight;
    
    const canvas = document.createElement('canvas');
    
    canvas.setAttribute('id', 'pixelCanvas');
    canvas.setAttribute('width', canvasContainer.offsetWidth);
    canvas.setAttribute('height', canvasContainer.offsetHeight);

    canvasContainer.appendChild(canvas);

    state.ctx = canvas.getContext('2d');
    
    repositionCanvas();
  }
  
  function repositionCanvas() {
    state.ctx.translate((state.dimensions.width / 2), (state.dimensions.height / 2));
    state.ctx.scale(state.pixelSize, state.pixelSize);
    state.ctx.translate((state.dimensions.width / 2) * -1, (state.dimensions.height / 2) * -1);

    state.position.x = (state.dimensions.width / 2) - ((state.dimensions.width / 2) / state.pixelSize);
    state.position.y = (state.dimensions.height / 2) - ((state.dimensions.height / 2) / state.pixelSize);

    state.gridStart.x = (state.dimensions.width / 2) - (width / 2);
    state.gridStart.y = (state.dimensions.height/ 2) - (height / 2);

    redraw();
  }
  
  function isDrawable(x, y) {
    if (x < state.gridStart.x) return false;
    if (x >= state.gridStart.x + width) return false;
    if (y < state.gridStart.y) return false;
    if (y >= state.gridStart.y + height) return false;
    
    return true;
  }
  
  function redraw() {
    state.ctx.clearRect(0, 0, state.dimensions.width , state.dimensions.height);
    state.ctx.fillStyle = '#ff0000';
    
    const borderSize = Math.max(2 / state.pixelSize, 0.1)
    
    state.ctx.fillRect(state.gridStart.x - borderSize, state.gridStart.y - borderSize, width + (borderSize * 2), height + (borderSize * 2));
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        state.ctx.fillStyle = state.gridData[x][y];
        state.ctx.fillRect(state.gridStart.x + (x - 0.01), state.gridStart.y + (y - 0.01), 1.02, 1.02);
      }
    }
  }
 
  function drawPixel(x, y, color) {    
    ({x, y} = getScaledCoords(x, y));
    
    const xReference = Math.floor(x - state.gridStart.x);
    const yReference = Math.floor(y - state.gridStart.y);
    const xPixel = xReference + state.gridStart.x;
    const yPixel = yReference + state.gridStart.y;
    
    if (isDrawable(xPixel, yPixel)) {
      state.ctx.fillStyle = color;
      state.ctx.fillRect(xPixel - 0.01, yPixel - 0.01, 1.02, 1.02);
      state.gridData[xReference][yReference] = color;
    }
  }
  
  function getScaledCoords(x, y) {
      return {
        x: state.position.x + (x / state.pixelSize),
        y: state.position.y + (y / state.pixelSize)
      }
  }

  function getCanvasCoords(x, y) {
    const canvas = document.querySelector('#pixelCanvas');
    
    return {
     x: x - canvas.offsetLeft,
     y: y - canvas.offsetTop
    }
  }

  function getHexCode(pixelData) {
    let output = '#';

    for (let i = 0; i < 3; i++) {
      let part = pixelData[i].toString(16);

      if (part.length === 1) {
        part = '0' + part;
      }

      output += part;
    }
    
    return output;
  }

  function onMouseDown(e) {
    const position = getCanvasCoords(e.pageX, e.pageY);
    const canvas = document.querySelector('#pixelCanvas');
    
    drawPixel(position.x, position.y, state.color);
    canvas.addEventListener('mousemove', moveDraw);
  }

  function onMouseUp(e) {
    const canvas = document.querySelector('#pixelCanvas');
    
    canvas.removeEventListener('mousemove', moveDraw);
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      return moveDraw(e.touches[0]);
    }
    
    if (state.zooming) {
      pinchZoom(e);      
    }
  }
  
  const pinchZoom = throttle(function(e) {
    const distance = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );

    const x = (e.touches[0].pageX + e.touches[1].pageX) / 2;
    const y = (e.touches[0].pageY + e.touches[1].pageY) / 2;

    zoom((distance - state.prevPinchDistance) / 40, x, y);

    state.prevPinchDistance = distance;
  }, 100)

  function moveDraw(e) {
    const position = getCanvasCoords(e.pageX, e.pageY);

    const pixelData = state.ctx.getImageData( position.x, position.y, 1, 1).data;

    if (state.color !== getHexCode(pixelData)) {
      drawPixel(position.x, position.y, state.color);
    }
  }
  
  function zoom(steps, x, y) {
      ({x, y} = getCanvasCoords(x, y));
      
      const factor = Math.pow(1.1, steps);
      
      if (state.pixelSize * factor < 1) {
        return;
      }
    
      state.ctx.translate(state.position.x, state.position.y);

      state.position.x = ( x / state.pixelSize + state.position.x - x / ( state.pixelSize * factor ) );
      state.position.y = ( y / state.pixelSize + state.position.y - y / ( state.pixelSize * factor ) );

      state.ctx.scale(factor, factor);

      state.ctx.translate(state.position.x * -1, state.position.y * -1);

      state.pixelSize *= factor;
    
      requestAnimationFrame(redraw);
  }
  
  function onScroll(e) {
      e.preventDefault() 
      zoom(e.deltaY / 40, e.clientX, e.clientY);
  }
  
  function onResize(e) {
      const canvas = document.querySelector('#pixelCanvas');
      const canvasContainer = document.querySelector('#canvasContainer');
    
      canvas.setAttribute('width', 0);
      canvas.setAttribute('height', 0);
    
      state.dimensions.height = canvasContainer.offsetHeight;
      state.dimensions.width = canvasContainer.offsetWidth;
    
      canvas.setAttribute('width', state.dimensions.width);
      canvas.setAttribute('height', state.dimensions.height);
  
      repositionCanvas();
  }

  function debounce(func, wait) {
      let timeout;
      
      return function() {
          const args = arguments;
          
          const later = function() {
              timeout = null;
              func.apply(this, args);
          }.bind(this);
          
          clearTimeout(timeout);
        
          timeout = setTimeout(later, wait);
      };
  }
  
  function throttle(fn, threshhold) {
    let last;
    let deferTimer;
    
    return function () {
      let now = +new Date;
      let args = arguments;
      
      if (last && now < last + threshhold) {
        clearTimeout(deferTimer);
        deferTimer = setTimeout(function () {
          last = now;
          fn.apply(this, args);
        }.bind(this), threshhold);
      } else {
        last = now;
        fn.apply(this, args);
      }
    };
  }
  
  function setupCanvasListeners() {
    const canvas = document.querySelector('#pixelCanvas');
    
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', debounce((e) => {
        if (e.touches.length > 1) {
            state.zooming = true;

            state.prevPinchDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            return;
        }

        onMouseDown(e.touches[0]);
    }, 100));

    canvas.addEventListener('touchmove', onTouchMove);

    canvas.addEventListener('touchend', (e) => {
        state.prprevPinchDistance = 0;
        state.zooming = false;

        onMouseUp(e);
    });

    canvas.addEventListener('wheel', throttle(onScroll, 100));
  }
  
  setupCanvas();
  
  setupCanvasListeners();
  
  document.querySelector('#color').addEventListener('change', (e) => {
    state.color = e.target.value;
  })
  
  window.addEventListener('resize', debounce(onResize, 100));
}

setupEditor(16, 16)