<script>
    import "./global.css";
    import Itembox from './components/Itembox.svelte';
    import Toolbox from './components/Toolbox.svelte';
    import Editor from './components/Editor.svelte';

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
    />
    <Editor
        bind:action={editorAction}
        on:history_updated={handleHistoryUpdate}
    />
    <Toolbox
        on:action={handleToolboxAction}
        {current_history_index}
        {history_length}
    />
</div>

<style>
    .editor-container {
        height: 100vh;
        padding: 8px;
        display: flex;
        gap: 1rem;
    }
</style>
