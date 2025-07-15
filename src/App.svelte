<script>
	import './global.css';
	import '@retina-dev/hebees_component/css/fonts.css';
	import ImageEditor from './components/ImageEditor.svelte';

	// ImageEditor 컴포넌트에 바인딩될 인스턴스
	let image_editor;

	// 업로드된 이미지 파일의 데이터 URL을 저장하는 배열
	let uploaded_images = [];
	// 현재 히스토리 인덱스 (undo/redo UI 활성화/비활성화에 사용)
	let current_history_index;
	// 전체 히스토리 길이 (undo/redo UI 활성화/비활성화에 사용)
	let history_length;

	// ImageEditor 컴포넌트에 전달할 옵션 객체
	const option = {
		width: 400,
		height: 540,
		scale: 1,
	};

	/**
	 * @description 파일 입력(input) 변경 시 호출되는 이벤트 핸들러입니다.
	 * 선택된 이미지 파일을 읽어 데이터 URL로 변환하고 `uploaded_images` 배열에 추가합니다.
	 * @param {Event} event - 파일 입력 변경 이벤트
	 */
	function handle_image_upload(event) {
		// 이벤트에서 사용자가 선택한 첫 번째 파일을 가져옵니다.
		const file = event.target.files[0];
		// 파일이 존재하는지 확인합니다.
		if (file) {
			// 파일을 읽기 위한 FileReader 객체를 생성합니다.
			const reader = new FileReader();
			// 파일 읽기가 성공적으로 완료되었을 때 실행될 콜백 함수를 정의합니다.
			reader.onload = (e) => {
				// 읽어온 이미지의 데이터 URL을 uploaded_images 배열에 추가하여 UI를 업데이트합니다.
				uploaded_images = [...uploaded_images, e.target.result];
			};
			// 파일을 데이터 URL 형식으로 읽기 시작합니다. 이 작업이 완료되면 onload 콜백이 호출됩니다.
			reader.readAsDataURL(file);
		}
	}

	/**
	 * @description '텍스트 추가' 버튼 클릭 시 ImageEditor 컴포넌트의 텍스트 객체 추가 함수를 호출합니다.
	 */
	function add_text_object() {
		// ImageEditor 컴포넌트의 내장 함수를 호출하여 텍스트 객체를 추가합니다.
		image_editor.add_text_object();
	}

	/**
	 * @description 업로드된 이미지를 클릭 시 ImageEditor 컴포넌트의 이미지 객체 추가 함수를 호출합니다.
	 * @param {string} src - 추가할 이미지의 데이터 URL
	 */
	function add_image_to_editor(src) {
		// ImageEditor 컴포넌트의 내장 함수를 호출하여 이미지 객체를 추가합니다.
		image_editor.add_image_object(src);
	}

	/**
	 * @description ImageEditor의 다양한 액션을 호출하는 범용 함수입니다.
	 * @param {string} type - 실행할 액션의 종류 (예: 'undo', 'redo', 'delete_object')
	 * @param {any} [payload=null] - 액션에 필요한 데이터
	 * @returns {Promise<any>} 액션 실행 결과
	 */
	async function handle_action(type, payload = null) {
		// ImageEditor의 action 함수를 호출하여 특정 동작을 수행하고, 그 결과를 반환합니다.
		return await image_editor.action(type, payload);
	}

	/**
	 * @description '저장' 버튼 클릭 시 캔버스 내용을 PNG 이미지로 저장합니다.
	 */
	async function save_image() {
		// ImageEditor의 'save' 액션을 호출하여 캔버스 내용을 'png' 형식의 데이터 URL로 받습니다.
		let data_url = await handle_action('save', 'png');
		// 다운로드를 위해 임시 <a> 태그를 생성합니다.
		let a = document.createElement('a');
		// 다운로드될 파일의 이름을 'IMAGE.png'로 설정합니다.
		a.download = 'IMAGE.png';
		// <a> 태그의 href 속성에 이미지 데이터 URL을 할당합니다.
		a.href = data_url;
		// <a> 태그를 body에 추가해야 일부 브라우저에서 클릭 이벤트가 정상적으로 동작합니다.
		document.body.appendChild(a);
		// 프로그래밍 방식으로 <a> 태그를 클릭하여 파일 다운로드를 시작합니다.
		a.click();
		// 다운로드 후에는 더 이상 필요 없는 <a> 태그를 body에서 제거하여 DOM을 깨끗하게 유지합니다.
		document.body.removeChild(a);
	}
	('');
