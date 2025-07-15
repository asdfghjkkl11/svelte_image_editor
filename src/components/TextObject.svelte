<script>
	import { createEventDispatcher } from 'svelte';
	import ObjectControls from './ObjectControls.svelte';

	// 부모 컴포넌트(ImageEditor)로부터 전달받는 속성들
	export let obj; // 텍스트 객체의 데이터 (위치, 크기, 각도, 내용 등)
	export let canvas_rect; // 캔버스의 위치 및 크기 정보
	export let get_rotate_handle_position; // 회전 핸들 위치 계산 함수
	export let show_rotation_angle; // 회전 각도 표시 여부
	export let selected_object; // 현재 선택된 객체 정보
	export let show_resize_info; // 리사이즈 정보 표시 여부
	export let distance_info; // 거리 정보

	const dispatch = createEventDispatcher();

	/**
	 * @description 마우스 다운 이벤트를 부모 컴포넌트로 전달하는 역할을 합니다.
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

<!--컨트롤러 (선택되었을 때만 표시)-->
{#if obj.selected}
	<div
		class="object object-controls-wrapper"
		style="
      left: {canvas_rect.left + obj.x}px;
      top: {canvas_rect.top + obj.y}px;
      width: {obj.width}px;
      height: {obj.height}px;
      transform: rotate({obj.angle}deg);
      border: 2px solid #333;
    "
		on:mousedown={(e) => handle_mouse_down(e, 'drag')}
	>
		<div class="background-overlay" style="background: {obj.color};"></div>
		<div
			class="text-element-editable"
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
		<ObjectControls
			{obj}
			{get_rotate_handle_position}
			{show_rotation_angle}
			{selected_object}
			{show_resize_info}
			{distance_info}
			on:mouse_down={(e) => handle_mouse_down(e.detail.event, e.detail.type, e.detail.edge)}
		/>
	</div>
{:else}
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
{/if}

<style>
	.object {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid transparent;
		touch-action: none;
		user-select: none;
		cursor: move;
		transform-origin: center;
	}

	.text-element {
		width: 100%;
		white-space: pre-wrap;
		word-break: break-word;
		text-align: center;
		outline: none;
		padding: 5px; /* Add some padding */
	}

	.object-controls-wrapper {
		position: fixed;
		transform-origin: center;
		z-index: 1;
		cursor: move;
	}

	.background-overlay {
		position: absolute;
		width: 100%;
		height: 100%;
		opacity: 0.2;
		pointer-events: none;
	}

	.text-element-editable {
		position: relative;
		width: 100%;
		white-space: pre-wrap;
		word-break: break-word;
		text-align: center;
		cursor: text;
		outline: none;
		z-index: 2;
		padding: 5px; /* Match padding */
	}
</style>
