#!/bin/bash

# UI替换脚本 - 保留你的自定义页面，其他用官方UI

OFFICIAL_DIR="E:/Python项目/26年/3月/new-api-main333/1/new-api-main"
CURRENT_DIR="."

echo "开始UI替换..."

# 1. 备份你的自定义页面（已完成）
echo "✓ 已备份自定义UI到 /tmp/backup-ui/"

# 2. 需要保留的页面（不替换）
KEEP_PAGES=(
    "Home"           # 首页
    "Model"          # 模型广场
    "GroupMonitor"   # 分组监控
    "AutoDelivery"   # 自动发货
)

# 3. 需要保留的组件
KEEP_COMPONENTS=(
    "auth"           # 登录组件
)

# 4. 复制官方web目录（排除需要保留的）
echo "正在复制官方UI..."

# 复制pages目录（排除保留的页面）
for page in "$OFFICIAL_DIR/web/src/pages"/*; do
    page_name=$(basename "$page")
    should_keep=false

    for keep in "${KEEP_PAGES[@]}"; do
        if [ "$page_name" = "$keep" ]; then
            should_keep=true
            echo "  保留: pages/$page_name (你的自定义)"
            break
        fi
    done

    if [ "$should_keep" = false ]; then
        echo "  替换: pages/$page_name (官方版本)"
        rm -rf "web/src/pages/$page_name"
        cp -r "$page" "web/src/pages/"
    fi
done

# 复制components目录（排除保留的组件）
for comp in "$OFFICIAL_DIR/web/src/components"/*; do
    comp_name=$(basename "$comp")
    should_keep=false

    for keep in "${KEEP_COMPONENTS[@]}"; do
        if [ "$comp_name" = "$keep" ]; then
            should_keep=true
            echo "  保留: components/$comp_name (你的自定义)"
            break
        fi
    done

    if [ "$should_keep" = false ]; then
        echo "  替换: components/$comp_name (官方版本)"
        rm -rf "web/src/components/$comp_name"
        cp -r "$comp" "web/src/components/"
    fi
done

# 5. 复制其他web文件
echo "复制其他web文件..."
cp -r "$OFFICIAL_DIR/web/src/hooks" "web/src/" 2>/dev/null || true
cp -r "$OFFICIAL_DIR/web/src/helpers" "web/src/" 2>/dev/null || true
cp -r "$OFFICIAL_DIR/web/src/constants" "web/src/" 2>/dev/null || true
cp -r "$OFFICIAL_DIR/web/src/utils" "web/src/" 2>/dev/null || true
cp -r "$OFFICIAL_DIR/web/src/api" "web/src/" 2>/dev/null || true
cp -r "$OFFICIAL_DIR/web/src/contexts" "web/src/" 2>/dev/null || true

# 6. 复制配置文件（但不覆盖package.json，需要手动合并）
echo "复制配置文件..."
cp "$OFFICIAL_DIR/web/vite.config.js" "web/" 2>/dev/null || true
cp "$OFFICIAL_DIR/web/index.html" "web/" 2>/dev/null || true
cp "$OFFICIAL_DIR/web/.eslintrc.cjs" "web/" 2>/dev/null || true

echo ""
echo "✓ UI替换完成！"
echo ""
echo "保留的自定义页面："
for page in "${KEEP_PAGES[@]}"; do
    echo "  - pages/$page"
done
echo ""
echo "保留的自定义组件："
for comp in "${KEEP_COMPONENTS[@]}"; do
    echo "  - components/$comp"
done
echo ""
echo "注意："
echo "1. package.json 需要手动检查和合并依赖"
echo "2. 路由配置可能需要调整（App.jsx 或 router.jsx）"
echo "3. 建议测试所有页面功能"
