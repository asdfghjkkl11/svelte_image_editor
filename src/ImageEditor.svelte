<script>
  import { onMount, onDestroy } from 'svelte';

  // 1. 상수 및 상태 변수 선언
  export let width = 600; // 외부에서 받는 캔버스 너비
  export let height = 1800; // 외부에서 받는 캔버스 높이
  let scale = 0.5; // 캔버스 스케일(확대/축소 비율)
  let canvas_y = (height * scale) / 2; // 캔버스의 Y 중심 좌표(스케일 적용)
  let canvas; // 캔버스 DOM 참조
  let canvas_rect; // 캔버스 박스 영역

  // 오브젝트(사각형 등) 상태 배열
  let objects = [];
  // 선택된 오브젝트
  let selected_object = null;

  // 드래그/리사이즈/회전 상태 플래그 및 관련 변수
  let is_dragging = false;
  let is_resizing = false;
  let is_rotating = false;
  let start_x = 0;
  let start_y = 0;
  let start_width = 0;
  let start_height = 0;
  let start_angle = 0;
  let resize_edge = null;
  let min_size = 20;
  let show_rotation_angle = false;  // 회전 각도 표시 여부
  let rotate_handle_position = false;

  // 히스토리(undo/redo) 관리용 배열 및 인덱스
  let history = [];
  let current_history_index = 0;
  let is_history_action = false;

  // 사각형 색상 팔레트
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

  // 리사이즈 방향 정의
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

  let canvas_wrapper; // .canvas-wrapper DOM 참조
  let canvas_container; // .canvas-container DOM 참조
  let container_align = 'center'; // 동적으로 바뀌는 align-items 값

  // 2. 유틸 함수
  // 랜덤 색상 반환
  function get_random_color() {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 사각형별 위치(top/bottom) 반환
  function get_object_position(obj) {
    const center_y = obj.y + obj.height / 2;

    // 캔버스 기준 y=canvas_y보다 위면 아래쪽에, 아니면 위쪽에
    return (center_y < canvas_y);
  }

  // 사각형별 rotate-handle 위치(top/bottom) 반환
  function get_rotate_handle_position(obj) {
    const center_y = obj.y + obj.height / 2;
    const rad = (obj.angle || 0) * Math.PI / 180;
    // 머리(위쪽) 좌표 계산 (중심에서 반높이만큼 위로, 회전 적용)
    const head_y = center_y - Math.cos(rad) * (obj.height / 2);

    // head_y와 canvas_y가 center_y 기준으로 같은 방향에 있으면 true(위), 아니면 false(아래)
    // 즉, (head_y - center_y) * (canvas_y - center_y) < 0 이면 rotate-handle을 위에, 아니면 아래에 둠
    return (head_y - center_y) * (canvas_y - center_y) < 0;
  }

  // 리사이즈 시 반대편 핸들의 좌표를 계산하는 함수
  function calculate_opposite_handle(edge, object, angle) {
    const center_x = object.x + object.width / 2;
    const center_y = object.y + object.height / 2;
    let relative_x = 0;
    let relative_y = 0;
    if (edge.includes('left')) relative_x = 1;
    if (edge.includes('right')) relative_x = -1;
    if (edge.includes('top')) relative_y = 1;
    if (edge.includes('bottom')) relative_y = -1;
    // 회전 적용
    const rotated_x = relative_x * Math.cos(angle) - relative_y * Math.sin(angle);
    const rotated_y = relative_x * Math.sin(angle) + relative_y * Math.cos(angle);
    return {
      x: center_x + rotated_x * object.width / 2,
      y: center_y + rotated_y * object.height / 2
    };
  }

  // 사각형을 추가하는 함수
  function add_rectangle() {
    const x = 50;
    const y = 50;
    const width = 300;
    const height = 200;
    const new_rect = {
      id: Date.now(),
      type: 'rect',
      x,
      y,
      width,
      height,
      angle: 0,
      color: get_random_color(),
      selected: true,
      text: '텍스트',
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      textAlign: 'center',
      textColor: '#000000'
    };
    // 기존 선택 해제
    objects = objects.map(obj => ({ ...obj, selected: false }));
    objects = [...objects, new_rect];
    selected_object = new_rect;
  }

  // 오브젝트(사각형 등)를 삭제하는 함수
  function delete_object(obj) {
    objects = objects.filter(o => o.id !== obj.id);
    selected_object = null;
  }

  // 오브젝트를 복제하는 함수
  function duplicate_object(obj) {
    const new_obj = {
      ...obj,
      id: Date.now(),
      x: obj.x + 20,
      y: obj.y + 20,
      selected: true
    };
    // 기존 선택 해제
    objects = objects.map(o => ({ ...o, selected: false }));
    objects = [...objects, new_obj];
    selected_object = new_obj;
  }

  // 오브젝트를 한 단계 앞으로 이동시키는 함수
  function bring_forward(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex < objects.length - 1) {
      const newObjects = [...objects];
      const temp = newObjects[currentIndex];
      newObjects[currentIndex] = newObjects[currentIndex + 1];
      newObjects[currentIndex + 1] = temp;
      objects = newObjects;
    }
  }

  // 오브젝트를 한 단계 뒤로 이동시키는 함수
  function send_backward(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex > 0) {
      const newObjects = [...objects];
      const temp = newObjects[currentIndex];
      newObjects[currentIndex] = newObjects[currentIndex - 1];
      newObjects[currentIndex - 1] = temp;
      objects = newObjects;
    }
  }

  // 오브젝트를 맨 앞으로 이동시키는 함수
  function bring_to_front(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex !== -1) {
      const newObjects = [...objects];
      const [movedObject] = newObjects.splice(currentIndex, 1);
      newObjects.push(movedObject);
      objects = newObjects;
    }
  }

  // 오브젝트를 맨 뒤로 이동시키는 함수
  function send_to_back(obj) {
    const currentIndex = objects.findIndex(o => o.id === obj.id);
    if (currentIndex !== -1) {
      const newObjects = [...objects];
      const [movedObject] = newObjects.splice(currentIndex, 1);
      newObjects.unshift(movedObject);
      objects = newObjects;
    }
  }

  // 오브젝트를 선택하는 함수
  function select_object(obj) {
    objects = objects.map(o => ({ ...o, selected: o.id === obj.id }));
    selected_object = obj;
    is_history_action = true;
  }

  // 현재 상태를 히스토리에 저장하는 함수
  function save_to_history() {
    if (is_history_action) return;
    history = history.slice(0, current_history_index + 1);
    history.push(JSON.stringify(objects));
    current_history_index = history.length - 1;
  }

  // 실행취소(undo) 함수
  function undo() {
    if (current_history_index > 0) {
      is_history_action = true;
      current_history_index--;
      objects = JSON.parse(history[current_history_index]);
    }
  }

  // 다시실행(redo) 함수
  function redo() {
    if (current_history_index < history.length - 1) {
      is_history_action = true;
      current_history_index++;
      objects = JSON.parse(history[current_history_index]);
    }
  }

  // 리사이즈 동작을 처리하는 함수
  function handle_resize(event, object, edge) {
    const direction = directions[edge];
    const angle = object.angle * Math.PI / 180;
    const delta_x = event.clientX - start_x;
    const delta_y = event.clientY - start_y;
    const rotated_delta_x = delta_x * Math.cos(-angle) - delta_y * Math.sin(-angle);
    const rotated_delta_y = delta_x * Math.sin(-angle) + delta_y * Math.cos(-angle);
    const new_width = Math.max(min_size, start_width + rotated_delta_x * direction.x);
    const new_height = Math.max(min_size, start_height + rotated_delta_y * direction.y);
    const before_opposite_handle = calculate_opposite_handle(edge, object, angle);
    object.width = new_width;
    object.height = new_height;
    const after_opposite_handle = calculate_opposite_handle(edge, object, angle);
    let new_x = object.x;
    let new_y = object.y;

    const opposite_delta_x = before_opposite_handle.x - after_opposite_handle.x;
    const opposite_delta_y = before_opposite_handle.y - after_opposite_handle.y;
    new_x += opposite_delta_x;
    new_y += opposite_delta_y;

    return {
      width: new_width,
      height: new_height,
      x: new_x,
      y: new_y
    };
  }

  // 회전 동작을 처리하는 함수
  function handle_rotate(event, obj) {
    const center_x = obj.x + obj.width / 2;
    const center_y = obj.y + obj.height / 2;
    const mouse_x = event.clientX - canvas_rect.left;
    const mouse_y = event.clientY - canvas_rect.top;
    const dx = mouse_x - center_x;
    const dy = mouse_y - center_y;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (!rotate_handle_position) {
      angle += 180;
    }
    obj.angle = angle;
    objects = objects.map(o => o.id === obj.id ? obj : o);
  }

  // 마우스 다운(드래그/리사이즈/회전 시작) 처리 함수
  function handle_mouse_down(event, obj, type, edge = null) {
    if (!obj.selected) return;
    selected_object = obj; // 항상 최신 객체 정보를 사용하도록 업데이트
    event.stopPropagation();
    if (type === 'drag') {
      is_dragging = true;
      start_x = event.clientX - obj.x;
      start_y = event.clientY - obj.y;
    } else if (type === 'resize') {
      is_resizing = true;
      resize_edge = edge;
      start_x = event.clientX;
      start_y = event.clientY;
      start_width = obj.width;
      start_height = obj.height;
    } else if (type === 'rotate') {
      is_rotating = true;
      show_rotation_angle = true;
      const center_x = obj.x + obj.width / 2;
      const center_y = obj.y + obj.height / 2;
      start_angle = Math.atan2(
        event.clientY - center_y,
        event.clientX - center_x
      ) * 180 / Math.PI;
      rotate_handle_position = get_rotate_handle_position(obj);
    }
  }

  // 마우스 이동(드래그/리사이즈/회전) 처리 함수
  function handle_mouse_move(event) {
    if (!selected_object) return;
    if (is_dragging) {
      const new_x = event.clientX - start_x;
      const new_y = event.clientY - start_y;
      selected_object.x = new_x;
      selected_object.y = new_y;
      objects = objects.map(obj => obj.id === selected_object.id ? selected_object : obj);
    } else if (is_resizing) {
      const result = handle_resize(event, selected_object, resize_edge);
      selected_object.width = result.width;
      selected_object.height = result.height;
      selected_object.x = result.x;
      selected_object.y = result.y;
      objects = objects.map(obj => obj.id === selected_object.id ? selected_object : obj);
    } else if (is_rotating) {
      handle_rotate(event, selected_object);
    }
  }

  // 마우스 업(모든 상태 해제) 처리 함수
  function handle_mouse_up() {
    is_dragging = false;
    is_resizing = false;
    is_rotating = false;
    show_rotation_angle = false;
    resize_edge = null;
  }

  // 캔버스 빈 공간 클릭 시 선택 해제 함수
  function handle_canvas_mouse_down(event) {
    if (event.target === canvas) {
      selected_object = null;
      objects = objects.map(o => ({ ...o, selected: false }));
    }
  }

  // 캔버스와 wrapper의 높이를 비교해 align-items를 동적으로 조정하는 함수
  function update_container_align() {
    if (!canvas_wrapper || !canvas_container) return;
    const wrapper_height = canvas_wrapper.clientHeight;
    const canvas_height = height * scale;
    // 캔버스가 wrapper보다 크면 위에서부터, 아니면 가운데
    container_align = canvas_height > wrapper_height ? 'flex-start' : 'center';
    canvas_rect = canvas.getBoundingClientRect();
  }

  // mount 시 resize 이벤트 등록, 언마운트 시 해제
  onMount(() => {
    update_container_align();
    window.addEventListener('resize', update_container_align);
    return () => {
      window.removeEventListener('resize', update_container_align);
    };
  });

  // scale, height이 바뀔 때마다 align 업데이트
  $: update_container_align();

  // 6. 반응형 히스토리 저장(마우스 이벤트와 선택 제외)
  $: {
    if (objects && !is_dragging && !is_resizing && !is_rotating && !is_history_action) {
      save_to_history();
    }
    if (is_history_action) {
      is_history_action = false;
    }
  }
