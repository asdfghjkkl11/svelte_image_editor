<script>
    import { createEventDispatcher } from 'svelte';

    export let current_history_index;
    export let history_length;

    const dispatch = createEventDispatcher();

    function handle_action(type, payload = null) {
        dispatch('action', { type, payload });
    }
</script>

<div class="object-toolbox">
    <div class="tool-group">
        <button
            on:click={() => handle_action('undo')}
            disabled={current_history_index <= 0}>실행취소</button>
        <button
            on:click={() => handle_action('redo')}
            disabled={current_history_index >= history_length - 1}
            >되돌리기</button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('bring_to_front')}
        >
            맨 앞으로
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('bring_forward')}
        >
            앞으로
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('send_backward')}
        >
            뒤로
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('send_to_back')}
        >
            맨 뒤로
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('duplicate_object')}
        >
            복제
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('delete_object')}
        >
            삭제
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'bold' })}
        >
            <b>B</b>
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'italic' })}
        >
            <i>I</i>
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'underline' })}
        >
            <u>U</u>
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'strikeThrough' })}
        >
            <s>S</s>
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'justifyLeft' })}
        >
            Align Left
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'justifyCenter' })}
        >
            Align Center
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'justifyRight' })}
        >
            Align Right
        </button>
        <button
            class="tool-btn"
            on:click|stopPropagation={() =>
                handle_action('format_text', { command: 'justifyFull' })}
        >
            Justify
        </button>
        <input
            type="color"
            class="tool-btn"
            on:input={(e) =>
                handle_action('format_text', {
                    command: 'foreColor',
                    value: e.target.value,
                })}
            on:mousedown|stopPropagation
            on:focus={() => handle_action('text_edit_start')}
            on:blur={() => handle_action('text_edit_end')}
        />
        <input
            type="color"
            class="tool-btn"
            on:input={(e) =>
                handle_action('format_text', {
                    command: 'backColor',
                    value: e.target.value,
                })}
            on:mousedown|stopPropagation
            on:focus={() => handle_action('text_edit_start')}
            on:blur={() => handle_action('text_edit_end')}
        />
        <input
            type="color"
            class="tool-btn"
            on:input={(e) =>
                handle_action('set_text_object_background_color', e.target.value)}
            on:mousedown|stopPropagation
            on:focus={() => handle_action('text_edit_start')}
            on:blur={() => handle_action('text_edit_end')}
        />
        <input
            type="range"
            class="tool-btn"
            on:change={(e) =>
                handle_action('change_font_size', { value: e.target.value })}
            on:mousedown|stopPropagation
            on:focus={() => handle_action('text_edit_start')}
            on:blur={() => handle_action('text_edit_end')}
            min="10"
            max="100"
            step="1"
        />
    </div>
</div>

<style>
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
