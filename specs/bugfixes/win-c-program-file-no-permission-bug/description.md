# bug描述
## 环境
操作系统：win11
## bug现象
同事LobsterAI使用默认的安装路径（安装到C:\Program Files\目录下）然后启动LobsterAI
启动后一直开卡在AI 引擎正在启动网关... 并且最终加载失败
## bug排查
openclaw启动日志路径： %APPDATA%\LobsterAI\openclaw\logs\
```text
EPERM: operation not permitted, open
'C:\Program Files\LobsterAI\resources\cfmind\node_modules\.cache\jiti\...'
```
## bug原因
网关进程（基于 jiti JIT 编译器）尝试在 C:\Program Files\LobsterAI\resources\cfmind\node_modules\.cache\jiti\ 下写缓存文件，但 C:\Program Files 是非管理员进程不可写的受保护目录。
## 解决方案
### 方案一: 
修改安装路径,win环境不推荐安装在默认C盘路径下,安装到自定义的文件路径下则有对应的读写权限
### 方案二: 
在 src/main/libs/openclawEngineManager.ts 中设置 JITI_FS_CACHE=false 禁用 jiti 的文件缓存。jiti 的内存缓存不受影响，每次启动首次加载会有微小的编译开销（可忽略），但后续同进程内的加载仍走内存缓存。
## 最终选择
选择使用解决方案二, 在 src/main/libs/openclawEngineManager.ts 中设置 JITI_FS_CACHE=false
## 影响
会影响程序的启动速度,但是能做到防呆