</script>

<svelte:window on:mousemove={handle_mouse_move} on:mouseup={handle_mouse_up} />

<div class="editor-container">
  <div class="object-toolbox">
    <div class="tool-group">
      <button on:click={add_rectangle}>사각형 추가</button>
    </div>
    <div class="tool-group">
      <button on:click={undo} disabled={current_history_index <= 0}>실행취소</button>
      <button on:click={redo} disabled={current_history_index >= history.length - 1}>되돌리기</button>
    </div>
  </div>
  <div class="canvas-wrapper" bind:this={canvas_wrapper}>
    <div class="canvas-container" bind:this={canvas_container} style="display: flex; align-items: {container_align}; justify-content: center; min-height: 100%; width: 100%;">
      <div class="canvas" bind:this={canvas} style="width: {width * scale}px; height: {height * scale}px; "
        on:mousedown={handle_canvas_mouse_down}>
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
            style="
                left: {canvas_rect.left + obj.x + 1}px;
                top: {canvas_rect.top + obj.y + 1}px;
                width: {obj.width}px;
                height: {obj.height}px;
                background: {obj.color};
                transform: rotate({obj.angle}deg);
                position: fixed;
                opacity: 0.5;
              "></div>
          <div
            class="object"
            style="
              left: {obj.x}px;
              top: {obj.y}px;
              width: {obj.width}px;
              height: {obj.height}px;
              background: {obj.color};
              transform: rotate({obj.angle}deg);
            "
          >
            <div
                    class="text-element"
                    style="
                font-size: {obj.fontSize}px;
                font-family: {obj.fontFamily};
                font-weight: {obj.fontWeight};
                text-align: {obj.textAlign};
                color: {obj.textColor};
              "
            >{@html obj.text}</div>
          </div>
          <div
            class="object object-wrapper"
            class:selected={obj.selected}
            on:click={() => select_object(obj)}
            on:mousedown={(e) => handle_mouse_down(e, obj, 'drag')}
            style="
                left: {canvas_rect.left + obj.x + 1}px;
                top: {canvas_rect.top + obj.y + 1}px;
                width: {obj.width}px;
                height: {obj.height}px;
                transform: rotate({obj.angle}deg);
                position: fixed;
              ">
            <div
              class="text-element"
              contenteditable="true"
              style="
                font-size: {obj.fontSize}px;
                font-family: {obj.fontFamily};
                font-weight: {obj.fontWeight};
                text-align: {obj.textAlign};
                color: {obj.textColor};
              "
              on:mousedown|stopPropagation
              bind:innerText={obj.text}
              on:input={() => {
                objects = [...objects];
              }}
            ></div>
            {#if obj.selected}
              <div
                class="resize-handle resize-handle-tl"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'top-left')}
              ></div>
              <div
                class="resize-handle resize-handle-t"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'top')}
              ></div>
              <div
                class="resize-handle resize-handle-tr"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'top-right')}
              ></div>
              <div
                class="resize-handle resize-handle-l"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'left')}
              ></div>
              <div
                class="resize-handle resize-handle-r"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'right')}
              ></div>
              <div
                class="resize-handle resize-handle-bl"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'bottom-left')}
              ></div>
              <div
                class="resize-handle resize-handle-b"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'bottom')}
              ></div>
              <div
                class="resize-handle resize-handle-br"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'resize', 'bottom-right')}
              ></div>
              <div
                class="rotate-handle"
                style="
                  {get_rotate_handle_position(obj)
                    ? 'top: -30px; bottom: unset;'
                    : 'top: unset; bottom: -30px;'}
                  left: 50%;
                  transform: translateX(-50%);"
                on:mousedown={(e) => handle_mouse_down(e, obj, 'rotate')}
              ></div>
              {#if show_rotation_angle && obj.id === selected_object?.id}
                <div class="rotation-angle">
                  {(Math.round(obj.angle)+360)%360}°
                </div>
              {/if}

            {/if}
          </div>
          {#if obj.selected}
            <div
              class="toolbox"
              style="
                position: fixed;
                left: {canvas_rect.left + (obj.x + obj.width/2)}px;
                top: {canvas_rect.top + (get_object_position(obj) ? (obj.y + obj.height + 10) : (obj.y - 40))}px;
                transform: translateX(-50%);
              "
            >
              <button class="tool-btn" on:click|stopPropagation={() => bring_to_front(obj)}>
                맨 앞으로
              </button>
              <button class="tool-btn" on:click|stopPropagation={() => bring_forward(obj)}>
                앞으로
              </button>
              <button class="tool-btn" on:click|stopPropagation={() => send_backward(obj)}>
                뒤로
              </button>
              <button class="tool-btn" on:click|stopPropagation={() => send_to_back(obj)}>
                맨 뒤로
              </button>
              <button class="tool-btn" on:click|stopPropagation={() => duplicate_object(obj)}>
                복제
              </button>
              <button class="tool-btn" on:click|stopPropagation={() => delete_object(obj)}>
                삭제
              </button>
              <input type="color" class="tool-btn" bind:value={obj.textColor} on:mousedown|stopPropagation on:input={() => objects = [...objects]} />
              <input type="number" class="tool-btn" bind:value={obj.fontSize} on:mousedown|stopPropagation on:input={() => objects = [...objects]} style="width: 60px" />
              <select class="tool-btn" bind:value={obj.textAlign} on:mousedown|stopPropagation on:change={() => objects = [...objects]}>
                <option value="left">좌</option>
                <option value="center">중</option>
                <option value="right">우</option>
              </select>
              <button class="tool-btn" on:click|stopPropagation={() => {obj.fontWeight = obj.fontWeight === 'bold' ? 'normal' : 'bold'; objects = [...objects];}}>
                <b>B</b>
              </button>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .editor-container {
    height: 100vh;
    padding: 8px;
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
  .canvas-wrapper{
    height: 100%;
    position: relative;
    display: flex;
    flex: 1;
    overflow: scroll;
  }

  .canvas-container {
    height: 100%;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .canvas {
    background: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
  }

  .object {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    border-radius: 1px;
    touch-action: none;
    user-select: none;
    font-weight: bold;
    cursor: move;
    transform-origin: center;
  }

  .object.selected {
    border: 2px solid #333;
  }

  .text-element {
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: pre-wrap;
    word-break: break-word;
    cursor: text;
    outline: none;
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
    top: -5px;
    left: -5px;
    cursor: nw-resize;
  }

  .resize-handle-t {
    top: -5px;
    left: calc(50% - 4px);
    cursor: n-resize;
  }

  .resize-handle-tr {
    top: -5px;
    right: -5px;
    cursor: ne-resize;
  }

  .resize-handle-l {
    top: calc(50% - 4px);
    left: -5px;
    cursor: w-resize;
  }

  .resize-handle-r {
    top: calc(50% - 4px);
    right: -5px;
    cursor: e-resize;
  }

  .resize-handle-bl {
    bottom: -5px;
    left: -5px;
    cursor: sw-resize;
  }

  .resize-handle-b {
    bottom: -5px;
    left: calc(50% - 4px);
    cursor: s-resize;
  }

  .resize-handle-br {
    bottom: -5px;
    right: -5px;
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
    position: fixed;
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
