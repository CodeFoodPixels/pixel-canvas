function setupCanvas(width, height) {
  let widthPixel = Math.floor(window.innerWidth/width);
  let heightPixel = Math.floor(window.innerHeight/height);

  const canvasContainer = document.querySelector('#canvasContainer');
  
  let pixelSize = widthPixel < heightPixel ? widthPixel : heightPixel;
  
  let zooming = false;
  let prevPinchDistance = 0;
  
  const gridData = [];
  
  for (let x = 0; x < width; x++) {
    gridData[x] = [];
    for (let y = 0; y < height; y++) {
      gridData[x][y] = '#000000';
    }
  }
  
  const canvas = document.createElement('canvas');
  canvas.setAttribute('width', canvasContainer.offsetWidth);
  canvas.setAttribute('height', canvasContainer.offsetHeight);

  canvasContainer.appendChild(canvas);

  let color = '#ffffff';
  const colorPicker = document.querySelector('#color');
  const ctx = window.ctx = canvas.getContext('2d');
  
  ctx.translate((canvasContainer.offsetWidth / 2), (canvasContainer.offsetHeight / 2));
  ctx.scale(pixelSize, pixelSize);
  ctx.translate((canvasContainer.offsetWidth / 2) * -1, (canvasContainer.offsetHeight / 2) * -1);
  
  let xPos = (canvasContainer.offsetWidth / 2) - ((canvasContainer.offsetWidth / 2) / pixelSize);
  let yPos = (canvasContainer.offsetHeight / 2) - ((canvasContainer.offsetHeight / 2) / pixelSize);
  
  let xStart = (canvasContainer.offsetWidth / 2) - (width / 2);
  let xEnd = xStart + width;
  let yStart = (canvasContainer.offsetHeight/ 2) - (height / 2);
  let yEnd = yStart + height;
  
  redraw();
  
  function isDrawable(x, y) {
    if (x < xStart) return false;
    if (x > xEnd) return false;
    if (y < yStart) return false;
    if (y > yEnd) return false;
    
    return true;
  }
  
  function redraw() {
    ctx.clearRect(0, 0, canvasContainer.offsetWidth , canvasContainer.offsetHeight);
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        ctx.fillStyle = gridData[x][y];
        ctx.fillRect(xStart + (x - 0.01), yStart + (y - 0.01), 1.02, 1.02);
      }
    }
  }
 
  function drawPixel(x, y, color) {    
    ({x, y} = getScaledCoords(x, y));
    
    const xReference = Math.floor(x - xStart);
    const yReference = Math.floor(y - yStart);
    const xPixel = xReference + xStart;
    const yPixel = yReference + yStart;
    
    if (isDrawable(xPixel, yPixel)) {
      ctx.fillStyle = color;
      ctx.fillRect(xPixel - 0.01, yPixel - 0.01, 1.02, 1.02);
      gridData[xReference][yReference] = color;
    }
  }
  
  function getScaledCoords(x, y) {
      return {
        x: xPos + (x / pixelSize),
        y: yPos + (y / pixelSize)
      }
  }

  function getCanvasCoords(x, y) {
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
    drawPixel(position.x, position.y, color);
    canvas.addEventListener('mousemove', moveDraw);
    canvas.addEventListener('touchmove', onTouchMove);
  }

  function onMouseUp(e) {
    canvas.removeEventListener('mousemove', moveDraw);
    canvas.removeEventListener('touchmove', onTouchMove);
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      return moveDraw(e.touches[0]);
    }
    
    if (zooming) {
          const distance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );

          const x = (e.touches[0].pageX + e.touches[1].pageX) / 2;
          const y = (e.touches[0].pageY + e.touches[1].pageY) / 2;

          zoom((distance - prevPinchDistance) / 40, x, y);

          prevPinchDistance = distance;
      }
  }

  function moveDraw(e) {
    const position = getCanvasCoords(e.pageX, e.pageY);

    const pixelData = ctx.getImageData( position.x, position.y, 1, 1).data;

    if (color !== getHexCode(pixelData)) {
      drawPixel(position.x, position.y, color);
    }
  }
  
  function zoom(steps, x, y) {
      ({x, y} = getCanvasCoords(x, y));
      
      const factor = Math.pow(1.1, steps);
    
      ctx.translate(xPos, yPos);

      xPos = ( x / pixelSize + xPos - x / ( pixelSize * factor ) );
      yPos = ( y / pixelSize + yPos - y / ( pixelSize * factor ) );

      ctx.scale(factor, factor);

      ctx.translate(xPos * -1, yPos * -1);

      pixelSize *= factor;
    
      requestAnimationFrame(redraw);
  }
  
  function onScroll(e) {
      e.preventDefault() 
      zoom(e.deltaY / 40, e.clientX, e.clientY);
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
  };
  
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);

  canvas.addEventListener('touchstart', debounce((e) => {
      if (e.touches.length > 1) {
          zooming = true;
          
          prevPinchDistance = Math.hypot(
              e.touches[0].pageX - e.touches[1].pageX,
              e.touches[0].pageY - e.touches[1].pageY
          );
        
          return;
      }
    
      onMouseDown(e.touches[0]);
  }));
  
  document.addEventListener('touchmove', onTouchMove);
  
  canvas.addEventListener('touchend', (e) => {
      prevPinchDistance = 0;
      zooming = false;
      
      onMouseUp(e);
  });
  
  canvas.addEventListener('wheel', onScroll);

  colorPicker.addEventListener('change', () => {
    color = colorPicker.value;
  })
  
  window.addEventListener('resize', () => {
      canvas.setAttribute('width', 0);
      canvas.setAttribute('height', 0);
      canvas.setAttribute('width', canvasContainer.offsetWidth);
      canvas.setAttribute('height', canvasContainer.offsetHeight);
  
      widthPixel = Math.floor(window.innerWidth/width);
      heightPixel = Math.floor(window.innerHeight/height);
  
      pixelSize = widthPixel < heightPixel ? widthPixel : heightPixel;
    
      ctx.translate((canvasContainer.offsetWidth / 2), (canvasContainer.offsetHeight / 2));
      ctx.scale(pixelSize, pixelSize);
      ctx.translate((canvasContainer.offsetWidth / 2) * -1, (canvasContainer.offsetHeight / 2) * -1);
  
      xPos = (canvasContainer.offsetWidth / 2) - ((canvasContainer.offsetWidth / 2) / pixelSize);
      yPos = (canvasContainer.offsetHeight / 2) - ((canvasContainer.offsetHeight / 2) / pixelSize);
  
      xStart = (canvasContainer.offsetWidth / 2) - (width / 2);
      xEnd = xStart + width;
      yStart = (canvasContainer.offsetHeight/ 2) - (height / 2);
      yEnd = yStart + height;

      redraw();
  });
}

setupCanvas(16, 16)