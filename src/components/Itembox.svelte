<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    let uploaded_images = [];

    function add_text_object() {
        dispatch('add_text_object');
    }

    function handle_image_upload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploaded_images = [...uploaded_images, e.target.result];
            };
            reader.readAsDataURL(file);
        }
    }

    function add_image_to_editor(src) {
        dispatch('add_image_object', src);
    }
</script>

<div class="object-toolbox">
    <div class="tool-group">
        <button class="tool-btn" on:click={add_text_object}>텍스트 추가</button>
        <label for="image-upload" class="tool-btn">이미지 추가</label>
        <input
            type="file"
            id="image-upload"
            accept="image/*"
            on:change={handle_image_upload}
            style="display: none;"
        />
    </div>

    {#if uploaded_images.length > 0}
        <div class="tool-group">
            <h3>업로드된 이미지</h3>
            <div class="image-list">
                {#each uploaded_images as image_src}
                    <div class="image-item" on:click={() => add_image_to_editor(image_src)}>
                        <img src={image_src} alt="Uploaded" />
                    </div>
                {/each}
            </div>
        </div>
    {/if}
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
        padding: 0.5rem 1rem;
        background: #4fc3f7;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        text-align: center;
        font-size: 14px;
    }

    .tool-btn:hover:not(:disabled) {
        background: #29b6f6;
    }

    .tool-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .image-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 10px;
    }

    .image-item {
        width: 80px;
        height: 80px;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .image-item img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>
