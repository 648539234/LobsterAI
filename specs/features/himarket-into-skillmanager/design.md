# 内部技能

## 概述
在技能管理页面新增"内部技能"Tab，放在"已安装"和"技能市场"之间（Tab顺序：已安装 → 内部技能 → 技能市场）。
页面样式参考技能市场，数据来源于 HiMarket 后端 API。

## 接口URL地址
- `http://10.1.50.87:8081/` HiMarket后端接口地址，需做成可配置
- `http://10.1.50.87:5173/` HiMarket前端页面地址，需做成可配置

所有接口文档中的地址都是后端接口地址，配置在 `endpoints.ts` 中。Skill 详情展示的 URL 使用前端页面地址。

## 配置方案
在 `endpoints.ts` 中新增两个配置函数：
- `getHiMarketApiBaseUrl()` — 后端 API 地址
- `getHiMarketWebBaseUrl()` — 前端页面地址（用于详情页 URL 展示）

## 数据流架构
```
SkillsManager 组件
  ├── 分类标签: skillService.fetchHiMarketCategories()
  │     └── IPC → GET {apiBase}/product-categories?page=1&productType=AGENT_SKILL&size=1000
  │
  ├── Skill 列表: skillService.fetchHiMarketSkills(categoryId?, page)
  │     └── IPC → GET {apiBase}/products?page=N&size=10&sortBy=DOWNLOAD_COUNT&type=AGENT_SKILL[&categoryIds=X]
  │
  ├── Skill 详情: skillService.fetchHiMarketSkillDetail(productId)
  │     └── IPC → GET {apiBase}/products/{productId}
  │
  └── Skill 安装: skillService.downloadSkill(downloadUrl)
        └── 复用现有 IPC → GET {apiBase}/skills/{productId}/download (ZIP 二进制流)
```

## 与技能市场的差异
| 特性 | 技能市场 | 内部技能 |
|---|---|---|
| 数据来源 | 单个 JSON 文件一次性加载 | 分页 API，滚动加载 |
| 分类标签 | 从 JSON 中 `marketTags` 获取 | 从 `/product-categories` API 获取 |
| 卡片展示 | 来源 + 版本号 | 标签（最多3个）+ 下载量 |
| 详情弹窗 | 有来源信息 | 无来源，有标签、下载量、URL |
| 安装方式 | `downloadSkill(url)` | 同样复用 `downloadSkill` |
| 版本比较/升级 | 支持 | 预留，暂不实现 |
| 认证 | 无需认证 | 公开 API，无需认证 |

## 版本比较和升级
预留版本比较和升级功能的数据结构和 UI 位置，后续可能加上此功能。

## 标签导航列表查询
> 案例: 全部 生活 文档 效率工具

展示参考技能市场的标签导航展示,除了全部是固定展示外,其他内容都取自下面接口文档中的name值进行展示
这里可以一次性将所有的分类全部查出来(size=1000)最多展示两行, 超过的隐藏不展示
### 接口文档
- 接口url: /product-categories?page=1&productType=AGENT_SKILL&size=1000
- 请求方式: GET
- 参数说明: page和size是分页参数,productType=AGENT_SKILL固定用在SKILL分类上
- 响应参数说明: 
  - code: 响应码,"SUCCESS"表示响应成功
  - message: 响应信息
  - data: 响应数据,响应数据中categoryId是分类id,name是分类名称,例如文档,编码等
```json
{
  "code": "SUCCESS",
  "message": null,
  "data": {
    "content": [
      {
        "categoryId": "category-b33583239111498b9938d73f4e2b9082",
        "name": "AI Skill市场",
        "description": "AI Skill市场",
        "icon": {
          "type": "BASE64",
          "value": "data:image/png;base64,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"
        },
        "createAt": "2026-06-09T14:26:10.253",
        "updatedAt": "2026-06-09T14:26:10.253"
      }
    ],
    "number": 1,
    "size": 1000,
    "totalElements": 1
  }
}
```
## Skill内容展示
- 展示参考考技能市场的技能展示样式（卡片展示）, 数据取自下面接口文档的参数
- 接口一次查询10条数据(size=10),当滚轮往下拉时再查询10条数据(如果原来有加载的动画就按原来的来,没有新加一个)
- 标签来源不展示,版本号列表页暂不展示,新增标签位放在来源的位置上,标签最多展示3个,新增展示下载量放在底部的右下角
### 接口文档
- 接口url: /products?page=1&size=10&sortBy=DOWNLOAD_COUNT&type=AGENT_SKILL&categoryIds=category-b33583239111498b9938d73f4e2b9082
- 请求方式: GET
- 参数说明: 
  - page和size是分页参数
  - sortBy=DOWNLOAD_COUNT固定用法表示按下载量排序
  - type=AGENT_SKILL固定用法
  - categoryIds=category-b33583239111498b9938d73f4e2b9082 可选,当查询全部分类时不送,查询指定分类时送,值参考 标签导航列表查询 接口中响应的分类id
- 响应参数说明:
  - code: 响应码,"SUCCESS"表示响应成功
  - message: 响应信息
  - data: 响应数据
    - productId是skillId
    - name是Skill名称
    - description是Skill描述超过两行省略
    - skillConfig.skillTags是skill的标签
    - skillConfig.downloadCount是下载量