</script>

<div class="editor-container">
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
	<ImageEditor {option} bind:this={image_editor} bind:current_history_index bind:history_length />
	<div class="object-toolbox">
		<div class="tool-group">
			<button on:click={save_image}>저장</button>
			<button on:click={() => handle_action('undo')} disabled={current_history_index <= 0}>실행취소</button>
			<button on:click={() => handle_action('redo')} disabled={current_history_index >= history_length - 1}
				>되돌리기</button
			>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('bring_to_front')}>
				맨 앞으로</button
			>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('bring_forward')}> 앞으로</button>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('send_backward')}> 뒤로 </button>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('send_to_back')}> 맨 뒤로 </button>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('duplicate_object')}> 복제 </button>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('delete_object')}> 삭제 </button>
			<button class="tool-btn" on:click|stopPropagation={() => handle_action('format_text', { command: 'bold' })}>
				<b>B</b>
			</button>
			<button
				class="tool-btn"
				on:click|stopPropagation={() => handle_action('format_text', { command: 'italic' })}
			>
				<i>I</i>
			</button>
			<button
				class="tool-btn"
				on:click|stopPropagation={() => handle_action('format_text', { command: 'underline' })}
			>
				<u>U</u>
			</button>
			<button
				class="tool-btn"
				on:click|stopPropagation={() => handle_action('format_text', { command: 'strikeThrough' })}
			>
				<s>S</s>
			</button>
			<button
				class="tool-btn"
				on:click|stopPropagation={() => handle_action('format_text', { command: 'justifyLeft' })}
			>
				왼쪽 정렬
			</button>
			<button
				class="tool-btn"
				on:click|stopPropagation={() => handle_action('format_text', { command: 'justifyCenter' })}
			>
				가운데 정렬
			</button>
			<button
				class="tool-btn"
				on:click|stopPropagation={() => handle_action('format_text', { command: 'justifyRight' })}
			>
				오른쪽 정렬
			</button>
			<label class="tool-label">
				<span>글자색</span>
				<input
					type="color"
					class="tool-btn"
					on:input={(e) =>
						handle_action('format_text', {
							command: 'foreColor',
							value: e.target.value,
						})}
					on:mousedown|stopPropagation
				/>
			</label>
			<label class="tool-label">
				<span>글자 배경색</span>
				<input
					type="color"
					class="tool-btn"
					on:input={(e) =>
						handle_action('format_text', {
							command: 'backColor',
							value: e.target.value,
						})}
					on:mousedown|stopPropagation
				/>
			</label>
			<label class="tool-label">
				<span>배경색</span>
				<input
					type="color"
					class="tool-btn"
					on:input={(e) => handle_action('set_text_object_background_color', e.target.value)}
					on:mousedown|stopPropagation
				/>
			</label>
			<label class="tool-label">
				<span>글자크기</span>
				<select
					class="tool-btn"
					on:change={(e) =>
						handle_action('change_font_size', {
							value: e.target.value,
						})}
					on:mousedown|stopPropagation
				>
					<option value="8">8</option>
					<option value="9">9</option>
					<option value="10">10</option>
					<option value="11">11</option>
					<option value="12">12</option>
					<option value="14">14</option>
					<option value="16">16</option>
					<option value="18">18</option>
					<option value="20">20</option>
					<option value="22">22</option>
					<option value="24">24</option>
					<option value="26">26</option>
					<option value="28">28</option>
					<option value="36">36</option>
					<option value="48">48</option>
					<option value="72">72</option>
				</select>
			</label>
			<label class="tool-label">
				<span>폰트</span>
				<select
					class="tool-btn"
					on:change={(e) =>
						handle_action('format_text', {
							command: 'fontName',
							value: e.target.value,
						})}
					on:mousedown|stopPropagation
				>
					<option value="Arial">Arial</option>
					<option value="Verdana">Verdana</option>
					<option value="Georgia">Georgia</option>
					<option value="Times New Roman">Times New Roman</option>
					<option value="Courier New">Courier New</option>
					<option value="Pretendard">Pretendard</option>
					<option value="Gmarket Sans">Gmarket Sans</option>
				</select>
			</label>
		</div>
	</div>
</div>

<style>
	.editor-container {
		height: 100vh;
		padding: 8px;
		display: flex;
		gap: 1rem;
	}

	.object-toolbox {
		width: 240px;
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
	.tool-label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.tool-label > span {
		flex-shrink: 0;
	}
	.tool-label .tool-btn {
		flex: 1;
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
