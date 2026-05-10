@echo off
chcp 65001 >nul
echo ========================================
echo 开始构建 New API (前端 + 后端)
echo ========================================
echo.

REM 设置项目根目录
set PROJECT_ROOT=%~dp0
cd /d "%PROJECT_ROOT%"

REM 步骤 1: 构建前端
echo [1/3] 构建前端...
cd web
if not exist "node_modules" (
    echo 检测到 node_modules 不存在，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo 前端依赖安装失败！
        pause
        exit /b 1
    )
)

echo 正在构建前端资源...
call npm run build
if errorlevel 1 (
    echo 前端构建失败！
    pause
    exit /b 1
)

if not exist "dist" (
    echo 前端构建失败：dist 目录不存在！
    pause
    exit /b 1
)

echo 前端构建完成！
echo.

REM 步骤 2: 返回项目根目录
cd ..

REM 步骤 3: 编译 Go 后端
echo [2/3] 编译 Go 后端...
echo 正在编译 Windows x64 可执行文件...

REM 设置 Go 环境变量
set CGO_ENABLED=0
set GOOS=windows
set GOARCH=amd64

REM 编译
go build -ldflags "-s -w" -o new-api.exe main.go
if errorlevel 1 (
    echo Go 后端编译失败！
    pause
    exit /b 1
)

if not exist "new-api.exe" (
    echo 编译失败：new-api.exe 不存在！
    pause
    exit /b 1
)

echo 后端编译完成！
echo.

REM 步骤 4: 显示结果
echo [3/3] 构建完成！
echo ========================================
echo 构建成功！
echo.
echo 生成的文件：
echo   - 前端资源: web\dist\
echo   - 可执行文件: new-api.exe
echo.
for %%F in (new-api.exe) do echo 文件大小: %%~zF 字节
echo ========================================
echo.
echo 运行方式：
echo   1. 确保 .env 配置文件存在
echo   2. 运行: new-api.exe
echo.
pause
