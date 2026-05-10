# AI 生图调用文档

本文档对应站内 `AI 生图` 页面（`/console/drawing`）当前的真实调用方式。  
接口分两类：

- **站内初始化接口**：给已登录用户自动创建 / 获取“生图专用令牌”。
- **OpenAI / Gemini 兼容生图接口**：真正发起图片生成、图片编辑、参考图生图。

> 说明：站内页面会自动调用初始化接口并选择正确的生图模式；如果你自己写代码调用，也建议先读 `model_request_modes`，不要只靠模型名称硬编码。

---

## 1. 基础地址与鉴权

下面示例统一使用：

```text
BASE_URL=https://www.uocode.com
```

### 1.1 站内初始化鉴权

初始化接口走站内登录态，需要用户已经登录：

```http
GET /api/user/self/drawing/init
```

浏览器里由 Cookie / Session 鉴权，不使用 `sk-` 令牌。

### 1.2 生图接口鉴权

真正生图接口使用 API Key：

```http
Authorization: Bearer sk-你的令牌
```

如果走站内页面，`/api/user/self/drawing/init` 会返回可直接使用的：

```json
{
  "authorization": "Bearer sk-xxxx"
}
```

---

## 2. 初始化接口

### 请求

```bash
curl "$BASE_URL/api/user/self/drawing/init" \
  -H "Cookie: 你的登录Cookie"
```

### 返回示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "enabled": true,
    "group": "default",
    "models": [
      "gpt-image-1",
      "gpt-4o",
      "gemini-2.0-flash-preview-image-generation"
    ],
    "default_model": "gpt-image-1",
    "default_request_mode": "openai_image_edit",
    "model_request_modes": {
      "gpt-image-1": "openai_image_edit",
      "gpt-4o": "responses_image_generation",
      "gemini-2.0-flash-preview-image-generation": "gemini_generate_content"
    },
    "token_name": "系统：生图专用",
    "token_key": "xxxx",
    "authorization": "Bearer sk-xxxx",
    "endpoint": "/v1/images/generations",
    "responses_endpoint": "/v1/responses",
    "edit_endpoint": "/v1/images/edits"
  }
}
```

### 重要字段

| 字段 | 含义 |
| --- | --- |
| `enabled` | 后台是否启用了 AI 生图 |
| `models` | 当前用户可用的生图模型 |
| `default_model` | 默认模型 |
| `model_request_modes` | 每个模型应该走哪种请求模式 |
| `authorization` | 站内自动生成的生图专用 Bearer Token |
| `endpoint` | OpenAI 兼容图片生成接口 |
| `responses_endpoint` | Responses 图片生成接口 |
| `edit_endpoint` | OpenAI 兼容图片编辑接口 |

---

## 3. 请求模式说明

当前项目会按模型自动归类为下面 4 种模式：

| request mode | 使用接口 | 典型模型 / 场景 |
| --- | --- | --- |
| `image_generation` | `POST /v1/images/generations` | 普通 OpenAI 兼容图片生成、`imagen*`、支持图片生成端点的模型 |
| `openai_image_edit` | `POST /v1/images/edits` 或无参考图时走 `/v1/images/generations` | `gpt-image-*`、`chatgpt-image-latest` |
| `responses_image_generation` | `POST /v1/responses` | `gpt-4o`、`chatgpt-4o`、`gpt-4.1`、`gpt-4.5`、`gpt-5` 前缀模型 |
| `gemini_generate_content` | `POST /v1beta/models/{model}:generateContent` | 支持 Gemini 原生生图的模型 |

---

## 4. OpenAI 兼容图片生成

### 接口

```http
POST /v1/images/generations
Content-Type: application/json
Authorization: Bearer sk-xxxx
```

### 请求示例

```bash
curl "$BASE_URL/v1/images/generations" \
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

也可能返回 Base64：

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

## 5. OpenAI 兼容图片编辑 / 参考图生图

用于带参考图的 `gpt-image-*`、`chatgpt-image-latest` 这类模型。

### 接口

```http
POST /v1/images/edits
Content-Type: multipart/form-data
Authorization: Bearer sk-xxxx
```

