<script>
    import Itembox from './Itembox.svelte';
    import Toolbox from './Toolbox.svelte';
    import Editor from './Editor.svelte';

    export let option

    let default_option ={
        width: 600,
        height: 1800,
        scale: 0.5,
        undo: true,
        redo: true,
        forward: true,
        backward: true,
        duplicate: true,
        delete: true,
        bold: true,
        italic: true,
        underline: true,
        strike: true,
        text_align: true,
        color: true,
        background_color: true,
        object_background_color: true,
        font_size: true,
        font_family: true,
    };

    option = {
        ...default_option,
        ...option
    };

    let editorAction = { type: null, payload: null };

    let current_history_index = 0;
    let history_length = 0;

    function handleHistoryUpdate(event) {
        current_history_index = event.detail.current_history_index;
        history_length = event.detail.history_length;
    }

    function handleToolboxAction(event) {
        editorAction = event.detail;
    }

    function handleAddImageObject(event) {
        editorAction = { type: 'add_image_object', payload: event.detail };
    }
</script>

<div class="editor-container">
    <Itembox
            on:add_text_object={() => (editorAction = { type: 'add_text_object' })}
            on:add_image_object={handleAddImageObject}
            {option}
    />
    <Editor
            bind:action={editorAction}
            on:history_updated={handleHistoryUpdate}
            {option}
    />
    <Toolbox
            on:action={handleToolboxAction}
            {current_history_index}
            {history_length}
            {option}
    />
</div>

<style>
    .editor-container {
        width: 100%;
        height: 100%;
        padding: 8px;
        display: flex;
        gap: 1rem;
        position: relative;
    }
</style>
