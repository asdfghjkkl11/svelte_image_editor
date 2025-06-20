<script>
  export let width = 800;
  export let height = 600;

  let canvas;
  
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

  // 히스토리 관리
  let history = [];
  let currentHistoryIndex = 0;
  let isHistoryAction = false;

  function saveToHistory() {
    if (isHistoryAction) return;
    
    // 현재 상태 이후의 히스토리를 제거
    history = history.slice(0, currentHistoryIndex + 1);
    // 현재 상태를 히스토리에 추가
    history.push(JSON.stringify(objects));
    currentHistoryIndex = history.length - 1;
  }

  function undo() {
    if (currentHistoryIndex > 0) {
      isHistoryAction = true;
      currentHistoryIndex--;
      objects = JSON.parse(history[currentHistoryIndex]);
    }
  }

  function redo() {
    if (currentHistoryIndex < history.length - 1) {
      isHistoryAction = true;
      currentHistoryIndex++;
      objects = JSON.parse(history[currentHistoryIndex]);
    }
  }

  const colors = [
    '#4fc3f7', // 하늘색
    '#ffb74d', // 주황색
    '#81c784', // 초록색
    '#ba68c8', // 보라색
    '#ff8a65', // 연한 주황색
    '#64b5f6', // 파란색
    '#ffd54f', // 노란색
    '#e57373', // 빨간색
    '#4db6ac', // 청록색
    '#7986cb'  // 인디고색
  ];

  function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
  }

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
  let oppositeHandleX = 0;
  let oppositeHandleY = 0;
  let showRotationAngle = false;  // 회전 각도 표시 여부

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
    isHistoryAction = true;
  }

  function handleRotate(event, obj) {
    // 캔버스 DOM 얻기
    const canvasRect = canvas.getBoundingClientRect();

    // 사각형 중심 (캔버스 기준)
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;

    // 마우스 위치 (캔버스 기준)
    const mouseX = event.clientX - canvasRect.left;
    const mouseY = event.clientY - canvasRect.top;

    // 중심에서 마우스까지의 벡터
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    // 머리(위쪽)이 마우스를 바라보도록 각도 계산 (+90도)
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

    // rotate-handle이 아래쪽에 있으면 반대로
    if (getRotateHandlePosition(obj) === 'bottom') {
      angle += 180;
    }

    obj.angle = angle;
    objects = objects.map(o => o.id === obj.id ? obj : o);
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
    } else if (type === 'rotate') {
      isRotating = true;
      showRotationAngle = true;
      // 중심 좌표를 사각형의 중심(x, y, width, height)으로 계산
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;
      startAngle = Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX
      ) * 180 / Math.PI;
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
      handleRotate(event, selectedObject);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    isRotating = false;
    showRotationAngle = false;
    resizeEdge = null;
  }

  // 객체 상태가 변경될 때마다 히스토리에 저장 (마우스 이벤트와 선택 제외)
  $: {
    if (objects && !isDragging && !isResizing && !isRotating && !isHistoryAction) {
      saveToHistory();
    }
    if (isHistoryAction) {
      isHistoryAction = false;
    }
  }

  function addRectangle() {
    const x = 50;
    const y = 50;
    const width = 150;
    const height = 100;
    const newRect = {
      id: Date.now(),
      type: 'rect',
      x,
      y,
      width,
      height,
      angle: 0,
      color: getRandomColor(),
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

  function bringForward(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex < objects.length - 1) {
      const newObjects = [...objects];
      const temp = newObjects[currentIndex];
      newObjects[currentIndex] = newObjects[currentIndex + 1];
      newObjects[currentIndex + 1] = temp;
      objects = newObjects;
    }
  }

  function sendBackward(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex > 0) {
      const newObjects = [...objects];
      const temp = newObjects[currentIndex];
      newObjects[currentIndex] = newObjects[currentIndex - 1];
      newObjects[currentIndex - 1] = temp;
      objects = newObjects;
    }
  }

  function bringToFront(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex !== -1) {
      const newObjects = [...objects];
      const [movedObject] = newObjects.splice(currentIndex, 1);
      newObjects.push(movedObject);
      objects = newObjects;
    }
  }

  function sendToBack(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex !== -1) {
      const newObjects = [...objects];
      const [movedObject] = newObjects.splice(currentIndex, 1);
      newObjects.unshift(movedObject);
      objects = newObjects;
    }
  }

  // 사각형별 rotate-handle 위치 계산 함수 (회전 고려)
  function getRotateHandlePosition(obj) {
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const rad = (obj.angle || 0) * Math.PI / 180;
    // 머리(위쪽) 좌표 계산 (중심에서 반높이만큼 위로, 회전 적용)
    const headX = centerX + Math.sin(rad) * (-obj.height / 2);
    const headY = centerY - Math.cos(rad) * (obj.height / 2);
    // 캔버스 기준 y=300보다 위면 아래쪽에, 아니면 위쪽에
    return (headY < 300) ? 'top' : 'bottom';
  }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div class="editor-container">
  <div class="object-toolbox">
    <div class="tool-group">
      <button on:click={addRectangle}>사각형 추가</button>
    </div>
    <div class="tool-group">
      <button on:click={undo} disabled={currentHistoryIndex <= 0}>실행취소</button>
      <button on:click={redo} disabled={currentHistoryIndex >= history.length - 1}>되돌리기</button>
    </div>
  </div>
  <div class="canvas-container">
    <div class="canvas" bind:this={canvas}>
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
              style="
                {getRotateHandlePosition(obj) === 'top' 
                  ? 'top: -30px; bottom: unset;' 
                  : 'top: unset; bottom: -30px;'}
                left: 50%; 
                transform: translateX(-50%);"
              on:mousedown={(e) => handleMouseDown(e, obj, 'rotate')}
            ></div>
            {#if showRotationAngle && obj.id === selectedObject?.id}
              <div class="rotation-angle">
                {Math.round(obj.angle)}°
              </div>
            {/if}
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
            <button class="tool-btn" on:click|stopPropagation={() => bringToFront(obj)}>
              맨 앞으로
            </button>
            <button class="tool-btn" on:click|stopPropagation={() => bringForward(obj)}>
              앞으로
            </button>
            <button class="tool-btn" on:click|stopPropagation={() => sendBackward(obj)}>
              뒤로
            </button>
            <button class="tool-btn" on:click|stopPropagation={() => sendToBack(obj)}>
              맨 뒤로
            </button>
            <button class="tool-btn" on:click|stopPropagation={() => duplicateObject(obj)}>
              복제
            </button>
            <button class="tool-btn" on:click|stopPropagation={() => deleteObject(obj)}>
              삭제
            </button>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .editor-container {
    display: flex;
    gap: 1rem;
  }

  .object-toolbox {
    width: 200px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 1px solid #ccc;
  }

  .tool-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .canvas-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
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
    transform-origin: center;
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

  .rotation-angle {
    position: absolute;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
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
    padding: 4px 8px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    color: #333;
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

  button:hover:not(:disabled) {
    background: #29b6f6;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style> 