### 请求字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `model` | 是 | 模型名，例如 `gpt-image-1` |
| `prompt` | 是 | 生图提示词 |
| `image` / `image[]` | 是 | 参考图，单图用 `image`，多图用 `image[]` |
| `n` | 否 | 图片数量，站内页面当前固定为 `1` |
| `size` | 否 | `1024x1024`、`1536x1024`、`1024x1536` |
| `quality` | 否 | `medium` 或 `high` |

### curl 示例

```bash
curl "$BASE_URL/v1/images/edits" \
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
curl "$BASE_URL/v1/images/edits" \
  -H "Authorization: Bearer sk-xxxx" \
  -F "model=gpt-image-1" \
  -F "prompt=融合两张参考图的主体和风格，生成一张横版封面" \
  -F "size=1536x1024" \
  -F "quality=high" \
  -F "image[]=@./ref1.png" \
  -F "image[]=@./ref2.png"
```

> 站内页面限制：参考图最多 3 张，单张最大 5MB，支持 `JPEG / PNG / WebP`。

---

## 6. Responses 图片生成

适合 `gpt-4o`、`gpt-5` 等走 Responses 端点的图片生成模型。

### 接口

```http
POST /v1/responses
Content-Type: application/json
Authorization: Bearer sk-xxxx
```

### 文生图示例

```bash
curl "$BASE_URL/v1/responses" \
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

### 参考图生图示例

```json
{
  "model": "gpt-4o",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "参考这张图的主体，换成未来科技风背景"
        },
        {
          "type": "input_image",
          "image_url": "data:image/png;base64,iVBORw0KGgo...",
          "detail": "high"
        }
      ]
    }
  ],
  "tools": [
    {
      "type": "image_generation",
      "size": "1024x1024",
      "quality": "high",
      "action": "edit"
    }
  ],
  "tool_choice": {
    "type": "image_generation"
  }
}
```

---

## 7. Gemini 原生生图

### 接口

```http
POST /v1beta/models/{model}:generateContent
Content-Type: application/json
Authorization: Bearer sk-xxxx
```

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

### 带参考图

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "iVBORw0KGgo..."
          }
        },
        {
          "text": "参考图片主体，生成一张商业插画风格海报"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "candidateCount": 1,
    "aspectRatio": "16:9",
    "imageSize": "4K",
    "outputMimeType": "image/jpeg",
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "4K"
    }
  }
}
```

---

## 8. 1K / 2K / 4K 尺寸规则

站内页面显示的 `1K / 2K / 4K` 会根据模型类型转换成不同参数。

### 8.1 普通 `image_generation` 模式尺寸表

这类模式会把尺寸直接传到 `size` 字段。

| 档位 | 1:1 | 3:2 | 2:3 | 4:3 | 3:4 | 16:9 | 9:16 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1K | `1024x1024` | `1536x1024` | `1024x1536` | `1536x1152` | `1152x1536` | `1792x1024` | `1024x1792` |
| 2K | `2048x2048` | `1920x1280` | `1280x1920` | `2048x1536` | `1536x2048` | `2048x1152` | `1152x2048` |
| 4K | `4096x4096` | `3840x2560` | `2560x3840` | `4096x3072` | `3072x4096` | `4096x2304` | `2304x4096` |

如果你想请求真正 4K，必须同时满足：

1. 当前模型走 `image_generation` 普通模式；
2. 上游模型 / 渠道真的支持对应的 `4096...` 尺寸；
3. 上游没有把尺寸自动裁剪或降级。

### 8.2 `gpt-image-*` / `chatgpt-image-latest`

这类模型不会按上面的 4K 表直接传 `4096x...`，而是：

| 宽高比 | 实际传入 `size` |
| --- | --- |
| 竖图：`2:3` / `3:4` / `9:16` | `1024x1536` |
| 横图：`3:2` / `4:3` / `16:9` | `1536x1024` |
| 正方形 | `1024x1024` |

`2K / 4K` 主要转换为质量参数：

| 页面档位 | 传入 `quality` |
| --- | --- |
| 1K | 不额外传 |
| 2K | `medium` |
| 4K | `high` |

所以这里的 `4K` 不是固定输出 `4096` 像素，只是更高质量档。

### 8.3 DALL-E

| 模型 | 尺寸规则 |
| --- | --- |
| `dall-e` / `dall-e-2` | 固定 `1024x1024` |
| `dall-e-3` | 正方形 `1024x1024`，横图 `1792x1024`，竖图 `1024x1792` |

