<script>
    import "./global.css";
    import ImageEditor from "./components/ImageEditor.svelte";

    let option = {
        width: 800,
        height: 600,
    }
</script>

<div class="editor-container">
    <ImageEditor {option}/>
</div>

<style>
    .editor-container {
        height: 100vh;
        display: flex;
    }
</style>
