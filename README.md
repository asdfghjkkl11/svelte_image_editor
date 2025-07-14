# Svelte Image Editor

Svelte로 만들어진 간단하고 유연한 이미지 에디터 컴포넌트입니다. 텍스트 및 이미지 객체를 추가하고, 이동, 리사이즈, 회전, 순서 변경 등 다양한 편집 기능을 제공합니다.

## 주요 기능

-   **객체 추가**: 텍스트와 이미지를 캔버스에 추가할 수 있습니다.
-   **객체 조작**: 객체를 선택하고 이동, 리사이즈, 회전할 수 있습니다.
-   **순서 제어**: 객체를 맨 앞으로, 앞으로, 뒤로, 맨 뒤로 보낼 수 있습니다.
-   **히스토리 관리**: 실행 취소(Undo) 및 다시 실행(Redo) 기능을 지원합니다.
-   **텍스트 서식**: 텍스트의 폰트, 크기, 색상, 정렬 등 다양한 서식을 변경할 수 있습니다.
-   **이미지 저장**: 편집된 캔버스를 PNG, JPG, SVG 등 다양한 형식으로 저장할 수 있습니다.

## 설치

```bash
npm install svelte-image-editor
```

## 사용 방법

```svelte
<script>
    import ImageEditor from 'svelte-image-editor';

    let imageEditor; // ImageEditor 인스턴스를 바인딩할 변수
    let current_history_index;
    let history_length;

    // 에디터 옵션
    const option = {
        width: 800,
        height: 600,
        scale: 1,
    };

    // 텍스트 객체 추가
    function addText() {
        imageEditor.action('add_text_object');
    }

    // 이미지 객체 추가 (Data URL 또는 이미지 URL)
    function addImage(imageDataUrl) {
        imageEditor.action('add_image_object', imageDataUrl);
    }

    // 실행 취소
    function undo() {
        imageEditor.action('undo');
    }

    // 다시 실행
    function redo() {
        imageEditor.action('redo');
    }

    // 이미지 저장
    async function saveImage() {
        const dataUrl = await imageEditor.action('save', 'png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'image.png';
        a.click();
    }
</script>

<div>
    <div class="controls">
        <button on:click={addText}>텍스트 추가</button>
        <button on:click={undo} disabled={current_history_index <= 0}>실행 취소</button>
        <button on:click={redo} disabled={current_history_index >= history_length - 1}>다시 실행</button>
        <button on:click={saveImage}>저장</button>
        <!-- 다른 컨트롤 버튼들 -->
    </div>

    <ImageEditor
        bind:this={imageEditor}
        {option}
        bind:current_history_index
        bind:history_length
    />
</div>
```

## API

### Props

| 이름                  | 타입     | 기본값 | 설명                                                                 |
| --------------------- | -------- | ------ | -------------------------------------------------------------------- |
| `option`              | `object` | `{}`   | 에디터의 설정을 담는 객체입니다. (아래 `Option 객체` 참조)           |
| `history_length`      | `number` | `0`    | `bind:` 디렉티브를 통해 현재 히스토리 길이를 받아올 수 있습니다.     |
| `current_history_index` | `number` | `0`    | `bind:` 디렉티브를 통해 현재 히스토리 인덱스를 받아올 수 있습니다. |

#### Option 객체

`option` prop으로 다음의 값들을 설정할 수 있습니다.

| 이름    | 타입     | 기본값 | 설명             |
| ------- | -------- | ------ | ---------------- |
| `width` | `number` | `600`  | 캔버스 너비      |
| `height`| `number` | `1800` | 캔버스 높이      |
| `scale` | `number` | `0.5`  | 캔버스 스케일    |
| `...`   | `boolean`| `true` | 각 기능 활성화 여부 |

### Methods

`bind:this`를 통해 컴포넌트 인스턴스를 받아온 후, `action` 메소드를 사용하여 다양한 기능을 실행할 수 있습니다.

`imageEditor.action(type, payload)`

| `type` (string)                      | `payload`                               | 설명                                                               |
| ------------------------------------ | --------------------------------------- | ------------------------------------------------------------------ |
| `add_text_object`                    | -                                       | 새로운 텍스트 객체를 추가합니다.                                   |
| `add_image_object`                   | `string` (이미지 URL)                   | 새로운 이미지 객체를 추가합니다.                                   |
| `delete_object`                      | -                                       | 현재 선택된 객체를 삭제합니다.                                     |
| `duplicate_object`                   | -                                       | 현재 선택된 객체를 복제합니다.                                     |
| `bring_forward`                      | -                                       | 선택된 객체를 한 단계 앞으로 가져옵니다.                           |
| `send_backward`                      | -                                       | 선택된 객체를 한 단계 뒤로 보냅니다.                               |
| `bring_to_front`                     | -                                       | 선택된 객체를 맨 앞으로 가져옵니다.                                |
| `send_to_back`                       | -                                       | 선택된 객체를 맨 뒤로 보냅니다.                                    |
| `undo`                               | -                                       | 이전 작업을 취소합니다.                                            |
| `redo`                               | -                                       | 취소된 작업을 다시 실행합니다.                                     |
| `format_text`                        | `{ command: string, value?: any }`      | 선택된 텍스트에 서식을 적용합니다. (예: `bold`, `italic`, `foreColor`) |
| `change_font_size`                   | `{ value: string }`                     | 선택된 텍스트의 폰트 크기를 변경합니다.                            |
| `set_text_object_background_color`   | `string` (색상 값)                      | 선택된 텍스트 객체의 배경색을 변경합니다.                          |
| `save`                               | `string` ('png', 'jpeg', 'svg', 'blob') | 캔버스 내용을 지정된 형식으로 변환하여 반환합니다.                 |

## 라이선스

MIT