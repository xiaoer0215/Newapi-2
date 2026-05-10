# AI 生图 API 对外调用说明

本文档面向外部接入方，说明如何调用本平台的图片生成能力。

---

## 1. 快速开始

### 1.1 基础地址

OpenAI 兼容接口建议使用：

```text
BASE_URL=https://www.uocode.com/v1
```

Gemini 原生接口使用：

```text
BASE_URL=https://www.uocode.com
```

### 1.2 鉴权方式

统一使用 Bearer Token：

```http
Authorization: Bearer sk-你的APIKey
```

---

## 2. 接口一览

| 场景 | 接口 |
| --- | --- |
| 文生图 | `POST /v1/images/generations` |
| 图片编辑 / 参考图生图 | `POST /v1/images/edits` |
| Responses 生图 | `POST /v1/responses` |
| Gemini 原生生图 | `POST /v1beta/models/{model}:generateContent` |

---

## 3. 文生图

### 请求示例

```bash
curl "$BASE_URL/images/generations" \
  -H "Authorization: Bearer sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "imagen-3.0-generate-002",
    "prompt": "一只橘猫坐在赛博朋克街头，电影感，超清细节",
    "n": 1,
    "size": "4096x2304",
    "quality": "4k"
  }'
```

### 返回示例

```json
{
  "created": 1760000000,
  "data": [
    {
      "url": "https://example.com/image.png",
      "revised_prompt": "..."
    }
  ]
}
```

也可能返回：

```json
{
  "data": [
    {
      "b64_json": "iVBORw0KGgo..."
    }
  ]
}
```

---

## 4. 图片编辑 / 参考图生图

适用于带参考图的生图场景。

### 接口

```http
POST /v1/images/edits
Content-Type: multipart/form-data
Authorization: Bearer sk-xxxx
```

### 请求字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `model` | 是 | 模型名，如 `gpt-image-1` |
| `prompt` | 是 | 提示词 |
| `image` / `image[]` | 是 | 参考图，单图用 `image`，多图用 `image[]` |
| `n` | 否 | 生成数量 |
| `size` | 否 | `1024x1024`、`1536x1024`、`1024x1536` |
| `quality` | 否 | `medium` / `high` |

### 示例

```bash
curl "$BASE_URL/images/edits" \
  -H "Authorization: Bearer sk-xxxx" \
  -F "model=gpt-image-1" \
  -F "prompt=参考这张图的人物姿势，生成一张写实商业海报" \
  -F "n=1" \
  -F "size=1536x1024" \
  -F "quality=high" \
  -F "image=@./reference.png"
```

多张参考图：

```bash
curl "$BASE_URL/images/edits" \
  -H "Authorization: Bearer sk-xxxx" \
  -F "model=gpt-image-1" \
  -F "prompt=融合两张参考图的主体和风格，生成一张横版封面" \
  -F "size=1536x1024" \
  -F "quality=high" \
  -F "image[]=@./ref1.png" \
  -F "image[]=@./ref2.png"
```

---

## 5. Responses 生图

适合 `gpt-4o`、`gpt-4.1`、`gpt-4.5`、`gpt-5` 等走 Responses 的模型。

### 请求示例

```bash
curl "$BASE_URL/responses" \
  -H "Authorization: Bearer sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "生成一张 16:9 科幻城市夜景，蓝紫色霓虹，电影海报风格"
          }
        ]
      }
    ],
    "tools": [
      {
        "type": "image_generation",
        "size": "1536x1024",
        "quality": "high"
      }
    ],
    "tool_choice": {
      "type": "image_generation"
    }
  }'
```

参考图生图时，可在 `content` 中加入 `input_image`。

---

## 6. Gemini 原生生图

### 请求示例

```bash
curl "$BASE_URL/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent" \
  -H "Authorization: Bearer sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "生成一张 1:1 的可爱机器人头像，白色背景，3D 渲染"
          }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "candidateCount": 1,
      "aspectRatio": "1:1",
      "imageSize": "2K",
      "outputMimeType": "image/jpeg",
      "imageConfig": {
        "aspectRatio": "1:1",
        "imageSize": "2K"
      }
    }
  }'
```

带参考图时，把图片作为 `inlineData` 传入即可。

---

## 7. 4K / 尺寸说明

### 7.1 普通图片生成

如果模型本身支持真实大图，可以直接请求：

| 档位 | 1:1 | 3:2 | 2:3 | 4:3 | 3:4 | 16:9 | 9:16 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1K | `1024x1024` | `1536x1024` | `1024x1536` | `1536x1152` | `1152x1536` | `1792x1024` | `1024x1792` |
| 2K | `2048x2048` | `1920x1280` | `1280x1920` | `2048x1536` | `1536x2048` | `2048x1152` | `1152x2048` |
| 4K | `4096x4096` | `3840x2560` | `2560x3840` | `4096x3072` | `3072x4096` | `4096x2304` | `2304x4096` |

### 7.2 `gpt-image-*` / `chatgpt-image-latest`

这类模型的 `4K` 通常不是直接输出 `4096`，而是：

- 正方形：`1024x1024`
- 横图：`1536x1024`
- 竖图：`1024x1536`

`2K` / `4K` 主要对应质量档：

- `2K` → `medium`
- `4K` → `high`

### 7.3 DALL-E

- `dall-e` / `dall-e-2`：固定 `1024x1024`
- `dall-e-3`：支持横图 / 竖图 / 正方形，`2K / 4K` 对应更高质量，不代表固定 4096 输出

### 7.4 重要说明

`4K` 在不同模型里含义不同：

- **普通模型**：尽量按真实像素大小请求
- **OpenAI 新图像模型 / Responses**：更多是质量档
- **Gemini**：由上游模型决定最终实际像素

---

## 8. Python 示例

### 8.1 文生图

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-xxxx",
    base_url="https://www.uocode.com/v1",
)

result = client.images.generate(
    model="imagen-3.0-generate-002",
    prompt="一只橘猫坐在赛博朋克街头，电影感，超清细节",
    n=1,
    size="4096x2304",
    quality="4k",
)

print(result.data[0].url or result.data[0].b64_json)
```

### 8.2 Responses 生图

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-xxxx",
    base_url="https://www.uocode.com/v1",
)

resp = client.responses.create(
    model="gpt-4o",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "生成一张 16:9 科幻城市夜景，电影海报风格",
                }
            ],
        }
    ],
    tools=[
        {
            "type": "image_generation",
            "size": "1536x1024",
            "quality": "high",
        }
    ],
    tool_choice={"type": "image_generation"},
)

print(resp)
```

---

## 9. 常见问题

### Q1：为什么选了 4K，结果看起来不是 4096？

因为 `4K` 只是尺寸档位，不是所有模型都支持真实 4096 输出。像 `gpt-image-*`、Responses、Gemini 都可能只返回较小画布，但质量会提高。

### Q2：参考图支持几张？

建议最多 3 张。

### Q3：接口返回什么格式？

通常是：

- `url`
- `b64_json`

具体取决于模型和上游返回。

### Q4：如何判断该用哪个接口？

最简单的方式是：

- 普通文生图 → `images/generations`
- 参考图 / 编辑 → `images/edits`
- `gpt-4o` / `gpt-5` → `responses`
- Gemini → `v1beta/models/{model}:generateContent`
