<script>
  export let width = 800;
  export let height = 600;
  
  // 오브젝트 상태
  let objects = [
    {
      id: 1,
      type: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 120,
      angle: 0,
      color: '#4fc3f7',
      selected: false
    }
  ];

  let selectedObject = null;
  let isDragging = false;
  let isResizing = false;
  let isRotating = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startAngle = 0;
  let resizeEdge = null;
  let minSize = 20;
  let oppositeHandleX = 0;  // 반대편 핸들의 x좌표
  let oppositeHandleY = 0;  // 반대편 핸들의 y좌표

  // 방향 정의
  const directions = {
    'top-left': { x: -1, y: -1 },
    'top': { x: 0, y: -1 },
    'top-right': { x: 1, y: -1 },
    'left': { x: -1, y: 0 },
    'right': { x: 1, y: 0 },
    'bottom-left': { x: -1, y: 1 },
    'bottom': { x: 0, y: 1 },
    'bottom-right': { x: 1, y: 1 }
  };

  function calculateOppositeHandle(edge, object, angle) {
    const centerX = object.x + object.width / 2;
    const centerY = object.y + object.height / 2;
    
    // 반대편 핸들의 상대적 위치 계산
    let relativeX = 0;
    let relativeY = 0;
    
    if (edge.includes('left')) relativeX = 1;
    if (edge.includes('right')) relativeX = -1;
    if (edge.includes('top')) relativeY = 1;
    if (edge.includes('bottom')) relativeY = -1;
    
    // 회전 적용
    const rotatedX = relativeX * Math.cos(angle) - relativeY * Math.sin(angle);
    const rotatedY = relativeX * Math.sin(angle) + relativeY * Math.cos(angle);
    
    return {
      x: centerX + rotatedX * object.width / 2,
      y: centerY + rotatedY * object.height / 2
    };
  }

  function handleResize(event, object, edge) {
    const direction = directions[edge];
    const angle = object.angle * Math.PI / 180;
    
    // 마우스 이동 거리 계산
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    
    // 회전된 델타 계산
    const rotatedDeltaX = deltaX * Math.cos(-angle) - deltaY * Math.sin(-angle);
    const rotatedDeltaY = deltaX * Math.sin(-angle) + deltaY * Math.cos(-angle);
    
    // 방향에 따른 크기 조정
    const newWidth = Math.max(minSize, startWidth + rotatedDeltaX * direction.x);
    const newHeight = Math.max(minSize, startHeight + rotatedDeltaY * direction.y);
    
    // 반대편 핸들 위치 계산
    const oppositeHandle = calculateOppositeHandle(edge, object, angle);
    
    // 새로운 위치 계산 (반대편 핸들을 기준으로)
    let newX = object.x;
    let newY = object.y;
    
    if (direction.x !== 0) {
      // 가로 방향 리사이즈
      if (direction.x === 1) { // 오른쪽으로 리사이즈
        newX = object.x;
      } else { // 왼쪽으로 리사이즈
        newX = object.x + (object.width - newWidth);
      }
    }
    
    if (direction.y !== 0) {
      // 세로 방향 리사이즈
      if (direction.y === 1) { // 아래로 리사이즈
        newY = object.y;
      } else { // 위로 리사이즈
        newY = object.y + (object.height - newHeight);
      }
    }
    
    return {
      width: newWidth,
      height: newHeight,
      x: newX,
      y: newY,
      oppositeHandle
    };
  }

  function selectObject(obj) {
    objects = objects.map(o => ({
      ...o,
      selected: o.id === obj.id
    }));
    selectedObject = obj;
  }

  function handleMouseDown(event, obj, type, edge = null) {
    if (!obj.selected) return;
    
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    
    if (type === 'drag') {
      isDragging = true;
      startX = event.clientX - obj.x;
      startY = event.clientY - obj.y;
    } else if (type === 'resize') {
      isResizing = true;
      resizeEdge = edge;
      startX = event.clientX;
      startY = event.clientY;
      startWidth = obj.width;
      startHeight = obj.height;

      // 반대편 핸들의 위치 계산
      if (edge === 'right') {
        oppositeHandleX = obj.x;
        oppositeHandleY = obj.y + obj.height / 2;
      } else if (edge === 'left') {
        oppositeHandleX = obj.x + obj.width;
        oppositeHandleY = obj.y + obj.height / 2;
      } else if (edge === 'bottom') {
        oppositeHandleX = obj.x + obj.width / 2;
        oppositeHandleY = obj.y;
      } else if (edge === 'top') {
        oppositeHandleX = obj.x + obj.width / 2;
        oppositeHandleY = obj.y + obj.height;
      } else if (edge === 'top-left') {
        oppositeHandleX = obj.x + obj.width;
        oppositeHandleY = obj.y + obj.height;
      } else if (edge === 'top-right') {
        oppositeHandleX = obj.x;
        oppositeHandleY = obj.y + obj.height;
      } else if (edge === 'bottom-left') {
        oppositeHandleX = obj.x + obj.width;
        oppositeHandleY = obj.y;
      } else if (edge === 'bottom-right') {
        oppositeHandleX = obj.x;
        oppositeHandleY = obj.y;
      }
    } else if (type === 'rotate') {
      isRotating = true;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      startAngle = Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX
      ) * 180 / Math.PI;
      selectedObject._originAngle = selectedObject.angle;
    }
  }

  function handleMouseMove(event) {
    if (!selectedObject) return;

    if (isDragging) {
      const newX = event.clientX - startX;
      const newY = event.clientY - startY;
      
      selectedObject.x = newX;
      selectedObject.y = newY;
      
      objects = objects.map(obj => obj.id === selectedObject.id ? selectedObject : obj);
    } else if (isResizing) {
      const result = handleResize(event, selectedObject, resizeEdge);
      
      selectedObject.width = result.width;
      selectedObject.height = result.height;
      selectedObject.x = result.x;
      selectedObject.y = result.y;
      selectedObject.oppositeHandle = result.oppositeHandle;
      
      objects = objects.map(obj => obj.id === selectedObject.id ? selectedObject : obj);
    } else if (isRotating) {
      const centerX = selectedObject.x + selectedObject.width / 2;
      const centerY = selectedObject.y + selectedObject.height / 2;
      
      const currentAngle = Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX
      ) * 180 / Math.PI;
      
      let angleDiff = currentAngle - startAngle;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      
      selectedObject.angle = selectedObject._originAngle + angleDiff;
      objects = objects.map(obj => obj.id === selectedObject.id ? selectedObject : obj);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    isRotating = false;
    resizeEdge = null;
  }

  function addRectangle() {
    const newRect = {
      id: Date.now(),
      type: 'rect',
      x: 50,
      y: 50,
      width: 150,
      height: 100,
      angle: 0,
      color: '#ffb74d',
      selected: true
    };

    objects = objects.map(obj => ({
      ...obj,
      selected: false
    }));

    objects = [...objects, newRect];
    selectedObject = newRect;
  }

  function deleteObject(obj) {
    objects = objects.filter(o => o.id !== obj.id);
    selectedObject = null;
  }

  function duplicateObject(obj) {
    const newObj = {
      ...obj,
      id: Date.now(),
      x: obj.x + 20,
      y: obj.y + 20,
      selected: true
    };
    
    objects = objects.map(o => ({
      ...o,
      selected: false
    }));
    
    objects = [...objects, newObj];
    selectedObject = newObj;
  }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div class="editor-container">
  <div class="canvas">
    {#each objects as obj (obj.id)}
      <div
        class="object"
        style="
            left: {obj.x}px;
            top: {obj.y}px;
            width: {obj.width}px;
            height: {obj.height}px;
            background: {obj.color};
            opacity: 0.5;
          "></div>
      <div
        class="object"
        class:selected={obj.selected}
        on:click={() => selectObject(obj)}
        on:mousedown={(e) => handleMouseDown(e, obj, 'drag')}
        style="
          left: {obj.x}px;
          top: {obj.y}px;
          width: {obj.width}px;
          height: {obj.height}px;
          background: {obj.color};
          transform: rotate({obj.angle}deg);
        "
      >
        {#if obj.selected}
          <div 
            class="resize-handle resize-handle-tl"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'top-left')}
          ></div>
          <div 
            class="resize-handle resize-handle-t"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'top')}
          ></div>
          <div 
            class="resize-handle resize-handle-tr"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'top-right')}
          ></div>
          <div 
            class="resize-handle resize-handle-l"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'left')}
          ></div>
          <div 
            class="resize-handle resize-handle-r"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'right')}
          ></div>
          <div 
            class="resize-handle resize-handle-bl"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'bottom-left')}
          ></div>
          <div 
            class="resize-handle resize-handle-b"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'bottom')}
          ></div>
          <div 
            class="resize-handle resize-handle-br"
            on:mousedown={(e) => handleMouseDown(e, obj, 'resize', 'bottom-right')}
          ></div>
          <div 
            class="rotate-handle"
            on:mousedown={(e) => handleMouseDown(e, obj, 'rotate')}
          ></div>
        {/if}
        사각형
      </div>
      {#if obj.selected}
        {@const centerY = obj.y + obj.height / 2}
        <div 
          class="toolbox"
          style="
            left: {obj.x + obj.width/2}px;
            top: {centerY < 300 ? obj.y + obj.height + 10 : obj.y - 40}px;
          "
        >
          <button class="tool-btn" on:click|stopPropagation={() => duplicateObject(obj)}>
            <span class="tool-icon">📋</span>
          </button>
          <button class="tool-btn" on:click|stopPropagation={() => deleteObject(obj)}>
            <span class="tool-icon">🗑️</span>
          </button>
        </div>
      {/if}
    {/each}
  </div>
  <button on:click={addRectangle}>사각형 추가</button>
</div>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .canvas {
    position: relative;
    width: 800px;
    height: 600px;
    background: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
  }

  .object {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    border-radius: 8px;
    touch-action: none;
    user-select: none;
    font-weight: bold;
    cursor: move;
  }

  .object.selected {
    border: 2px solid #333;
  }

  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: white;
    border: 2px solid #333;
    border-radius: 50%;
  }

  .resize-handle-tl {
    top: -6px;
    left: -6px;
    cursor: nw-resize;
  }

  .resize-handle-t {
    top: -6px;
    left: calc(50% - 4px);
    cursor: n-resize;
  }

  .resize-handle-tr {
    top: -6px;
    right: -6px;
    cursor: ne-resize;
  }

  .resize-handle-l {
    top: calc(50% - 4px);
    left: -6px;
    cursor: w-resize;
  }

  .resize-handle-r {
    top: calc(50% - 4px);
    right: -6px;
    cursor: e-resize;
  }

  .resize-handle-bl {
    bottom: -6px;
    left: -6px;
    cursor: sw-resize;
  }

  .resize-handle-b {
    bottom: -6px;
    left: calc(50% - 4px);
    cursor: s-resize;
  }

  .resize-handle-br {
    bottom: -6px;
    right: -6px;
    cursor: se-resize;
  }

  .rotate-handle {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 20px;
    background: white;
    border: 2px solid #333;
    border-radius: 50%;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rotate-handle::before {
    content: "↻";
    font-size: 12px;
    color: #333;
  }

  .rotate-handle:active {
    cursor: grabbing;
  }

  .toolbox {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    background: white;
    padding: 4px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .tool-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tool-btn:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .tool-icon {
    font-size: 14px;
  }

  button {
    padding: 0.5rem 1rem;
    background: #4fc3f7;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }

  button:hover {
    background: #29b6f6;
  }
</style> 