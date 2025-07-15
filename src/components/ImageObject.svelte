<script>
    import { createEventDispatcher } from 'svelte';

    // 부모 컴포넌트(ImageEditor)로부터 전달받는 속성들
    export let obj; // 이미지 객체의 데이터 (위치, 크기, 각도, 소스 등)
    export let canvas_rect; // 캔버스의 위치 및 크기 정보
    export let get_rotate_handle_position; // 회전 핸들 위치 계산 함수
    export let show_rotation_angle; // 회전 각도 표시 여부
    export let selected_object; // 현재 선택된 객체 정보
    export let show_resize_info; // 리사이즈 정보 표시 여부
    export let distance_info; // 거리 정보

    // 부모 컴포넌트로 이벤트를 전달하기 위한 디스패처 생성
    const dispatch = createEventDispatcher();

    /**
     * @description 마우스 다운 이벤트를 부모 컴포넌트(ImageEditor)로 전달하는 역할을 합니다.
     * 사용자가 객체에 마우스를 누르면, 어떤 종류의 조작(드래그, 리사이즈, 회전)을 시작하는지 식별하여
     * 관련 정보(이벤트 객체, 객체 데이터, 조작 유형 등)를 `mouse_down` 이벤트로 보냅니다.
     * @param {MouseEvent} event - 원본 마우스 이벤트 객체.
     * @param {string} type - 조작 유형. ('drag', 'resize', 'rotate')
     * @param {string|null} [edge=null] - 리사이즈 조작 시, 핸들의 위치. (예: 'top-left')
     */
    function handle_mouse_down(event, type, edge = null) {
        // dispatch 함수를 사용하여 부모 컴포넌트(ImageEditor)로 'mouse_down' 이벤트를 보냅니다.
        // 이벤트 객체와 함께 조작 대상 객체(obj), 조작 유형(type), 리사이즈 엣지(edge) 정보를 전달합니다.
        dispatch('mouse_down', { event, obj, type, edge });
    }

    /**
     * @description 사용자가 이 객체를 클릭했을 때, 부모 컴포넌트로 `select_object` 이벤트를 전달합니다.
     * 이 이벤트는 ImageEditor가 해당 객체를 선택된 상태로 만들도록 요청하는 역할을 합니다.
     */
    function select_object() {
        // 부모 컴포넌트로 'select_object' 이벤트를 보내고, 현재 객체(obj)를 전달합니다.
        dispatch('select_object', obj);
    }
</script>

<!--본체-->
<div
    class="object"
    style="
    left: {obj.x}px;
    top: {obj.y}px;
    width: {obj.width}px;
    height: {obj.height}px;
    transform: rotate({obj.angle}deg);
  "
    on:click={select_object}
>
    <img src={obj.src} alt={obj.alt} style="width: 100%; height: 100%;" />
</div>
<!--입력용창-->
{#if obj.selected}
    <div
        class="object object-wrapper"
        class:selected={obj.selected}
        on:click={select_object}
        on:mousedown={(e) => handle_mouse_down(e, 'drag')}
        style="
      left: {canvas_rect.left + obj.x + 1}px;
      top: {canvas_rect.top + obj.y + 1}px;
      width: {obj.width}px;
      height: {obj.height}px;
      transform: rotate({obj.angle}deg);
      position: fixed;
      z-index: 1;
    "
    >
        <div
            class="resize-handle resize-handle-tl"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'top-left')}
        ></div>
        <div
            class="resize-handle resize-handle-t"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'top')}
        ></div>
        <div
            class="resize-handle resize-handle-tr"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'top-right')}
        ></div>
        <div
            class="resize-handle resize-handle-l"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'left')}
        ></div>
        <div
            class="resize-handle resize-handle-r"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'right')}
        ></div>
        <div
            class="resize-handle resize-handle-bl"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'bottom-left')}
        ></div>
        <div
            class="resize-handle resize-handle-b"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'bottom')}
        ></div>
        <div
            class="resize-handle resize-handle-br"
            on:mousedown={(e) => handle_mouse_down(e, 'resize', 'bottom-right')}
        ></div>
        <div
            class="rotate-handle"
            style="
        {get_rotate_handle_position(obj)
                ? 'top: -30px; bottom: unset;'
                : 'top: unset; bottom: -30px;'}
        left: 50%;
        transform: translateX(-50%);"
            on:mousedown={(e) => handle_mouse_down(e, 'rotate')}
        ></div>
        {#if show_rotation_angle && obj.id === selected_object?.id}
            <div class="rotation-angle">
                {(Math.round(obj.angle) + 360) % 360}°
            </div>
        {/if}
        {#if show_resize_info && obj.id === selected_object?.id}
            <div class="resize-info">
                {Math.round(obj.width)} x {Math.round(obj.height)}
            </div>
        {/if}
        {#if distance_info && obj.id === selected_object?.id}
            {#each distance_info as info}
            <div
                class="resize-distance-info"
                style="
                    {info.direction.includes('top')
                        ? 'bottom: 100%; top: unset;'
                        : 'top: 100%; bottom: unset;'}
                    {info.direction.includes('left')
                        ? 'right: 100%; left: unset;'
                        : 'left: 100%; right: unset;'}
                    transform: translate(
                        {info.direction.includes('left') || info.direction.includes('right') ? (info.direction.includes('left') ? 'calc(-100% - 10px)' : '10px') : '-50%'},
                        {info.direction.includes('top') || info.direction.includes('bottom') ? (info.direction.includes('top') ? 'calc(-100% - 10px)' : '10px') : '-50%'}
                    );
                "
            >
                {info.distance}px
            </div>
            {/each}
        {/if}
    </div>
{/if}

<style>
    .object {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid transparent;
        border-radius: 1px;
        touch-action: none;
        user-select: none;
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
        content: '↻';
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

    .resize-info {
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
        white-space: nowrap;
    }

    .resize-distance-info {
        position: absolute;
        background: #007bff;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 10000;
    }
</style>
