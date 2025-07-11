<script>
    import Itembox from './components/Itembox.svelte';
    import Toolbox from './components/Toolbox.svelte';
    import Editor from './components/Editor.svelte';

    let editor_component;
</script>

<div class="editor-container">
    <Itembox on:add_text_object={() => editor_component.add_text_object()} />
    <Editor bind:this={editor_component} />
    <Toolbox
        on:undo={() => editor_component.undo()}
        on:redo={() => editor_component.redo()}
        on:bring_to_front={() => editor_component.bring_to_front()}
        on:bring_forward={() => editor_component.bring_forward()}
        on:send_backward={() => editor_component.send_backward()}
        on:send_to_back={() => editor_component.send_to_back()}
        on:duplicate_object={() => editor_component.duplicate_object()}
        on:delete_object={() => editor_component.delete_object()}
        on:format_text={(e) =>
            editor_component.format_text(e.detail.command, e.detail.value)}
        on:change_font_size={(e) =>
            editor_component.change_font_size(e.detail.value)}
        on:text_edit_start={() => editor_component.set_is_editing_text(true)}
        on:text_edit_end={() => editor_component.set_is_editing_text(false)}
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
