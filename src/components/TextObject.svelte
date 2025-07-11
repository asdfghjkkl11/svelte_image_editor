<script>
    import { createEventDispatcher } from 'svelte';

    export let obj;
    export let canvas_rect;
    export let get_rotate_handle_position;
    export let show_rotation_angle;
    export let selected_object;

    const dispatch = createEventDispatcher();

    function handle_mouse_down(event, type, edge = null) {
        dispatch('mouse_down', { event, obj, type, edge });
    }

    function select_object() {
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
    background: {obj.color};
    transform: rotate({obj.angle}deg);
  "
    on:click={select_object}
>
    <div class="text-element">{@html obj.text}</div>
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
            class="background"
            style="
           width: 100%;
           height: 100%;
           opacity: 0.2;
           position: absolute;
           background: {obj.color};
           pointer-events : none;
      "
        ></div>
        <div
            class="text-element"
            contenteditable="true"
            on:mousedown|stopPropagation
            bind:innerHTML={obj.text}
            bind:this={obj.text_element}
            on:focus={() => dispatch('text_edit_start')}
            on:blur={() => dispatch('text_edit_end')}
            on:input={(e) => {
                obj.text = e.target.innerHTML;
                dispatch('update_object', obj);
            }}
        ></div>
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

    .text-element {
        width: 100%;
        white-space: pre-wrap;
        word-break: break-word;
        text-align: center;
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
</style>
