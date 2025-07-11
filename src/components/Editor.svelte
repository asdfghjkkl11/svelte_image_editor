<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import ImageObject from './ImageObject.svelte';
    import TextObject from './TextObject.svelte';

    const dispatch = createEventDispatcher();

    // 1. 상수 및 상태 변수 선언
    export let width = 600; // 외부에서 받는 캔버스 너비
    export let height = 1800; // 외부에서 받는 캔버스 높이
    export let scale = 0.5; // 캔버스 스케일(확대/축소 비율)
    let canvas_y = (height * scale) / 2; // 캔버스의 Y 중심 좌표(스케일 적용)

    // 오브젝트(사각형 등) 상태 배열
    let objects = [];
    // 선택된 오브젝트
    let selected_object = {};

    // 드래그/리사이즈/회전 상태 플래그 및 관련 변수
    let is_dragging = false;
    let is_resizing = false;
    let is_rotating = false;
    let start_x = 0;
    let start_y = 0;
    let start_width = 0;
    let start_height = 0;
    let start_obj_x = 0;
    let start_obj_y = 0;
    let resize_edge = null;
    let min_size = 20;
    let show_rotation_angle = false; // 회전 각도 표시 여부
    let rotate_handle_position = false;

    // 히스토리(undo/redo) 관리용 배열 및 인덱스
    let history = [];
    let current_history_index = 0;
    let is_history_action = false;
    let is_editing_text = false;

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
        '#7986cb', // 인디고색
    ];

    let canvas_wrapper;
    let canvas_container;
    let canvas;
    let canvas_rect;
    let container_align = 'center';

    // Single prop to trigger actions from parent
    export let action = { type: null, payload: null };

    // 2. 유틸 함수
    // 랜덤 색상 반환
    function get_random_color() {
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 사각형별 rotate-handle 위치(top/bottom) 반환
    function get_rotate_handle_position(obj) {
        const center_y = obj.y + obj.height / 2;
        const rad = ((obj.angle || 0) * Math.PI) / 180;
        // 머리(위쪽) 좌표 계산 (중심에서 반높이만큼 위로, 회전 적용)
        const head_y = center_y - Math.cos(rad) * (obj.height / 2);

        // head_y와 canvas_y가 center_y 기준으로 같은 방향에 있으면 true(위), 아니면 false(아래)
        // 즉, (head_y - center_y) * (canvas_y - center_y) < 0 이면 rotate-handle을 위에, 아니면 아래에 둠
        return (head_y - center_y) * (canvas_y - center_y) < 0;
    }

    // 사각형을 추가하는 함수
    function add_text_object() {
        const x = 50;
        const y = 50;
        const width = 300;
        const height = 200;
        const new_text_object = {
            id: Date.now(),
            type: 'text',
            x,
            y,
            width,
            height,
            angle: 0,
            color: 'transparent', // 기본 색상으로 변경
            selected: true,
            text: '텍스트',
        };
        // 기존 선택 해제
        objects = objects.map((obj) => ({ ...obj, selected: false }));
        objects = [...objects, new_text_object];
        selected_object = new_text_object;
    }

    // 텍스트 오브젝트 배경색 설정 함수
    function set_text_object_background_color(color) {
        if (selected_object && selected_object.type === 'text') {
            selected_object.color = color;
            objects = objects.map((obj) =>
                obj.id === selected_object.id ? selected_object : obj,
            );
        }
    }

    // 이미지를 추가하는 함수
    async function add_image_object(src) {
        const img = new Image();
        img.src = src;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        let img_width = img.naturalWidth * scale;
        let img_height = img.naturalHeight * scale;

        // 캔버스 크기를 초과하지 않도록 추가 스케일링
        const canvas_scaled_width = width * scale;
        const canvas_scaled_height = height * scale;

        if (img_width > canvas_scaled_width || img_height > canvas_scaled_height) {
            const width_ratio = canvas_scaled_width / img_width;
            const height_ratio = canvas_scaled_height / img_height;
            const ratio = Math.min(width_ratio, height_ratio);

            img_width *= ratio;
            img_height *= ratio;
        }

        const x = (canvas_scaled_width - img_width) / 2; // 캔버스 중앙에 배치
        const y = (canvas_scaled_height - img_height) / 2;

        const new_image_object = {
            id: Date.now(),
            type: 'image',
            x,
            y,
            width: img_width,
            height: img_height,
            angle: 0,
            src,
            alt: 'Uploaded Image',
            selected: true,
        };
        // 기존 선택 해제
        objects = objects.map((obj) => ({ ...obj, selected: false }));
        objects = [...objects, new_image_object];
        selected_object = new_image_object;
    }

    // 오브젝트(사각형 등)를 삭제하는 함수
    function delete_object() {
        if (!selected_object.id) return;
        objects = objects.filter((o) => o.id !== selected_object.id);
        selected_object = {};
    }

    // 오브젝트를 복제하는 함수
    function duplicate_object() {
        if (!selected_object.id) return;
        const new_obj = {
            ...selected_object,
            id: Date.now(),
            x: selected_object.x + 20,
            y: selected_object.y + 20,
            selected: true,
        };
        // 기존 선택 해제
        objects = objects.map((o) => ({ ...o, selected: false }));
        objects = [...objects, new_obj];
        selected_object = new_obj;
    }

    // 오브젝트를 한 단계 앞으로 이동시키는 함수
    function bring_forward() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex < objects.length - 1) {
            const newObjects = [...objects];
            const temp = newObjects[currentIndex];
            newObjects[currentIndex] = newObjects[currentIndex + 1];
            newObjects[currentIndex + 1] = temp;
            objects = newObjects;
        }
    }

    // 오브젝트를 한 단계 뒤로 이동시키는 함수
    function send_backward() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex > 0) {
            const newObjects = [...objects];
            const temp = newObjects[currentIndex];
            newObjects[currentIndex] = newObjects[currentIndex - 1];
            newObjects[currentIndex - 1] = temp;
            objects = newObjects;
        }
    }

    // 오브젝트를 맨 앞으로 이동시키는 함수
    function bring_to_front() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex !== -1) {
            const newObjects = [...objects];
            const [movedObject] = newObjects.splice(currentIndex, 1);
            newObjects.push(movedObject);
            objects = newObjects;
        }
    }

    // 오브젝트를 맨 뒤로 이동시키는 함수
    function send_to_back() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex !== -1) {
            const newObjects = [...objects];
            const [movedObject] = newObjects.splice(currentIndex, 1);
            newObjects.unshift(movedObject);
            objects = newObjects;
        }
    }

    // 오브젝트를 선택하는 함수
    function select_object(obj) {
        objects = objects.map((o) => ({ ...o, selected: o.id === obj.id }));
        selected_object = obj;
        is_history_action = true;
    }

    // 현재 상태를 히스토리에 저장하는 함수
    function save_to_history() {
        history = history.slice(0, current_history_index + 1);
        history.push(JSON.stringify(objects));
        current_history_index = history.length - 1;
        dispatch('history_updated', { current_history_index, history_length: history.length });
    }

    // 실행취소(undo) 함수
    function undo() {
        if (current_history_index > 0) {
            is_history_action = true;
            current_history_index--;
            objects = JSON.parse(history[current_history_index]);
            dispatch('history_updated', { current_history_index, history_length: history.length });
        }
    }

    // 다시실행(redo) 함수
    function redo() {
        if (current_history_index < history.length - 1) {
            is_history_action = true;
            current_history_index++;
            objects = JSON.parse(history[current_history_index]);
            dispatch('history_updated', { current_history_index, history_length: history.length });
        }
    }

    // 텍스트 서식 적용 함수
    function format_text(command, value = null) {
        document.execCommand(command, false, value);
        objects = objects;
    }

    function change_font_size(value) {
        document.execCommand('fontSize', false, '7');
        let fontElements =
            selected_object.text_element.querySelector('font[size="7"]');
        fontElements.removeAttribute('size');
        fontElements.style.fontSize = `${value}px`;
        fontElements.outerHTML
            .replace('<font', '<span')
            .replace('</font>', '</span>');
        let text = fontElements.outerHTML;
        document.execCommand('delete', false, null);
        document.execCommand('insertHTML', false, text);
        objects = objects;
    }

    function set_is_editing_text(value) {
        is_editing_text = value;
    }

    // Reactive declarations to trigger functions based on props
    $: if (action.type) {
        switch (action.type) {
            case 'add_text_object':
                add_text_object();
                break;
            case 'add_image_object':
                add_image_object(action.payload);
                break;
            case 'delete_object':
                delete_object();
                break;
            case 'duplicate_object':
                duplicate_object();
                break;
            case 'bring_forward':
                bring_forward();
                break;
            case 'send_backward':
                send_backward();
                break;
            case 'bring_to_front':
                bring_to_front();
                break;
            case 'send_to_back':
                send_to_back();
                break;
            case 'undo':
                undo();
                break;
            case 'redo':
                redo();
                break;
            case 'format_text':
                format_text(action.payload.command, action.payload.value);
                break;
            case 'change_font_size':
                change_font_size(action.payload);
                break;
            case 'set_text_object_background_color':
                set_text_object_background_color(action.payload);
                break;
            case 'set_is_editing_text':
                set_is_editing_text(action.payload);
                break;
        }
        // Reset action to prevent re-triggering
        action = { type: null, payload: null };
    }

    // 리사이즈 동작을 처리하는 함수
    function handle_resize(event, object, edge) {
        const rad = (object.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // 마우스 위치 (캔버스 기준)
        const mouse_x = event.clientX - canvas_rect.left;
        const mouse_y = event.clientY - canvas_rect.top;

        // 시작 시점의 객체 중심
        const center_x = start_obj_x + start_width / 2;
        const center_y = start_obj_y + start_height / 2;

        // 핸들 방향 벡터 (로컬 좌표계)
        const dir_x = edge.includes('left')
            ? -1
            : edge.includes('right')
              ? 1
              : 0;
        const dir_y = edge.includes('top')
            ? -1
            : edge.includes('bottom')
              ? 1
              : 0;

        // 피벗(반대편 핸들) 위치 계산 (월드 좌표계)
        const pivot_local_x = (-dir_x * start_width) / 2;
        const pivot_local_y = (-dir_y * start_height) / 2;
        const pivot_offset_x = pivot_local_x * cos - pivot_local_y * sin;
        const pivot_offset_y = pivot_local_x * sin + pivot_local_y * cos;
        const pivot_x = center_x + pivot_offset_x;
        const pivot_y = center_y + pivot_offset_y;

        // 피벗에서 마우스까지의 벡터
        const vec_x = mouse_x - pivot_x;
        const vec_y = mouse_y - pivot_y;

        // 벡터를 객체의 로컬 좌표계로 변환 (회전의 역연산)
        const unrotated_dx = vec_x * cos + vec_y * sin;
        const unrotated_dy = -vec_x * sin + vec_y * cos;

        let new_width, new_height;

        // 핸들 종류에 따라 새 너비/높이 결정
        if (dir_x === 0) {
            // 상하 핸들
            new_width = start_width;
            new_height = Math.max(min_size, Math.abs(unrotated_dy));
        } else if (dir_y === 0) {
            // 좌우 핸들
            new_width = Math.max(min_size, Math.abs(unrotated_dx));
            new_height = start_height;
        } else {
            // 모서리 핸들
            new_width = Math.max(min_size, Math.abs(unrotated_dx));
            new_height = Math.max(min_size, Math.abs(unrotated_dy));
        }

        // 새 중심점 계산
        const center_offset_local_x = unrotated_dx / 2;
        const center_offset_local_y = unrotated_dy / 2;
        const center_offset_x =
            center_offset_local_x * cos - center_offset_local_y * sin;
        const center_offset_y =
            center_offset_local_x * sin + center_offset_local_y * cos;
        const new_center_x = pivot_x + center_offset_x;
        const new_center_y = pivot_y + center_offset_y;

        return {
            width: new_width,
            height: new_height,
            x: new_center_x - new_width / 2,
            y: new_center_y - new_height / 2,
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
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

        if (!rotate_handle_position) {
            angle += 180;
        }
        obj.angle = angle;
        objects = objects.map((o) => (o.id === obj.id ? o : o));
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
            start_obj_x = obj.x;
            start_obj_y = obj.y;
        } else if (type === 'rotate') {
            is_rotating = true;
            show_rotation_angle = true;
            rotate_handle_position = get_rotate_handle_position(obj);
        }
    }

    // 마우스 이동(드래그/리사이즈/회전) 처리 함수
    function handle_mouse_move(event) {
        if (!selected_object.id) return;

        if (is_dragging) {
            const new_x = event.clientX - start_x;
            const new_y = event.clientY - start_y;
            selected_object.x = new_x;
            selected_object.y = new_y;
            objects = objects.map((obj) =>
                obj.id === selected_object.id ? selected_object : obj,
            );
        } else if (is_resizing) {
            const result = handle_resize(event, selected_object, resize_edge);
            selected_object.width = result.width;
            selected_object.height = result.height;
            selected_object.x = result.x;
            selected_object.y = result.y;
            objects = objects.map((obj) =>
                obj.id === selected_object.id ? selected_object : obj,
            );
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
            selected_object = {};
            objects = objects.map((o) => ({ ...o, selected: false }));
        }
    }

    function update_container_align() {
        if (!canvas_wrapper || !canvas_container) return;

        const wrapper_height = canvas_wrapper.clientHeight;
        const canvas_height = height * scale;

        container_align =
            canvas_height > wrapper_height ? 'flex-start' : 'center';
        canvas_rect = canvas.getBoundingClientRect();
    }

    onMount(() => {
        update_container_align();
        window.addEventListener('resize', update_container_align);
        return () => {
            window.removeEventListener('resize', update_container_align);
        };
    });

    $: update_container_align();

    // 6. 반응형 히스토리 저장(마우스 이벤트와 선택 제외)
    $: {
        if (
            objects &&
            !is_dragging &&
            !is_resizing &&
            !is_rotating &&
            !is_history_action &&
            !is_editing_text
        ) {
            save_to_history();
        }
        if (is_history_action) {
            is_history_action = false;
        }
    }
</script>

<svelte:window on:mousemove={handle_mouse_move} on:mouseup={handle_mouse_up} />

<div class="canvas-wrapper" bind:this={canvas_wrapper}>
    <div
        class="canvas-container"
        bind:this={canvas_container}
        style="display: flex; align-items: {container_align}; justify-content: center; min-height: 100%; width: 100%;"
    >
        <div
            class="canvas"
            bind:this={canvas}
            style="width: {width * scale}px; height: {height * scale}px; "
            on:mousedown={handle_canvas_mouse_down}
        >
            {#each objects as obj (obj.id)}
                {#if obj.type === 'text'}
                    <TextObject
                        {obj}
                        {canvas_rect}
                        {get_rotate_handle_position}
                        {show_rotation_angle}
                        {selected_object}
                        on:mouse_down={(e) =>
                            handle_mouse_down(
                                e.detail.event,
                                e.detail.obj,
                                e.detail.type,
                                e.detail.edge,
                            )}
                        on:select_object={(e) => select_object(e.detail)}
                        on:text_edit_start={() => (is_editing_text = true)}
                        on:text_edit_end={() => (is_editing_text = false)}
                        on:update_object={() => (objects = [...objects])}
                    />
                {:else if obj.type === 'image'}
                    <ImageObject
                        {obj}
                        {canvas_rect}
                        {get_rotate_handle_position}
                        {show_rotation_angle}
                        {selected_object}
                        on:mouse_down={(e) =>
                            handle_mouse_down(
                                e.detail.event,
                                e.detail.obj,
                                e.detail.type,
                                e.detail.edge,
                            )}
                        on:select_object={(e) => select_object(e.detail)}
                    />
                {/if}
            {/each}
        </div>
    </div>
</div>

<style>
    .canvas-wrapper {
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
</style>
