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
     * @description 외부에서 에디터의 기능을 실행하기 위한 통합 인터페이스 함수입니다.
     * 이 함수는 `type`에 따라 적절한 내부 함수를 호출하여 에디터의 다양한 기능을 수행합니다.
     * @param {string} type - 실행할 액션의 종류. (예: 'add_text_object', 'undo', 'save')
     * @param {any} payload - 액션에 필요한 데이터. (예: 이미지 소스, 포맷팅 옵션)
     * @returns {Promise<any>} 액션 실행 결과. 'save' 액션의 경우, 생성된 이미지의 데이터 URL을 반환합니다.
     */
    export async function action(type, payload) {
        // 전달받은 type에 따라 해당하는 내부 함수를 호출합니다.
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
                // save_image는 비동기로 동작하며, 이미지 데이터 URL을 반환합니다.
                return await save_image(payload);
        }
    }

    /**
     * @description 새로운 텍스트 객체를 캔버스 중앙에 추가합니다.
     * 새 객체는 기본 크기와 '텍스트'라는 초기 내용을 가집니다.
     * 추가 후, 다른 모든 객체의 선택은 해제되고 새 텍스트 객체가 선택됩니다.
     */
    export function add_text_object() {
        // 새로운 텍스트 객체의 속성을 정의합니다.
        const new_text_object = {
            id: Date.now(), // 고유 ID로 현재 타임스탬프를 사용합니다.
            type: 'text',
            x: 50, // 초기 x 좌표
            y: 50, // 초기 y 좌표
            width: 300, // 초기 너비
            height: 100, // 초기 높이
            angle: 0, // 초기 회전 각도
            color: 'transparent', // 초기 배경색
            selected: true, // 생성 시 바로 선택되도록 설정합니다.
            text: '텍스트', // 초기 텍스트 내용
        };
        // 기존의 모든 객체를 선택 해제 상태로 변경합니다.
        objects = objects.map((obj) => ({ ...obj, selected: false }));
        // 새로운 텍스트 객체를 objects 배열에 추가합니다.
        objects = [...objects, new_text_object];
        // 새로 추가된 객체를 현재 선택된 객체로 설정합니다.
        selected_object = new_text_object;
    }

    /**
     * @description 새로운 이미지 객체를 캔버스에 추가합니다.
     * 이미지를 로드하여 원본 비율을 유지하면서 캔버스 크기에 맞게 스케일을 조정합니다.
     * 이미지는 캔버스 중앙에 배치되며, 추가 후 다른 객체는 선택 해제되고 새 이미지가 선택됩니다.
     * @param {string} src - 추가할 이미지의 데이터 URL.
     */
    export async function add_image_object(src) {
        // 새로운 Image 객체를 생성하여 이미지 로드를 시작합니다.
        const img = new Image();
        img.src = src;

        // 이미지가 완전히 로드될 때까지 기다립니다.
        await new Promise((resolve) => {
            img.onload = resolve;
        });

        // 이미지의 원본 크기에 현재 캔버스 스케일을 적용합니다.
        let img_width = img.naturalWidth * scale;
        let img_height = img.naturalHeight * scale;

        // 캔버스의 스케일이 적용된 크기를 계산합니다.
        const canvas_scaled_width = width * scale;
        const canvas_scaled_height = height * scale;

        // 이미지의 크기가 캔버스를 벗어나는 경우, 캔버스에 맞게 크기를 재조정합니다.
        if (
            img_width > canvas_scaled_width ||
            img_height > canvas_scaled_height
        ) {
            // 너비와 높이 비율 중 더 작은 값을 선택하여 이미지의 원본 비율을 유지합니다.
            const width_ratio = canvas_scaled_width / img_width;
            const height_ratio = canvas_scaled_height / img_height;
            const ratio = Math.min(width_ratio, height_ratio);

            // 계산된 비율을 이미지 크기에 적용합니다.
            img_width *= ratio;
            img_height *= ratio;
        }

        // 새로운 이미지 객체의 속성을 정의합니다.
        const new_image_object = {
            id: Date.now(), // 고유 ID
            type: 'image',
            // 이미지를 캔버스 중앙에 배치하기 위한 좌표를 계산합니다.
            x: (canvas_scaled_width - img_width) / 2,
            y: (canvas_scaled_height - img_height) / 2,
            width: img_width, // 조정된 너비
            height: img_height, // 조정된 높이
            angle: 0,
            src, // 이미지 소스 URL
            alt: 'Uploaded Image',
            selected: true, // 생성 시 바로 선택되도록 설정
        };
        // 기존 객체들을 선택 해제하고 새로운 이미지 객체를 추가한 후, 선택된 객체로 설정합니다.
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
     * @description 객체의 회전 각도에 따라 회전 핸들의 최적 위치(상단 또는 하단)를 결정합니다.
     * 캔버스 중심과 객체 중심 사이의 벡터를 고려하여, 핸들이 캔버스 바깥으로 나가는 것을 최소화하는 위치를 반환합니다.
     * @param {object} obj - 위치를 결정할 대상 객체.
     * @returns {boolean} true이면 핸들을 객체 상단에, false이면 하단에 표시합니다.
     */
    function get_rotate_handle_position(obj) {
        // 객체의 Y축 중심 좌표를 계산합니다.
        const center_y = obj.y + obj.height / 2;
        // 객체의 회전 각도를 라디안으로 변환합니다.
        const rad = ((obj.angle || 0) * Math.PI) / 180;
        // 회전된 객체의 상단 핸들(머리 부분)의 Y 좌표를 계산합니다.
        const head_y = center_y - Math.cos(rad) * (obj.height / 2);
        // 객체 중심에서 핸들까지의 벡터와 캔버스 중심에서 객체 중심까지의 벡터를 내적하여
        // 핸들이 캔버스 중심을 향하는지 여부를 판단하고, 반대쪽에 핸들을 위치시켜 사용성을 개선합니다.
        return (head_y - center_y) * (canvas_y - center_y) < 0;
    }

    /**
     * @description 현재 선택된 텍스트 객체의 배경색을 변경합니다.
     * 선택된 객체가 텍스트 타입일 경우에만 동작합니다.
     * @param {string} color - 적용할 색상 값 (예: '#FF0000', 'red').
     */
    function set_text_object_background_color(color) {
        // 선택된 객체가 존재하고, 그 타입이 'text'인지 확인합니다.
        if (selected_object && selected_object.type === 'text') {
            // 선택된 객체의 색상 속성을 새로운 색상으로 변경합니다.
            selected_object.color = color;
            // objects 배열을 순회하며, ID가 일치하는 객체를 업데이트된 객체로 교체합니다.
            objects = objects.map((obj) =>
                obj.id === selected_object.id ? selected_object : obj,
            );
        }
    }

    /**
     * @description 현재 선택된 객체를 캔버스에서 삭제합니다.
     * 선택된 객체가 없으면 아무 동작도 하지 않습니다.
     * 삭제 후에는 선택된 객체가 없는 상태가 됩니다.
     */
    function delete_object() {
        // 선택된 객체가 있는지 확인합니다. (ID 존재 여부로 판단)
        if (!selected_object.id) return;
        // filter 함수를 사용하여 선택된 객체와 ID가 다른 객체들만 남깁니다.
        objects = objects.filter((o) => o.id !== selected_object.id);
        // 선택된 객체 정보를 초기화합니다.
        selected_object = {};
    }

    /**
     * @description 현재 선택된 객체를 복제하여 캔버스에 추가합니다.
     * 복제된 객체는 원본의 오른쪽 아래에 약간의 간격을 두고 생성되며, 즉시 선택 상태가 됩니다.
     * 선택된 객체가 없으면 아무 동작도 하지 않습니다.
     */
    function duplicate_object() {
        // 선택된 객체가 있는지 확인합니다.
        if (!selected_object.id) return;
        // 선택된 객체를 복사하고, 새로운 ID와 약간 이동된 좌표를 부여합니다.
        const new_obj = {
            ...selected_object,
            id: Date.now(),
            x: selected_object.x + 20,
            y: selected_object.y + 20,
            selected: true, // 복제된 객체를 바로 선택 상태로 만듭니다.
        };
        // 기존 객체들은 모두 선택 해제합니다.
        objects = objects.map((o) => ({ ...o, selected: false }));
        // 복제된 새 객체를 배열에 추가합니다.
        objects = [...objects, new_obj];
        // 선택된 객체를 새로 복제된 객체로 변경합니다.
        selected_object = new_obj;
    }

    /**
     * @description 선택된 객체를 한 단계 앞으로 가져옵니다. (z-index를 1 증가시킵니다)
     * 객체의 렌더링 순서를 조정하여 다른 객체 위에 표시되도록 합니다.
     * 이미 맨 앞에 있는 객체에는 적용되지 않습니다.
     */
    function bring_forward() {
        if (!selected_object.id) return;
        // objects 배열에서 선택된 객체의 현재 인덱스를 찾습니다.
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        // 객체가 존재하고, 맨 마지막(가장 위)에 있지 않은 경우에만 실행합니다.
        if (currentIndex < objects.length - 1) {
            // 배열 복사본을 만들어 원본 불변성을 유지하려 시도합니다.
            const newObjects = [...objects];
            // 현재 객체와 바로 다음 객체의 위치를 교환합니다.
            const temp = newObjects[currentIndex];
            newObjects[currentIndex] = newObjects[currentIndex + 1];
            newObjects[currentIndex + 1] = temp;
            // 변경된 배열을 실제 `objects`에 할당하여 UI를 업데이트합니다.
            objects = newObjects;
        }
    }

    /**
     * @description 선택된 객체를 한 단계 뒤로 보냅니다. (z-index를 1 감소시킵니다)
     * 객체의 렌더링 순서를 조정하여 다른 객체 아래에 표시되도록 합니다.
     * 이미 맨 뒤에 있는 객체에는 적용되지 않습니다.
     */
    function send_backward() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        // 객체가 존재하고, 맨 처음(가장 아래)에 있지 않은 경우에만 실행합니다.
        if (currentIndex > 0) {
            const newObjects = [...objects];
            // 현재 객체와 바로 이전 객체의 위치를 교환합니다.
            const temp = newObjects[currentIndex];
            newObjects[currentIndex] = newObjects[currentIndex - 1];
            newObjects[currentIndex - 1] = temp;
            objects = newObjects;
        }
    }

    /**
     * @description 선택된 객체를 캔버스의 모든 객체 중 가장 앞으로 가져옵니다.
     * 렌더링 순서를 최상위로 변경합니다.
     */
    function bring_to_front() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        // 객체가 배열 내에 존재하는 경우
        if (currentIndex !== -1) {
            const newObjects = [...objects];
            // `splice`를 사용하여 현재 위치에서 객체를 제거하고, 그 객체를 반환받습니다.
            const [movedObject] = newObjects.splice(currentIndex, 1);
            // 제거했던 객체를 배열의 맨 끝에 추가합니다.
            newObjects.push(movedObject);
            objects = newObjects;
        }
    }

    /**
     * @description 선택된 객체를 캔버스의 모든 객체 중 가장 뒤로 보냅니다.
     * 렌더링 순서를 최하위로 변경합니다.
     */
    function send_to_back() {
        if (!selected_object.id) return;
        const currentIndex = objects.findIndex(
            (o) => o.id === selected_object.id,
        );
        if (currentIndex !== -1) {
            const newObjects = [...objects];
            // 현재 위치에서 객체를 제거합니다.
            const [movedObject] = newObjects.splice(currentIndex, 1);
            // 제거했던 객체를 배열의 맨 앞에 추가합니다.
            newObjects.unshift(movedObject);
            objects = newObjects;
        }
    }

    /**
     * @description 특정 객체를 선택 상태로 만듭니다.
     * 해당 객체의 `selected` 속성을 `true`로 설정하고, 다른 모든 객체는 `false`로 설정합니다.
     * 이 동작은 히스토리에 기록되지 않습니다.
     * @param {object} obj - 선택할 객체.
     */
    function select_object(obj) {
        // 모든 객체를 순회하며, 전달된 객체(obj)와 ID가 일치하는 경우에만 `selected`를 true로 설정합니다.
        objects = objects.map((o) => ({ ...o, selected: o.id === obj.id }));
        // 현재 선택된 객체 정보를 업데이트합니다.
        selected_object = obj;
        // 객체 선택은 사용자의 의도적인 '편집' 행위가 아니므로, 히스토리에 저장하지 않도록 플래그를 설정합니다.
        is_history_action = true;
    }

    /**
     * @description 현재 캔버스의 객체 상태를 히스토리 배열에 저장합니다. (Undo/Redo를 위함)
     * 이전 상태와 동일한 경우 중복 저장을 방지합니다.
     * 새로운 상태가 추가되면, 현재 인덱스 이후의 모든 히스토리(Redo 스택)는 삭제됩니다.
     */
    function save_to_history() {
        // 현재 객체 배열을 JSON 문자열로 변환하여 상태를 기록합니다.
        const current_state = JSON.stringify(objects);
        // 히스토리의 마지막 상태와 현재 상태가 동일하면 중복 저장을 방지하고 함수를 종료합니다.
        if (
            history.length > 0 &&
            history[current_history_index] === current_state
        ) {
            return;
        }
        // 만약 사용자가 Undo를 한 상태에서 새로운 변경을 가했다면, 기존의 Redo 히스토리를 제거합니다.
        history = history.slice(0, current_history_index + 1);
        // 새로운 상태를 히스토리 배열에 추가합니다.
        history.push(current_state);
        // 현재 히스토리 인덱스를 마지막으로 업데이트합니다.
        current_history_index = history.length - 1;
        // 히스토리 길이를 업데이트하여 UI(예: Undo/Redo 버튼 활성화)에 반영합니다.
        history_length = history.length;
    }

    /**
     * @description 이전 작업 상태로 되돌립니다. (Undo)
     * 히스토리 배열에서 이전 상태를 불러와 캔버스를 업데이트합니다.
     * 더 이상 되돌릴 상태가 없으면 동작하지 않습니다.
     */
    function undo() {
        // 히스토리의 맨 처음이 아닐 경우에만 Undo가 가능합니다.
        if (current_history_index > 0) {
            // Undo/Redo 동작 자체는 히스토리에 기록되면 안 되므로 플래그를 설정합니다.
            is_history_action = true;
            // 현재 인덱스를 하나 감소시킵니다.
            current_history_index--;
            // 이전 상태의 JSON 문자열을 다시 객체로 파싱하여 `objects`를 업데이트합니다.
            objects = JSON.parse(history[current_history_index]);
            history_length = history.length;
        }
    }

    /**
     * @description 되돌렸던 작업을 다시 실행합니다. (Redo)
     * 히스토리 배열에서 다음 상태를 불러와 캔버스를 업데이트합니다.
     * 더 이상 다시 실행할 상태가 없으면 동작하지 않습니다.
     */
    function redo() {
        // 현재 인덱스가 히스토리의 끝보다 작은 경우에만 Redo가 가능합니다.
        if (current_history_index < history.length - 1) {
            is_history_action = true;
            current_history_index++;
            objects = JSON.parse(history[current_history_index]);
            history_length = history.length;
        }
    }

    /**
     * @description 선택된 텍스트 객체에 텍스트 서식을 적용합니다.
     * `document.execCommand`를 사용하여 볼드, 이탤릭, 밑줄 등의 서식을 적용합니다.
     * @param {string} command - `document.execCommand`에 전달될 명령어. (예: 'bold', 'italic')
     * @param {string|null} [value=null] - 명령어에 필요한 값. (예: 글자색상 코드)
     */
    function format_text(command, value = null) {
        // execCommand가 CSS 스타일(예: <span>)을 사용하도록 설정합니다. (<b>, <i> 태그 대신)
        document.execCommand('styleWithCSS', true, null);
        // 실제 서식 명령을 실행합니다.
        document.execCommand(command, false, value);
        // Svelte가 객체 내부의 `text_element.innerHTML` 변경을 감지하지 못할 수 있으므로,
        // `objects` 배열 자체를 다시 할당하여 변경 사항을 강제로 알립니다.
        objects = objects;
    }

    /**
     * @description 선택된 텍스트 객체의 폰트 크기를 변경합니다.
     * `document.execCommand('fontSize')`가 생성하는 `<font>` 태그 대신, CSS `font-size`를 직접 제어하기 위한 로직을 사용합니다.
     * @param {{value: string}} value - 적용할 폰트 크기 값. (예: { value: '16px' })
     */
    function change_font_size(value) {
        document.execCommand('styleWithCSS', true, null);
        // `fontSize` 명령은 1-7 사이의 값만 받으므로, 임시로 '7'(가장 큰 값)을 적용하여
        // `<span>` 태그가 `style="font-size: xxx-large;"` 속성을 갖도록 만듭니다.
        document.execCommand('fontSize', false, '7');

        // `contenteditable` 요소의 내부 HTML을 가져옵니다.
        let text = selected_object.text_element.innerHTML;
        // `xxx-large`를 우리가 원하는 실제 px 값으로 교체합니다.
        text = text.replaceAll('xxx-large', `${value.value}px`);

        // 텍스트 전체를 선택하고, 기존 내용을 삭제한 후, 수정된 HTML로 교체합니다.
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertHTML', false, text);
        // 변경사항을 Svelte에 알립니다.
        objects = objects;
    }

    /**
     * @description 객체의 크기를 조절하는 로직을 처리합니다.
     * 회전된 객체에 대해서도 올바른 방향으로 크기를 조절할 수 있도록 삼각함수를 사용하여 마우스 좌표를 변환합니다.
     * Shift 키를 누른 상태에서는 객체의 원래 비율을 유지하며 조절됩니다.
     * @param {MouseEvent} event - 마우스 이벤트 객체.
     * @param {object} object - 리사이즈 대상 객체.
     * @param {string} edge - 조절 중인 리사이즈 핸들의 위치. (예: 'top-left', 'bottom')
     * @returns {{width: number, height: number, x: number, y: number}} 계산된 객체의 새 너비, 높이, x, y 좌표.
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

            if (dir_x !== 0 && dir_y !== 0) {
                // Corner resize
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
            } else if (dir_x !== 0) {
                // Horizontal resize
                new_width = Math.max(min_size, Math.abs(unrotated_dx));
                new_height = new_width / ratio;
            } else {
                // Vertical resize
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
     * @description 객체를 회전시키는 로직을 처리합니다.
     * 객체의 중심점과 현재 마우스 포인터의 위치를 기반으로 각도를 계산합니다.
     * Shift 키를 누른 상태에서는 5도 단위로 각도가 스냅됩니다.
     * @param {MouseEvent} event - 마우스 이벤트 객체.
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
     * @description 마우스 버튼을 눌렀을 때의 초기 동작을 설정합니다.
     * 사용자가 객체를 드래그, 리사이즈, 회전 중 어떤 동작을 시작했는지 판단하고,
     * 관련 상태 변수(is_dragging, is_resizing, is_rotating)를 `true`로 설정하며, 조작에 필요한 초기값을 기록합니다.
     * @param {MouseEvent} event - 마우스 이벤트 객체.
     * @param {object} obj - 조작 대상이 되는 객체.
     * @param {string} type - 조작 유형. ('drag', 'resize', 'rotate')
     * @param {string|null} [edge=null] - 리사이즈 조작 시, 핸들의 위치. (예: 'top-left')
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
     * @description 마우스를 움직이는 동안 발생하는 핵심 로직을 처리합니다.
     * `is_dragging`, `is_resizing`, `is_rotating` 상태에 따라 각각의 처리 함수를 호출하여
     * 객체의 위치, 크기, 각도를 실시간으로 업데이트하고 스냅 라인과 거리 정보를 계산하여 표시합니다.
     * @param {MouseEvent} event - 마우스 이벤트 객체.
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

            const other_objects = objects.filter(
                (o) => o.id !== dragged_obj.id,
            );

            other_objects.forEach((o) => {
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

                    const mid_center_x =
                        (obj1.x + obj1.width / 2 + obj2.x + obj2.width / 2) / 2;
                    snap_targets_h.push(mid_center_x);

                    const mid_center_y =
                        (obj1.y + obj1.height / 2 + obj2.y + obj2.height / 2) /
                        2;
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
            h_distances.push({
                dist: Math.abs(current_bounds_drag.left - 0),
                direction: 'left',
            });
            h_distances.push({
                dist: Math.abs(current_bounds_drag.right - canvas_right),
                direction: 'right',
            });
            v_distances.push({
                dist: Math.abs(current_bounds_drag.top - 0),
                direction: 'top',
            });
            v_distances.push({
                dist: Math.abs(current_bounds_drag.bottom - canvas_bottom),
                direction: 'bottom',
            });

            // Check against other objects
            objects
                .filter((o) => o.id !== selected_object.id)
                .forEach((o) => {
                    h_distances.push({
                        dist: Math.abs(
                            current_bounds_drag.left - (o.x + o.width),
                        ),
                        direction: 'left',
                    });
                    h_distances.push({
                        dist: Math.abs(current_bounds_drag.right - o.x),
                        direction: 'right',
                    });
                    v_distances.push({
                        dist: Math.abs(
                            current_bounds_drag.top - (o.y + o.height),
                        ),
                        direction: 'top',
                    });
                    v_distances.push({
                        dist: Math.abs(current_bounds_drag.bottom - o.y),
                        direction: 'bottom',
                    });
                });

            const min_h_dist = h_distances.sort((a, b) => a.dist - b.dist)[0];
            const min_v_dist = v_distances.sort((a, b) => a.dist - b.dist)[0];

            const new_distance_info = [];
            if (min_h_dist && min_h_dist.dist > 0.5) {
                new_distance_info.push({
                    distance: Math.round(min_h_dist.dist),
                    direction: min_h_dist.direction,
                });
            }
            if (min_v_dist && min_v_dist.dist > 0.5) {
                new_distance_info.push({
                    distance: Math.round(min_v_dist.dist),
                    direction: min_v_dist.direction,
                });
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
                        check_distance(
                            current_bounds.left,
                            o.x + o.width,
                            'left',
                        );
                    } else if (resize_edge.includes('right')) {
                        check_distance(current_bounds.right, o.x, 'right');
                    }

                    if (resize_edge.includes('top')) {
                        check_distance(
                            current_bounds.top,
                            o.y + o.height,
                            'top',
                        );
                    } else if (resize_edge.includes('bottom')) {
                        check_distance(current_bounds.bottom, o.y, 'bottom');
                    }
                });

            if (min_distance !== Infinity && min_distance > 0) {
                distance_info = [
                    {
                        distance: Math.round(min_distance),
                        direction: distance_direction,
                    },
                ];
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
     * @description 마우스 버튼에서 손을 뗄 때, 진행 중이던 모든 조작(드래그, 리사이즈, 회전)을 종료합니다.
     * 모든 관련 상태 변수를 초기화하고, 표시되던 보조 정보(회전 각도, 리사이즈 정보, 거리)를 숨깁니다.
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
     * @description 캔버스의 빈 공간을 클릭했을 때, 현재 선택된 객체의 선택을 해제합니다.
     * 모든 객체의 `selected` 속성을 `false`로 설정하고, `selected_object`를 빈 객체로 만듭니다.
     * 이 동작은 히스토리에 기록되지 않습니다.
     * @param {MouseEvent} event - 마우스 이벤트 객체.
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
     * @description 키보드 입력을 처리하여 단축키 기능을 수행합니다.
     * - `Delete` 또는 `Backspace`: 선택된 객체 삭제
     * - `Ctrl/Cmd + D`: 선택된 객체 복제
     * - `Ctrl/Cmd + Z`: 실행 취소 (Undo)
     * - `Ctrl/Cmd + Y` 또는 `Ctrl/Cmd + Shift + Z`: 다시 실행 (Redo)
     * 텍스트 편집 중에는 단축키가 동작하지 않습니다.
     * @param {KeyboardEvent} event - 키보드 이벤트 객체.
     */
    function handle_keydown(event) {
        // 텍스트 객체의 내용을 편집하는 중에는 단축키가 동작하지 않도록 합니다.
        if (is_editing_text) return;

        // 선택된 객체가 있을 경우에만 삭제/복제 단축키가 동작합니다.
        if (selected_object.id) {
            // Delete 또는 Backspace 키를 누르면 선택된 객체를 삭제합니다.
            if (event.key === 'Delete' || event.key === 'Backspace') {
                delete_object();
                event.preventDefault(); // 브라우저의 기본 동작(예: 뒤로 가기)을 막습니다.
            } else if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                // Ctrl(Cmd) + D를 누르면 선택된 객체를 복제합니다.
                duplicate_object();
                event.preventDefault(); // 브라우저의 기본 동작(예: 북마크 추가)을 막습니다.
            }
        }

        // Ctrl(Cmd) + Z를 누르면 실행을 취소합니다.
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            undo();
            event.preventDefault();
        } else if (
            // Ctrl(Cmd) + Y 또는 Ctrl(Cmd) + Shift + Z를 누르면 다시 실행합니다.
            (event.ctrlKey || event.metaKey) &&
            (event.key === 'y' || (event.shiftKey && event.key === 'Z'))
        ) {
            redo();
            event.preventDefault();
        }
    }

    /**
     * @description 캔버스 컨테이너의 수직 정렬을 동적으로 업데이트합니다.
     * 캔버스의 높이가 화면(래퍼)보다 클 경우 상단에 정렬하고, 작거나 같을 경우 중앙에 정렬합니다.
     * 또한, 캔버스의 위치와 크기 정보(`canvas_rect`)를 업데이트하여 좌표 계산에 사용합니다.
     */
    function update_container_align() {
        // DOM 요소가 마운트되기 전에는 함수를 실행하지 않습니다.
        if (!canvas_wrapper || !canvas_container) return;

        // 캔버스 래퍼와 캔버스의 실제 높이를 가져옵니다.
        const wrapper_height = canvas_wrapper.clientHeight;
        const canvas_height = height * scale;

        // 캔버스 높이가 래퍼보다 크면 상단 정렬, 그렇지 않으면 중앙 정렬로 설정합니다.
        container_align =
            canvas_height > wrapper_height ? 'flex-start' : 'center';
        // 캔버스의 화면상 위치와 크기 정보를 업데이트합니다. 이 정보는 마우스 좌표 계산에 필수적입니다.
        canvas_rect = canvas.getBoundingClientRect();
    }

    /**
     * @description 현재 캔버스의 내용을 이미지 파일로 변환하고 반환합니다.
     * `html-to-image` 라이브러리를 사용하여 PNG, JPEG, SVG, Blob 등 다양한 형식으로 변환할 수 있습니다.
     * 'obj' 타입의 경우, 현재 객체 배열의 상태를 JSON 문자열로 반환합니다.
     * 이미지 변환 시, 스냅 라인은 보이지 않도록 처리합니다.
     * @param {string} [type='png'] - 저장할 이미지 형식. ('png', 'jpeg', 'svg', 'blob', 'obj')
     * @returns {Promise<string|Blob|object>} 변환된 이미지 데이터(URL, Blob) 또는 객체 데이터.
     */
    async function save_image(type = 'png') {
        // 'obj' 타입 요청 시, 현재 히스토리 상태를 깊은 복사하여 JSON 객체로 반환합니다.
        if (type === 'obj') {
            return JSON.parse(JSON.stringify(history[current_history_index]));
        }

        // 이미지로 저장할 때 화면에 보이는 스냅 라인을 일시적으로 숨깁니다.
        const snap_line_elements = canvas?.querySelectorAll('.snap-line');
        if (snap_line_elements) {
            snap_line_elements.forEach(
                (el) => (el.style.visibility = 'hidden'),
            );
        }

        try {
            // 요청된 타입에 따라 `html-to-image` 라이브러리의 적절한 함수를 호출합니다.
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
            // 이미지 생성이 성공하든 실패하든, 숨겼던 스냅 라인을 다시 보이게 처리합니다.
            if (snap_line_elements) {
                snap_line_elements.forEach(
                    (el) => (el.style.visibility = 'visible'),
                );
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
