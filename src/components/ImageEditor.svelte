<script>
    import { onMount } from 'svelte';
    import ImageObject from './ImageObject.svelte';
    import TextObject from './TextObject.svelte';
    import * as htmlToImage from 'html-to-image';

    // 외부에서 전달받는 에디터 옵션
    export let option;
    // 히스토리 배열의 전체 길이 (UI 업데이트용)
    export let history_length = 0;
    // 현재 히스토리 인덱스 (UI 업데이트용)
    export let current_history_index = 0;

    // 기본 에디터 옵션
    const default_option = {
        width: 600,
        height: 1800,
        scale: 0.5,
    };

    // 전달받은 옵션과 기본 옵션을 병합
    option = {
        ...default_option,
        ...option,
    };

    // 캔버스 크기 및 스케일 설정
    let width = option.width; // 캔버스 너비
    let height = option.height; // 캔버스 높이
    let scale = option.scale; // 캔버스 스케일
    let canvas_y = (height * scale) / 2; // 캔버스의 Y축 중심 좌표

    // 에디터 상태 변수
    let objects = []; // 캔버스 위의 모든 객체(이미지, 텍스트)를 담는 배열
    let selected_object = {}; // 현재 선택된 객체

    // 객체 조작 관련 상태 변수
    let is_dragging = false; // 드래그 중 여부
    let is_resizing = false; // 리사이즈 중 여부
    let is_rotating = false; // 회전 중 여부
    let start_x = 0,
        start_y = 0; // 마우스 시작 좌표
    let start_width = 0,
        start_height = 0; // 객체 시작 크기
    let start_obj_x = 0,
        start_obj_y = 0; // 객체 시작 위치
    let resize_edge = null; // 리사이즈 핸들 위치 (e.g., 'top-left')
    let min_size = 20; // 객체의 최소 크기
    let show_rotation_angle = false; // 회전 각도 표시 여부
    let rotate_handle_position = false; // 회전 핸들 위치 (상/하)
    let snap_lines = []; // 스냅 라인
    let show_resize_info = false; // 리사이즈 정보 표시 여
    let distance_info = null; // { distance: number, direction: string }

    // 히스토리(undo/redo) 관련 상태 변수
    let history = []; // 객체 상태 변화를 저장하는 배열
    let is_history_action = false; // undo/redo 실행 중 여부 (불필요한 히스토리 저장을 방지)
    let is_editing_text = false; // 텍스트 편집 중 여부 (불필요한 히스토리 저장을 방지)

    // DOM 요소 바인딩 변수
    let canvas_wrapper;
    let canvas_container;
    let canvas;
    let canvas_rect; // 캔버스의 DOMRect 정보 (위치, 크기)
    let container_align = 'center'; // 캔버스 정렬 상태

    /**
     * 외부에서 에디터의 기능을 실행하기 위한 통합 인터페이스 함수.
     * @param {string} type - 실행할 액션의 종류.
     * @param {any} payload - 액션에 필요한 데이터.
     * @returns {Promise<any>} 액션 실행 결과 (주로 이미지 저장 시 데이터 URL 반환).
     */
    export async function action(type, payload) {
        switch (type) {
            case 'add_text_object':
                add_text_object();
                break;
            case 'add_image_object':
                add_image_object(payload);
                break;
            case 'delete_object':
                delete_object();
                break;
            case 'duplicate_object':
                duplicate_object();
                break;
            case 'bring_forward':
                bring_forward();
                break;
            case 'send_backward':
                send_backward();
                break;
            case 'bring_to_front':
                bring_to_front();
                break;
            case 'send_to_back':
                send_to_back();
                break;
            case 'undo':
                undo();
                break;
            case 'redo':
                redo();
                break;
            case 'format_text':
                format_text(payload.command, payload.value);
                break;
            case 'change_font_size':
                change_font_size(payload);
                break;
            case 'set_text_object_background_color':
                set_text_object_background_color(payload);
                break;
            case 'save':
                return await save_image(payload);
        }
    }

    /**
     * 새로운 텍스트 객체를 캔버스에 추가합니다.
     */
    export function add_text_object() {
        const new_text_object = {
            id: Date.now(),
            type: 'text',
            x: 50,
            y: 50,
            width: 300,
            height: 100,
            angle: 0,
            color: 'transparent', // 배경색
            selected: true,
            text: '텍스트',
        };
        // 기존 객체 선택 해제 후 새 객체 추가 및 선택
        objects = objects.map((obj) => ({ ...obj, selected: false }));
        objects = [...objects, new_text_object];
        selected_object = new_text_object;
    }

    /**
     * 새로운 이미지 객체를 캔버스에 추가합니다.
     * @param {string} src - 이미지 데이터 URL.
     */
    export async function add_image_object(src) {
        const img = new Image();
        img.src = src;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        let img_width = img.naturalWidth * scale;
        let img_height = img.naturalHeight * scale;

        // 이미지가 캔버스 크기를 초과하지 않도록 스케일 조정
        const canvas_scaled_width = width * scale;
        const canvas_scaled_height = height * scale;

        if (
            img_width > canvas_scaled_width ||
            img_height > canvas_scaled_height
        ) {
            const width_ratio = canvas_scaled_width / img_width;
            const height_ratio = canvas_scaled_height / img_height;
            const ratio = Math.min(width_ratio, height_ratio);

            img_width *= ratio;
            img_height *= ratio;
        }

        const new_image_object = {
            id: Date.now(),
            type: 'image',
            x: (canvas_scaled_width - img_width) / 2, // 중앙 배치
            y: (canvas_scaled_height - img_height) / 2,
            width: img_width,
            height: img_height,
            angle: 0,
            src,
            alt: 'Uploaded Image',
            selected: true,
        };
        // 기존 객체 선택 해제 후 새 객체 추가 및 선택
        objects = objects.map((obj) => ({ ...obj, selected: false }));
        objects = [...objects, new_image_object];
        selected_object = new_image_object;
    }

    // 컴포넌트가 마운트될 때 캔버스 정렬을 업데이트하고, 창 크기 변경 시에도 업데이트하도록 이벤트 리스너를 추가합니다.
    onMount(() => {
        update_container_align();
        window.addEventListener('resize', update_container_align);
        return () => {
            window.removeEventListener('resize', update_container_align);
        };
    });

    // 캔버스 크기나 스케일이 변경될 때마다 캔버스 정렬을 업데이트합니다.
    $: update_container_align();

    // 반응형 구문: 객체 상태가 변경되고, 사용자가 조작(드래그, 리사이즈 등)하고 있지 않을 때 히스토리를 저장합니다.
    $: {
        if (
            objects &&
            !is_dragging &&
            !is_resizing &&
            !is_rotating &&
            !is_history_action &&
            !is_editing_text
        ) {
            save_to_history();
        }
        if (is_history_action) {
            is_history_action = false; // 히스토리 액션 플래그 초기화
        }
    }

    /**
     * 객체의 회전 각도에 따라 회전 핸들의 위치(상단 또는 하단)를 결정합니다.
     * @param {object} obj - 대상 객체.
     * @returns {boolean} true이면 상단, false이면 하단.
     */
    function get_rotate_handle_position(obj) {
        const center_y = obj.y + obj.height / 2;
        const rad = ((obj.angle || 0) * Math.PI) / 180;
        const head_y = center_y - Math.cos(rad) * (obj.height / 2);
        return (head_y - center_y) * (canvas_y - center_y) < 0;
    }

    /**
     * 선택된 텍스트 객체의 배경색을 변경합니다.
     * @param {string} color - 적용할 색상 값.
     */
    function set_text_object_background_color(color) {
        if (selected_object && selected_object.type === 'text') {
            selected_object.color = color;
            objects = objects.map((obj) =>
                obj.id === selected_object.id ? selected_object : obj,
            );
        }
    }

    /**
     * 선택된 객체를 삭제합니다.
     */
    function delete_object() {
        if (!selected_object.id) return;
        objects = objects.filter((o) => o.id !== selected_object.id);
        selected_object = {};
    }

    /**
     * 선택된 객체를 복제합니다.
     */
    function duplicate_object() {
        if (!selected_object.id) return;
        const new_obj = {
            ...selected_object,
            id: Date.now(),
            x: selected_object.x + 20,
            y: selected_object.y + 20,
            selected: true,
        };
        objects = objects.map((o) => ({ ...o, selected: false }));
        objects = [...objects, new_obj];
        selected_object = new_obj;
    }

    /**
     * 선택된 객체를 한 단계 앞으로 가져옵니다. (z-index 증가)
     */
    function bring_forward() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex < objects.length - 1) {
            const newObjects = [...objects];
            const temp = newObjects[currentIndex];
            newObjects[currentIndex] = newObjects[currentIndex + 1];
            newObjects[currentIndex + 1] = temp;
            objects = newObjects;
        }
    }

    /**
     * 선택된 객체를 한 단계 뒤로 보냅니다. (z-index 감소)
     */
    function send_backward() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex > 0) {
            const newObjects = [...objects];
            const temp = newObjects[currentIndex];
            newObjects[currentIndex] = newObjects[currentIndex - 1];
            newObjects[currentIndex - 1] = temp;
            objects = newObjects;
        }
    }

    /**
     * 선택된 객체를 맨 앞으로 가져옵니다.
     */
    function bring_to_front() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex !== -1) {
            const newObjects = [...objects];
            const [movedObject] = newObjects.splice(currentIndex, 1);
            newObjects.push(movedObject);
            objects = newObjects;
        }
    }

    /**
     * 선택된 객체를 맨 뒤로 보냅니다.
     */
    function send_to_back() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex !== -1) {
            const newObjects = [...objects];
            const [movedObject] = newObjects.splice(currentIndex, 1);
            newObjects.unshift(movedObject);
            objects = newObjects;
        }
    }

    /**
     * 특정 객체를 선택합니다.
     * @param {object} obj - 선택할 객체.
     */
    function select_object(obj) {
        objects = objects.map((o) => ({ ...o, selected: o.id === obj.id }));
        selected_object = obj;
        is_history_action = true; // 선택 변경은 히스토리에 저장하지 않음
    }

    /**
     * 현재 객체 상태를 히스토리 배열에 저장합니다.
     */
    function save_to_history() {
        const current_state = JSON.stringify(objects);
        if (history.length > 0 && history[current_history_index] === current_state) {
            return; // 변경 사항이 없으면 저장하지 않음
        }
        history = history.slice(0, current_history_index + 1);
        history.push(current_state);
        current_history_index = history.length - 1;
        history_length = history.length;
    }

    /**
     * 이전 작업 상태로 되돌립니다. (Undo)
     */
    function undo() {
        if (current_history_index > 0) {
            is_history_action = true;
            current_history_index--;
            objects = JSON.parse(history[current_history_index]);
            history_length = history.length;
        }
    }

    /**
     * 되돌렸던 작업을 다시 실행합니다. (Redo)
     */
    function redo() {
        if (current_history_index < history.length - 1) {
            is_history_action = true;
            current_history_index++;
            objects = JSON.parse(history[current_history_index]);
            history_length = history.length;
        }
    }

    /**
     * 선택된 텍스트 객체에 서식을 적용합니다.
     * @param {string} command - `document.execCommand`에 전달될 명령어.
     * @param {string|null} [value=null] - 명령어에 필요한 값.
     */
    function format_text(command, value = null) {
        document.execCommand('styleWithCSS', true, null);
        document.execCommand(command, false, value);
        objects = objects; // Svelte에 변경사항을 알리기 위해 자기 자신을 할당
    }

    /**
     * 선택된 텍스트 객체의 폰트 크기를 변경합니다.
     * @param {{value: string}} value - 폰트 크기 값.
     */
    function change_font_size(value) {
        document.execCommand('styleWithCSS', true, null);
        document.execCommand('fontSize', false, '7'); // 임시 크기로 설정 후 변경

        let text = selected_object.text_element.innerHTML;
        text = text.replaceAll('xxx-large', `${value.value}px`);

        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertHTML', false, text);
        objects = objects;
    }

    /**
     * 객체 리사이즈 로직을 처리합니다.
     * @param {MouseEvent} event - 마우스 이벤트.
     * @param {object} object - 리사이즈 대상 객체.
     * @param {string} edge - 리사이즈 핸들 위치.
     * @returns {{width: number, height: number, x: number, y: number}} 새 크기 및 위치.
     */
    function handle_resize(event, object, edge) {
		const rad = (object.angle * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		let mouse_x = event.clientX - canvas_rect.left;
		let mouse_y = event.clientY - canvas_rect.top;

		if (event.ctrlKey) {
			const canvas_width = width * scale;
			const canvas_height = height * scale;
			mouse_x = Math.max(0, Math.min(mouse_x, canvas_width));
			mouse_y = Math.max(0, Math.min(mouse_y, canvas_height));
		}

		const center_x = start_obj_x + start_width / 2;
		const center_y = start_obj_y + start_height / 2;

		const dir_x = edge.includes('left')
			? -1
			: edge.includes('right')
			  ? 1
			  : 0;
		const dir_y = edge.includes('top')
			? -1
			: edge.includes('bottom')
			  ? 1
			  : 0;

		const pivot_local_x = (-dir_x * start_width) / 2;
		const pivot_local_y = (-dir_y * start_height) / 2;
		const pivot_offset_x = pivot_local_x * cos - pivot_local_y * sin;
		const pivot_offset_y = pivot_local_x * sin + pivot_local_y * cos;
		const pivot_x = center_x + pivot_offset_x;
		const pivot_y = center_y + pivot_offset_y;

		const vec_x = mouse_x - pivot_x;
		const vec_y = mouse_y - pivot_y;

		const unrotated_dx = vec_x * cos + vec_y * sin;
		const unrotated_dy = -vec_x * sin + vec_y * cos;

		let new_width, new_height;
		let final_unrotated_dx = unrotated_dx;
		let final_unrotated_dy = unrotated_dy;

		if (event.shiftKey) {
			const ratio = start_width / start_height;

			if (dir_x !== 0 && dir_y !== 0) { // Corner resize
				let temp_width = Math.max(min_size, Math.abs(unrotated_dx));
				let temp_height = Math.max(min_size, Math.abs(unrotated_dy));

				if (temp_width / ratio > temp_height) {
					new_width = temp_width;
					new_height = new_width / ratio;
				} else {
					new_height = temp_height;
					new_width = new_height * ratio;
				}
				final_unrotated_dx = Math.sign(unrotated_dx) * new_width;
				final_unrotated_dy = Math.sign(unrotated_dy) * new_height;

			} else if (dir_x !== 0) { // Horizontal resize
				new_width = Math.max(min_size, Math.abs(unrotated_dx));
				new_height = new_width / ratio;
			} else { // Vertical resize
				new_height = Math.max(min_size, Math.abs(unrotated_dy));
				new_width = new_height * ratio;
			}
		} else {
			if (dir_x === 0) {
				new_width = start_width;
				new_height = Math.max(min_size, Math.abs(unrotated_dy));
			} else if (dir_y === 0) {
				new_width = Math.max(min_size, Math.abs(unrotated_dx));
				new_height = start_height;
			} else {
				new_width = Math.max(min_size, Math.abs(unrotated_dx));
				new_height = Math.max(min_size, Math.abs(unrotated_dy));
			}
		}

		if (dir_x === 0) {
			// 상하 리사이즈 시에는 수평 이동 벡터를 0으로 설정
			final_unrotated_dx = 0;
		}
		if (dir_y === 0) {
			// 좌우 리사이즈 시에는 수직 이동 벡터를 0으로 설정
			final_unrotated_dy = 0;
		}

		const center_offset_local_x = final_unrotated_dx / 2;
		const center_offset_local_y = final_unrotated_dy / 2;
		const center_offset_x =
			center_offset_local_x * cos - center_offset_local_y * sin;
		const center_offset_y =
			center_offset_local_x * sin + center_offset_local_y * cos;
		const new_center_x = pivot_x + center_offset_x;
		const new_center_y = pivot_y + center_offset_y;

		return {
			width: new_width,
			height: new_height,
			x: new_center_x - new_width / 2,
			y: new_center_y - new_height / 2,
		};
	}

    /**
     * 객체 회전 로직을 처리합니다.
     * @param {MouseEvent} event - 마우스 이벤트.
     * @param {object} obj - 회전 대상 객체.
     */
    function handle_rotate(event, obj) {
		const center_x = obj.x + obj.width / 2;
		const center_y = obj.y + obj.height / 2;
		const mouse_x = event.clientX - canvas_rect.left;
		const mouse_y = event.clientY - canvas_rect.top;
		const dx = mouse_x - center_x;
		const dy = mouse_y - center_y;
		let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

		if (!rotate_handle_position) {
			angle += 180;
		}

		if (event.shiftKey) {
			angle = Math.round(angle / 5) * 5;
		}

		obj.angle = angle;
		objects = objects.map((o) => (o.id === obj.id ? o : o));
	}

    /**
     * 마우스 다운 이벤트 핸들러 (드래그, 리사이즈, 회전 시작).
     * @param {MouseEvent} event - 마우스 이벤트.
     * @param {object} obj - 대상 객체.
     * @param {string} type - 조작 유형.
     * @param {string|null} [edge=null] - 리사이즈 핸들 위치.
     */
    function handle_mouse_down(event, obj, type, edge = null) {
        if (!obj.selected) return;

        selected_object = obj;
        event.stopPropagation();

        if (type === 'drag') {
            is_dragging = true;
            start_x = event.clientX - obj.x;
            start_y = event.clientY - obj.y;
        } else if (type === 'resize') {
            is_resizing = true;
            show_resize_info = true; // 리사이즈 시작 시 정보 표시
            resize_edge = edge;
            start_x = event.clientX;
            start_y = event.clientY;
            start_width = obj.width;
            start_height = obj.height;
            start_obj_x = obj.x;
            start_obj_y = obj.y;
        } else if (type === 'rotate') {
            is_rotating = true;
            show_rotation_angle = true;
            rotate_handle_position = get_rotate_handle_position(obj);
        }
    }

    /**
     * 마우스 이동 이벤트 핸들러 (드래그, 리사이즈, 회전 중).
     * @param {MouseEvent} event - 마우스 이벤트.
     */
    function handle_mouse_move(event) {
		if (!selected_object.id) return;

		if (is_dragging) {
			let new_x = event.clientX - start_x;
			let new_y = event.clientY - start_y;

			if (event.shiftKey) {
				new_x = Math.round(new_x / 2) * 2;
				new_y = Math.round(new_y / 2) * 2;
			}

			const snap_threshold = 5;
			const new_snap_lines = [];
			const dragged_obj = selected_object;

			// --- Start of new snap logic ---

			// Un-rotated bounds for snapping
			const dragged_bounds = {
				left: new_x,
				top: new_y,
				right: new_x + dragged_obj.width,
				bottom: new_y + dragged_obj.height,
				h_center: new_x + dragged_obj.width / 2,
				v_center: new_y + dragged_obj.height / 2,
			};

			const snap_targets_h = [];
			const snap_targets_v = [];

			// Canvas snap targets
			const canvas_h_center = (width * scale) / 2;
			const canvas_v_center = (height * scale) / 2;
			const canvas_right = width * scale;
			const canvas_bottom = height * scale;
			snap_targets_h.push(0, canvas_h_center, canvas_right);
			snap_targets_v.push(0, canvas_v_center, canvas_bottom);

			const other_objects = objects.filter(o => o.id !== dragged_obj.id);

			other_objects.forEach(o => {
				const obj_h_center = o.x + o.width / 2;
				const obj_v_center = o.y + o.height / 2;

				// Add object's own snap points
				snap_targets_h.push(o.x, obj_h_center, o.x + o.width);
				snap_targets_v.push(o.y, obj_v_center, o.y + o.height);

				// Add midpoints between object and canvas edges
				snap_targets_h.push(obj_h_center / 2); // Midpoint with left edge (0)
				snap_targets_h.push((obj_h_center + canvas_right) / 2); // Midpoint with right edge
				snap_targets_v.push(obj_v_center / 2); // Midpoint with top edge (0)
				snap_targets_v.push((obj_v_center + canvas_bottom) / 2); // Midpoint with bottom edge
			});

			// Add midpoints between pairs of other objects
			for (let i = 0; i < other_objects.length; i++) {
				for (let j = i + 1; j < other_objects.length; j++) {
					const obj1 = other_objects[i];
					const obj2 = other_objects[j];

					const mid_center_x = (obj1.x + obj1.width / 2 + obj2.x + obj2.width / 2) / 2;
					snap_targets_h.push(mid_center_x);

					const mid_center_y = (obj1.y + obj1.height / 2 + obj2.y + obj2.height / 2) / 2;
					snap_targets_v.push(mid_center_y);
				}
			}

			let best_snap_x = null;
			let min_dist_x = snap_threshold;

			const dragged_points_x = {
				left: dragged_bounds.left,
				h_center: dragged_bounds.h_center,
				right: dragged_bounds.right,
			};

			for (const target_x of snap_targets_h) {
				for (const [point_name, point_pos] of Object.entries(
					dragged_points_x,
				)) {
					const dist = Math.abs(point_pos - target_x);
					if (dist < min_dist_x) {
						min_dist_x = dist;
						best_snap_x = { point_name, target: target_x };
					}
				}
			}

			if (best_snap_x) {
				const { point_name, target } = best_snap_x;
				if (point_name === 'left') {
					new_x = target;
				} else if (point_name === 'h_center') {
					new_x = target - dragged_obj.width / 2;
				} else if (point_name === 'right') {
					new_x = target - dragged_obj.width;
				}
				new_snap_lines.push({ type: 'v', position: target });
			}

			let best_snap_y = null;
			let min_dist_y = snap_threshold;

			const dragged_points_y = {
				top: dragged_bounds.top,
				v_center: dragged_bounds.v_center,
				bottom: dragged_bounds.bottom,
			};

			for (const target_y of snap_targets_v) {
				for (const [point_name, point_pos] of Object.entries(
					dragged_points_y,
				)) {
					const dist = Math.abs(point_pos - target_y);
					if (dist < min_dist_y) {
						min_dist_y = dist;
						best_snap_y = { point_name, target: target_y };
					}
				}
			}

			if (best_snap_y) {
				const { point_name, target } = best_snap_y;
				if (point_name === 'top') {
					new_y = target;
				} else if (point_name === 'v_center') {
					new_y = target - dragged_obj.height / 2;
				} else if (point_name === 'bottom') {
					new_y = target - dragged_obj.height;
				}
				new_snap_lines.push({ type: 'h', position: target });
			}

			// --- End of new snap logic ---

			snap_lines = new_snap_lines;

			selected_object.x = new_x;
			selected_object.y = new_y;

			const current_bounds_drag = {
				left: selected_object.x,
				top: selected_object.y,
				right: selected_object.x + selected_object.width,
				bottom: selected_object.y + selected_object.height,
			};

			let h_distances = [];
			let v_distances = [];

			// Check against canvas edges
			h_distances.push({ dist: Math.abs(current_bounds_drag.left - 0), direction: 'left' });
			h_distances.push({ dist: Math.abs(current_bounds_drag.right - canvas_right), direction: 'right' });
			v_distances.push({ dist: Math.abs(current_bounds_drag.top - 0), direction: 'top' });
			v_distances.push({ dist: Math.abs(current_bounds_drag.bottom - canvas_bottom), direction: 'bottom' });

			// Check against other objects
			objects.filter(o => o.id !== selected_object.id).forEach(o => {
				h_distances.push({ dist: Math.abs(current_bounds_drag.left - (o.x + o.width)), direction: 'left' });
				h_distances.push({ dist: Math.abs(current_bounds_drag.right - o.x), direction: 'right' });
				v_distances.push({ dist: Math.abs(current_bounds_drag.top - (o.y + o.height)), direction: 'top' });
				v_distances.push({ dist: Math.abs(current_bounds_drag.bottom - o.y), direction: 'bottom' });
			});

			const min_h_dist = h_distances.sort((a,b) => a.dist - b.dist)[0];
			const min_v_dist = v_distances.sort((a,b) => a.dist - b.dist)[0];

			const new_distance_info = [];
			if (min_h_dist && min_h_dist.dist > 0.5) {
				new_distance_info.push({ distance: Math.round(min_h_dist.dist), direction: min_h_dist.direction });
			}
			if (min_v_dist && min_v_dist.dist > 0.5) {
				new_distance_info.push({ distance: Math.round(min_v_dist.dist), direction: min_v_dist.direction });
			}

			if (new_distance_info.length > 0) {
				distance_info = new_distance_info;
			} else {
				distance_info = null;
			}

			objects = objects.map((obj) =>
				obj.id === selected_object.id ? selected_object : obj,
			);
		} else if (is_resizing) {
			const result = handle_resize(event, selected_object, resize_edge);
			selected_object.width = result.width;
			selected_object.height = result.height;
			selected_object.x = result.x;
			selected_object.y = result.y;

			// Calculate and update distance_info
			const current_bounds = {
				left: selected_object.x,
				top: selected_object.y,
				right: selected_object.x + selected_object.width,
				bottom: selected_object.y + selected_object.height,
			};

			let min_distance = Infinity;
			let distance_direction = '';

			const canvas_width = width * scale;
			const canvas_height = height * scale;

			const check_distance = (current_pos, target_pos, direction) => {
				const dist = Math.abs(current_pos - target_pos);
				if (dist < min_distance) {
					min_distance = dist;
					distance_direction = direction;
				}
			};

			// Check against canvas edges
			if (resize_edge.includes('left')) {
				check_distance(current_bounds.left, 0, 'left');
			} else if (resize_edge.includes('right')) {
				check_distance(current_bounds.right, canvas_width, 'right');
			}

			if (resize_edge.includes('top')) {
				check_distance(current_bounds.top, 0, 'top');
			} else if (resize_edge.includes('bottom')) {
				check_distance(current_bounds.bottom, canvas_height, 'bottom');
			}

			// Check against other objects
			objects
				.filter((o) => o.id !== selected_object.id)
				.forEach((o) => {
					if (resize_edge.includes('left')) {
						check_distance(current_bounds.left, o.x + o.width, 'left');
					} else if (resize_edge.includes('right')) {
						check_distance(current_bounds.right, o.x, 'right');
					}

					if (resize_edge.includes('top')) {
						check_distance(current_bounds.top, o.y + o.height, 'top');
					} else if (resize_edge.includes('bottom')) {
						check_distance(current_bounds.bottom, o.y, 'bottom');
					}
				});

			if (min_distance !== Infinity && min_distance > 0) {
				distance_info = [{
					distance: Math.round(min_distance),
					direction: distance_direction,
				}];
			} else {
				distance_info = null;
			}

			objects = objects.map((obj) =>
				obj.id === selected_object.id ? selected_object : obj,
			);
		} else if (is_rotating) {
			handle_rotate(event, selected_object);
		}
	}

    /**
     * 마우스 업 이벤트 핸들러 (드래그, 리사이즈, 회전 종료).
     */
    function handle_mouse_up() {
        is_dragging = false;
        is_resizing = false;
        is_rotating = false;
        show_rotation_angle = false;
        show_resize_info = false; // 리사이즈 종료 시 정보 숨김
        distance_info = null; // 리사이즈 종료 시 거리 정보 숨김
        resize_edge = null;
        snap_lines = [];
    }

    /**
     * 캔버스 빈 공간 클릭 시 모든 객체의 선택을 해제합니다.
     * @param {MouseEvent} event - 마우스 이벤트.
     */
    function handle_canvas_mouse_down(event) {
        if (
            event.target === canvas ||
            event.target === canvas_container ||
            event.target === canvas_wrapper
        ) {
            is_history_action = true;
            selected_object = {};
            objects = objects.map((o) => ({ ...o, selected: false }));
        }
    }

    /**
     * 키보드 이벤트 핸들러 (단축키 처리).
     * @param {KeyboardEvent} event - 키보드 이벤트.
     */
    function handle_keydown(event) {
        // 텍스트 편집 중에는 단축키 비활성화
        if (is_editing_text) return;

        if (selected_object.id) {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                delete_object();
                event.preventDefault(); // 브라우저 기본 동작 방지
            } else if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                duplicate_object();
                event.preventDefault();
            }
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            undo();
            event.preventDefault();
        } else if (
            (event.ctrlKey || event.metaKey) &&
            (event.key === 'y' || (event.shiftKey && event.key === 'Z'))
        ) {
            redo();
            event.preventDefault();
        }
    }

    /**
     * 캔버스 컨테이너의 정렬을 업데이트합니다.
     * 캔버스 높이가 래퍼보다 크면 상단 정렬, 작으면 중앙 정렬합니다.
     */
    function update_container_align() {
        if (!canvas_wrapper || !canvas_container) return;

        const wrapper_height = canvas_wrapper.clientHeight;
        const canvas_height = height * scale;

        container_align =
            canvas_height > wrapper_height ? 'flex-start' : 'center';
        canvas_rect = canvas.getBoundingClientRect();
    }

    /**
     * 캔버스 내용을 이미지 파일로 저장합니다.
     * @param {string} [type='png'] - 저장할 이미지 형식 ('png', 'jpeg', 'svg', 'blob') 또는 'obj' (객체 데이터).
     * @returns {Promise<string|Blob|object>} 이미지 데이터 URL, Blob 또는 객체 배열.
     */
    async function save_image(type = 'png') {
        if (type === 'obj') {
            return JSON.parse(
                JSON.stringify(history[current_history_index]),
            );
        }

        const snap_line_elements = canvas?.querySelectorAll('.snap-line');
        if (snap_line_elements) {
            snap_line_elements.forEach(el => el.style.visibility = 'hidden');
        }

        try {
            switch (type) {
                case 'png':
                    return await htmlToImage.toPng(canvas);
                case 'jpg':
                case 'jpeg':
                    return await htmlToImage.toJpeg(canvas);
                case 'svg':
                    return await htmlToImage.toSvg(canvas);
                case 'blob':
                    return await htmlToImage.toBlob(canvas);
                default:
                    return '';
            }
        } finally {
            if (snap_line_elements) {
                snap_line_elements.forEach(el => el.style.visibility = 'visible');
            }
        }
    }
