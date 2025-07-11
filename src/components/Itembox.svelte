<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    function add_text_object() {
        dispatch('add_text_object');
    }
</script>

<div class="object-toolbox">
    <div class="tool-group">
        <button on:click={add_text_object}>텍스트 추가</button>
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