```json
{
  "code": "SUCCESS",
  "message": null,
  "data": {
    "content": [
      {
        "productId": "product-a2dd2dd4ea6a47238c0bbb1b8dde12b1",
        "name": "brand-guidelines",
        "description": "Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.",
        "status": "PUBLISHED",
        "enableConsumerAuth": false,
        "type": "AGENT_SKILL",
        "document": null,
        "icon": null,
        "categories": [],
        "autoApprove": null,
        "createAt": "2026-06-09T14:17:42.988",
        "updatedAt": "2026-06-09T14:28:59.796",
        "apiConfig": null,
        "mcpConfig": null,
        "agentConfig": null,
        "modelConfig": null,
        "skillConfig": {
          "skillTags": null,
          "downloadCount": 0,
          "nacosId": "nacos-724d32791e714c9bbf41b80babcf10ff",
          "namespace": "public",
          "skillName": "brand-guidelines"
        },
        "workerConfig": null,
        "enabled": null,
        "subscribable": null,
        "feature": {
          "modelFeature": null,
          "skillConfig": {
            "skillTags": null,
            "downloadCount": 0,
            "nacosId": "nacos-724d32791e714c9bbf41b80babcf10ff",
            "namespace": "public",
            "skillName": "brand-guidelines"
          },
          "workerConfig": null
        }
      },
      {
        "productId": "product-0b73cc363e6f4d5ba25ce39c13f67cf6",
        "name": "测试Skill",
        "description": "测试Skill",
        "status": "PUBLISHED",
        "enableConsumerAuth": false,
        "type": "AGENT_SKILL",
        "document": null,
        "icon": {
          "type": "BASE64",
          "value": "data:image/png;base64,...."
        },
        "categories": [
          {
            "categoryId": "category-b33583239111498b9938d73f4e2b9082",
            "name": "AI Skill市场",
            "description": "AI Skill市场",
            "icon": {
              "type": "BASE64",
              "value": "data:image/png;base64,...."
            },
            "createAt": "2026-06-09T14:26:10.253",
            "updatedAt": "2026-06-09T14:26:10.253"
          }
        ],
        "autoApprove": null,
        "createAt": "2026-06-09T14:27:05.487",
        "updatedAt": "2026-06-09T14:43:48.552",
        "apiConfig": null,
        "mcpConfig": null,
        "agentConfig": null,
        "modelConfig": null,
        "skillConfig": {
          "skillTags": [
            "测试"
          ],
          "downloadCount": 0,
          "nacosId": "nacos-724d32791e714c9bbf41b80babcf10ff",
          "namespace": "public",
          "skillName": "frontend-design"
        },
        "workerConfig": null,
        "enabled": null,
        "subscribable": null,
        "feature": {
          "modelFeature": null,
          "skillConfig": {
            "skillTags": [
              "测试"
            ],
            "downloadCount": 0,
            "nacosId": "nacos-724d32791e714c9bbf41b80babcf10ff",
            "namespace": "public",
            "skillName": "frontend-design"
          },
          "workerConfig": null
        }
      }
    ],
    "number": 1,
    "size": 12,
    "totalElements": 2
  }
}
```
## Skill详情展示
- 点击Skill卡片时弹窗展示Skill的详情,展示参考技能市场的技能详情展示样式
- 详情中来源不展示
- 详情中新增标签，完整展示
- 详情中新增下载量
- 详情中新增URL,URL展示为http://10.1.50.87:5173/skills/{product-id}, http://10.1.50.87:5173/ 需做成配置参数
### 接口文档
- 接口url: /products/{product-id}
- 请求方式: GET
- 参数说明: 采用restful风格,product-id就是对于的skillId,参考`Skill内容展示`接口响应的productId值
- 响应参数说明:
  - code: 响应码,"SUCCESS"表示响应成功
  - message: 响应信息
  - data: 响应数据
    - productId是skillId
    - name是Skill名称
    - description是Skill描述完整展示
    - skillConfig.skillTags是skill的标签
    - skillConfig.downloadCount是下载量
```json
{
  "code": "SUCCESS",
  "message": null,
  "data": {
    "productId": "product-a2dd2dd4ea6a47238c0bbb1b8dde12b1",
    "name": "brand-guidelines",
    "description": "Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.",
    "status": "PUBLISHED",
    "enableConsumerAuth": false,
    "type": "AGENT_SKILL",
    "document": null,
    "icon": null,
    "categories": [],
    "autoApprove": null,
    "createAt": "2026-06-09T14:17:42.988",
    "updatedAt": "2026-06-09T14:28:59.796",
    "apiConfig": null,
    "mcpConfig": null,
    "agentConfig": null,
    "modelConfig": null,
    "skillConfig": {
      "skillTags": null,
      "downloadCount": 0,
      "nacosId": "nacos-724d32791e714c9bbf41b80babcf10ff",
      "namespace": "public",
      "skillName": "brand-guidelines"
    },
    "workerConfig": null,
    "enabled": null,
    "subscribable": null,
    "feature": {
      "modelFeature": null,
      "skillConfig": {
        "skillTags": null,
        "downloadCount": 0,
        "nacosId": "nacos-724d32791e714c9bbf41b80babcf10ff",
        "namespace": "public",
        "skillName": "brand-guidelines"
      },
      "workerConfig": null
    }
  }
}
```
## Skill安装
- 点击Skill卡片时安装时会自动安装到LobsterAI中,逻辑和技能市场到已安装的逻辑一致
### 接口文档
- 接口url: /skills/{product-id}/download
- 请求方式: GET
- 参数说明: 采用restful风格,product-id就是对于的skillId,参考`Skill内容展示`接口响应的productId值
- 响应参数说明: 响应的是一个二进制下载流,下载的是技能的zip安装包,安装的方式尽可能和原逻辑保持一致