</script>

<svelte:window on:mousemove={handle_mouse_move} on:mouseup={handle_mouse_up} />

<div
    class="canvas-wrapper"
    bind:this={canvas_wrapper}
    on:mousedown={handle_canvas_mouse_down}
    on:keydown={handle_keydown}
    tabindex="0"
>
    <div
        class="canvas-container"
        bind:this={canvas_container}
        style="display: flex; align-items: {container_align}; justify-content: center; min-height: 100%; width: 100%;"
    >
        <div
            class="canvas-bg"
            style="width: {width * scale}px; height: {height * scale}px; "
        ></div>
        <div
            class="canvas"
            bind:this={canvas}
            style="width: {width * scale}px; height: {height * scale}px; "
        >
            <div class="objects-container">
                {#each objects as obj (obj.id)}
                    {#if obj.type === 'text'}
                        <TextObject
                            {obj}
                            {canvas_rect}
                            {get_rotate_handle_position}
                            {show_rotation_angle}
                            {selected_object}
                            {show_resize_info}
                            {distance_info}
                            on:mouse_down={(e) =>
                                handle_mouse_down(
                                    e.detail.event,
                                    e.detail.obj,
                                    e.detail.type,
                                    e.detail.edge,
                                )}
                            on:select_object={(e) => select_object(e.detail)}
                            on:text_edit_start={() => (is_editing_text = true)}
                            on:text_edit_end={() => (is_editing_text = false)}
                            on:update_object={() => (objects = [...objects])}
                        />
                    {:else if obj.type === 'image'}
                        <ImageObject
                            {obj}
                            {canvas_rect}
                            {get_rotate_handle_position}
                            {show_rotation_angle}
                            {selected_object}
                            {show_resize_info}
                            {distance_info}
                            on:mouse_down={(e) =>
                                handle_mouse_down(
                                    e.detail.event,
                                    e.detail.obj,
                                    e.detail.type,
                                    e.detail.edge,
                                )}
                            on:select_object={(e) => select_object(e.detail)}
                    />
                {/if}
            {/each}
            {#each snap_lines as line}
                {#if line.type === 'v'}
                    <div
                        class="snap-line vertical"
                        style="left: {line.position}px;"
                    ></div>
                {:else}
                    <div
                        class="snap-line horizontal"
                        style="top: {line.position}px;"
                    ></div>
                {/if}
            {/each}
        </div>
    </div>
</div>
</div>

<style>
    .canvas-wrapper {
        height: 100%;
        position: relative;
        display: flex;
        flex: 1;
        overflow: scroll;
    }
    .canvas-wrapper:focus {
        outline: none;
    }

    .canvas-container {
        height: 100%;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    .canvas-bg {
        background: #f5f5f5;
        border: 1px solid #ccc;
        position: absolute;
    }
    .canvas {
        /* overflow: hidden; */
        flex-shrink: 0;
        position: relative;
    }
    .objects-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
    }
    .snap-line {
        position: absolute;
        background-color: #ff00e0;
        z-index: 9999;
    }

    .snap-line.vertical {
        width: 1px;
        height: 100%;
        top: 0;
    }

    .snap-line.horizontal {
        height: 1px;
        width: 100%;
        left: 0;
    }
</style>
