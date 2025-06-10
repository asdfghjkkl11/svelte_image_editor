# Svelte Image Editor

간단한 이미지 에디터 컴포넌트입니다.

## 설치

```bash
npm install svelte-image-editor
```

## 사용 방법

```svelte
<script>
  import ImageEditor from 'svelte-image-editor';
  
  const imageUrl = 'path/to/your/image.jpg';
</script>

<ImageEditor {imageUrl} width={800} height={600} />
```

## Props

- `imageUrl` (string): 편집할 이미지의 URL
- `width` (number): 캔버스 너비 (기본값: 800)
- `height` (number): 캔버스 높이 (기본값: 600)

## 라이선스

MIT