`dall-e-3` 的 `2K / 4K` 会转为：

```json
{
  "quality": "hd"
}
```

也不代表真实 4096 输出。

### 8.4 Responses 模式

Responses 图片生成和 `gpt-image-*` 类似，尺寸只会传：

- `1024x1024`
- `1536x1024`
- `1024x1536`

`2K` 转 `quality=medium`，`4K` 转 `quality=high`。

### 8.5 Gemini 原生模式

Gemini 原生接口会传：

```json
{
  "generationConfig": {
    "imageSize": "4K",
    "imageConfig": {
      "imageSize": "4K"
    }
  }
}
```

最终实际像素由 Gemini 上游模型决定。

---

## 9. 参考图辅助接口

这两个接口是站内页面辅助用的，不是必须接口。

### 9.1 上传图片到图床

```http
POST /api/user/self/drawing/upload
Content-Type: application/json
```

请求：

```json
{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "filename": "drawing-1.png"
}
```

返回：

```json
{
  "success": true,
  "data": {
    "url": "https://xxx/drawing-1.png",
    "provider": "skyimg",
    "elapsed_ms": 1234
  }
}
```

### 9.2 解析图片为 Base64

```http
POST /api/user/self/drawing/resolve
Content-Type: application/json
```

请求：

```json
{
  "image": "https://xxx/drawing-1.png",
  "filename": "drawing-1.png"
}
```

返回：

```json
{
  "success": true,
  "data": {
    "base64": "iVBORw0KGgo...",
    "mimeType": "image/png",
    "mime_type": "image/png",
    "data_url": "data:image/png;base64,iVBORw0KGgo...",
    "size": 123456
  }
}
```

---

## 10. Python 调用示例

### 10.1 OpenAI 兼容图片生成

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

### 10.2 Responses 图片生成

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

## 11. 前端 fetch 示例

```js
async function generateImage() {
  const baseUrl = 'https://www.uocode.com';

  // 1. 获取站内生图配置；要求当前浏览器已登录
  const initRes = await fetch(`${baseUrl}/api/user/self/drawing/init`, {
    credentials: 'include',
  });
  const initJson = await initRes.json();
  if (!initJson.success || !initJson.data.enabled) {
    throw new Error(initJson.message || 'AI 生图未启用');
  }

  const config = initJson.data;
  const model = config.default_model || config.models[0];
  const mode = config.model_request_modes[model] || 'image_generation';

  // 2. 根据模式调用
  if (mode === 'responses_image_generation') {
    const res = await fetch(`${baseUrl}${config.responses_endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: config.authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: '生成一张 1:1 可爱机器人头像',
              },
            ],
          },
        ],
        tools: [
          {
            type: 'image_generation',
            size: '1024x1024',
            quality: 'high',
          },
        ],
        tool_choice: {
          type: 'image_generation',
        },
      }),
    });
    return await res.json();
  }

  const res = await fetch(`${baseUrl}${config.endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: config.authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: '生成一张 1:1 可爱机器人头像',
      n: 1,
      size: '1024x1024',
    }),
  });

  return await res.json();
}
```

---

## 12. 常见问题

### Q1：为什么选了 4K，出来还是 1500×1000 左右？

如果模型是 `gpt-image-*`、`chatgpt-image-latest` 或 Responses 模式，系统不会传 `4096x...`，而是传 `1536x1024` / `1024x1536` / `1024x1024`，并把 `4K` 转成 `quality=high`。这是当前模型接口规则，不是真 4K 像素。

### Q2：如何尽量请求真 4K？

使用走 `image_generation` 模式、且上游明确支持 `4096x...` 尺寸的模型。例如请求：

```json
{
  "size": "4096x2304",
  "quality": "4k"
}
```

但最终是否真 4K 仍取决于上游模型 / 渠道。

### Q3：参考图支持哪些模型？

站内页面只给这些模式启用参考图：

- `gemini_generate_content`
- `responses_image_generation`
- `openai_image_edit`

普通 `image_generation` 模式默认不带参考图。

### Q4：扣费走谁的余额？

初始化接口自动创建的是“生图专用令牌”，令牌只限制分组和模型；实际扣费仍走当前登录用户自己的余额。
