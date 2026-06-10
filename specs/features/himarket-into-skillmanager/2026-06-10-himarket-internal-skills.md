# 内部技能 (HiMarket) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "内部技能" (Internal Skills) tab to the Skills Manager between "已安装" and "技能市场", sourcing data from HiMarket APIs with category filtering, scroll-based pagination, detail modal, and install flow.

**Architecture:** Follow the existing marketplace pattern — types in `skill.ts`, URL config in `endpoints.ts`, IPC handlers in `skills/handlers.ts`, preload exposure, service methods in `skill.ts`, i18n keys, and UI in `SkillsManager.tsx`. The download flow reuses the existing `downloadSkill` method by passing the HiMarket download URL directly. Version comparison/upgrade is reserved for future use.

**Tech Stack:** React + TypeScript + Electron IPC + existing skillService/downloadSkill infrastructure

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/renderer/types/skill.ts` | Modify | Add `HiMarketCategory`, `HiMarketSkill`, `HiMarketSkillDetail` types |
| `src/main/libs/endpoints.ts` | Modify | Add `getHiMarketApiBaseUrl()`, `getHiMarketWebBaseUrl()` |
| `src/main/ipcHandlers/skills/handlers.ts` | Modify | Extend deps, add 5 IPC handlers |
| `src/main/preload.ts` | Modify | Expose 5 new APIs |
| `src/main/main.ts` | Modify | Pass new deps to `registerSkillHandlers` |
| `src/renderer/services/skill.ts` | Modify | Add service methods for categories, skills, detail, URL getters |
| `src/renderer/services/i18n.ts` | Modify | Add internal skills i18n keys (zh + en) |
| `src/renderer/components/skills/SkillsManager.tsx` | Modify | Add tab, categories, card grid, scroll pagination, detail modal |

---

### Task 1: Add HiMarket types

**Files:**
- Modify: `src/renderer/types/skill.ts`

- [ ] **Step 1: Add HiMarket type definitions**

Add after the `MarketplaceSkill` interface:

```typescript
export interface HiMarketCategory {
  categoryId: string;
  name: string;
  description: string;
}

export interface HiMarketSkill {
  productId: string;
  name: string;
  description: string;
  skillConfig: {
    skillTags: string[] | null;
    downloadCount: number;
  };
}

export interface HiMarketSkillDetail {
  productId: string;
  name: string;
  description: string;
  status: string;
  type: string;
  categories: HiMarketCategory[];
  createAt: string;
  updatedAt: string;
  skillConfig: {
    skillTags: string[] | null;
    downloadCount: number;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/types/skill.ts
git commit -m "feat: add HiMarket type definitions for internal skills"
```

---

### Task 2: Add HiMarket URL configuration

**Files:**
- Modify: `src/main/libs/endpoints.ts`

- [ ] **Step 1: Add HiMarket URL functions**

Add after `getKitStoreUrl()` at the end of the file:

```typescript
export const getHiMarketApiBaseUrl = (): string => (
  isTestModeEnabled()
    ? 'http://10.1.50.87:8081'
    : 'http://10.1.50.87:8081'
);

export const getHiMarketWebBaseUrl = (): string => (
  isTestModeEnabled()
    ? 'http://10.1.50.87:5173'
    : 'http://10.1.50.87:5173'
);
```

- [ ] **Step 2: Commit**

```bash
git add src/main/libs/endpoints.ts
git commit -m "feat: add HiMarket API and web base URL configuration"
```

---

### Task 3: Add all IPC handlers (data + URL getters)

**Files:**
- Modify: `src/main/ipcHandlers/skills/handlers.ts`

- [ ] **Step 1: Extend SkillHandlerDeps**

Update the interface to include both HiMarket URL functions:

```typescript
export interface SkillHandlerDeps {
  getSkillManager: () => SkillManager;
  getSkillStoreUrl: () => string;
  getHiMarketApiBaseUrl: () => string;
  getHiMarketWebBaseUrl: () => string;
  getOpenClawRuntimeAdapter: () => {
    connectGatewayIfNeeded: () => Promise<void>;
    getGatewayClient: () => {
      request: <T = Record<string, unknown>>(
        method: string,
        params?: unknown,
        opts?: { timeoutMs?: number },
      ) => Promise<T>;
    } | null;
  } | null;
}
```

- [ ] **Step 2: Update destructuring in registerSkillHandlers**

```typescript
const { getSkillManager, getSkillStoreUrl, getHiMarketApiBaseUrl, getHiMarketWebBaseUrl, getOpenClawRuntimeAdapter } = deps;
```

- [ ] **Step 3: Add 5 new IPC handlers**

Add after the `skills:fetchMarketplace` handler (after line 169):

```typescript
ipcMain.handle('skills:fetchHiMarketCategories', async () => {
  const baseUrl = getHiMarketApiBaseUrl();
  const url = `${baseUrl}/product-categories?page=1&productType=AGENT_SKILL&size=1000`;
  console.log(`[HiMarket] fetching categories from: ${url}`);
  try {
    const http = await import('http');
    const data = await new Promise<string>((resolve, reject) => {
      const req = http.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => resolve(body));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch categories' };
  }
});

ipcMain.handle('skills:fetchHiMarketSkills', async (_event, params: { categoryId?: string; page: number }) => {
  const baseUrl = getHiMarketApiBaseUrl();
  const { categoryId, page } = params;
  let url = `${baseUrl}/products?page=${page}&size=10&sortBy=DOWNLOAD_COUNT&type=AGENT_SKILL`;
  if (categoryId) {
    url += `&categoryIds=${categoryId}`;
  }
  console.log(`[HiMarket] fetching skills from: ${url}`);
  try {
    const http = await import('http');
    const data = await new Promise<string>((resolve, reject) => {
      const req = http.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => resolve(body));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch skills' };
  }
});

ipcMain.handle('skills:fetchHiMarketSkillDetail', async (_event, productId: string) => {
  const baseUrl = getHiMarketApiBaseUrl();
  const url = `${baseUrl}/products/${productId}`;
  console.log(`[HiMarket] fetching skill detail from: ${url}`);
  try {
    const http = await import('http');
    const data = await new Promise<string>((resolve, reject) => {
      const req = http.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => resolve(body));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch skill detail' };
  }
});

ipcMain.handle('skills:getHiMarketApiBaseUrl', () => {
  return getHiMarketApiBaseUrl();
});

ipcMain.handle('skills:getHiMarketWebBaseUrl', () => {
  return getHiMarketWebBaseUrl();
});
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipcHandlers/skills/handlers.ts
git commit -m "feat: add HiMarket IPC handlers for data APIs and URL getters"
```

---

### Task 4: Expose HiMarket APIs via preload

**Files:**
- Modify: `src/main/preload.ts`

- [ ] **Step 1: Add preload methods**

Add after `fetchMarketplace` (line 65):

```typescript
fetchHiMarketCategories: () => ipcRenderer.invoke('skills:fetchHiMarketCategories'),
fetchHiMarketSkills: (params: { categoryId?: string; page: number }) =>
  ipcRenderer.invoke('skills:fetchHiMarketSkills', params),
fetchHiMarketSkillDetail: (productId: string) =>
  ipcRenderer.invoke('skills:fetchHiMarketSkillDetail', productId),
getHiMarketApiBaseUrl: () => ipcRenderer.invoke('skills:getHiMarketApiBaseUrl'),
getHiMarketWebBaseUrl: () => ipcRenderer.invoke('skills:getHiMarketWebBaseUrl'),
```

- [ ] **Step 2: Commit**

```bash
git add src/main/preload.ts
git commit -m "feat: expose HiMarket APIs via preload"
```

---

### Task 5: Pass new deps in main.ts

**Files:**
- Modify: `src/main/main.ts`

- [ ] **Step 1: Import and pass new deps**

The import of `getSkillStoreUrl` from `./libs/endpoints` is around line 174. Add `getHiMarketApiBaseUrl` and `getHiMarketWebBaseUrl` to that import:

```typescript
import {
  getHiMarketApiBaseUrl,
  getHiMarketWebBaseUrl,
  getSkillStoreUrl,
  // ... keep existing imports
} from './libs/endpoints';
```

Update the `registerSkillHandlers` call (around line 4659):

```typescript
registerSkillHandlers({
  getSkillManager,
  getSkillStoreUrl,
  getHiMarketApiBaseUrl,
  getHiMarketWebBaseUrl,
  getOpenClawRuntimeAdapter: () => openClawRuntimeAdapter,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/main/main.ts
git commit -m "feat: pass HiMarket URL deps to skill handlers"
```

---

### Task 6: Add HiMarket service methods

**Files:**
- Modify: `src/renderer/services/skill.ts`

- [ ] **Step 1: Update imports**

Change line 1 from:
```typescript
import { LocalizedText, LocalSkillInfo, MarketplaceSkill, MarketTag, Skill } from '../types/skill';
```
to:
```typescript
import { HiMarketCategory, HiMarketSkill, HiMarketSkillDetail, LocalizedText, LocalSkillInfo, MarketplaceSkill, MarketTag, Skill } from '../types/skill';
```

- [ ] **Step 2: Add service methods**

Add after the `loadMarketplaceSkills` method (after line 280):

```typescript
async fetchHiMarketCategories(): Promise<HiMarketCategory[]> {
  try {
    const result = await window.electron.skills.fetchHiMarketCategories();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch categories');
    }
    const json = JSON.parse(result.data);
    if (json.code !== 'SUCCESS') {
      throw new Error(json.message || 'API error');
    }
    return json.data?.content ?? [];
  } catch (error) {
    console.error('Failed to fetch HiMarket categories:', error);
    return [];
  }
}

async fetchHiMarketSkills(categoryId?: string, page: number = 1): Promise<{
  skills: HiMarketSkill[];
  hasMore: boolean;
}> {
  try {
    const result = await window.electron.skills.fetchHiMarketSkills({ categoryId, page });
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch skills');
    }
    const json = JSON.parse(result.data);
    if (json.code !== 'SUCCESS') {
      throw new Error(json.message || 'API error');
    }
    const content: HiMarketSkill[] = json.data?.content ?? [];
    const totalElements: number = json.data?.totalElements ?? 0;
    const size: number = json.data?.size ?? 10;
    const currentPage: number = json.data?.number ?? page;
    return {
      skills: content,
      hasMore: currentPage * size < totalElements,
    };
  } catch (error) {
    console.error('Failed to fetch HiMarket skills:', error);
    return { skills: [], hasMore: false };
  }
}

async fetchHiMarketSkillDetail(productId: string): Promise<HiMarketSkillDetail | null> {
  try {
    const result = await window.electron.skills.fetchHiMarketSkillDetail(productId);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch skill detail');
    }
    const json = JSON.parse(result.data);
    if (json.code !== 'SUCCESS') {
      throw new Error(json.message || 'API error');
    }
    return json.data ?? null;
  } catch (error) {
    console.error('Failed to fetch HiMarket skill detail:', error);
    return null;
  }
}

async getHiMarketApiBaseUrl(): Promise<string> {
  try {
    return await window.electron.skills.getHiMarketApiBaseUrl();
  } catch {
    return 'http://10.1.50.87:8081';
  }
}

async getHiMarketWebBaseUrl(): Promise<string> {
  try {
    return await window.electron.skills.getHiMarketWebBaseUrl();
  } catch {
    return 'http://10.1.50.87:5173';
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/services/skill.ts
git commit -m "feat: add HiMarket service methods"
```

---

### Task 7: Add i18n translation keys

**Files:**
- Modify: `src/renderer/services/i18n.ts`

- [ ] **Step 1: Add Chinese translations**

After `skillInstalled: '已安装',` (around line 1291), add:
```typescript
skillInternal: '内部技能',
skillInternalEmpty: '暂无内部技能',
skillDetailTags: '标签',
skillDetailDownloadCount: '下载量',
skillDetailUrl: 'URL',
skillDownloadCount: '次下载',
```

- [ ] **Step 2: Add English translations**

After `skillInstalled: 'Installed',` (around line 3769), add:
```typescript
skillInternal: 'Internal Skills',
skillInternalEmpty: 'No internal skills available',
skillDetailTags: 'Tags',
skillDetailDownloadCount: 'Downloads',
skillDetailUrl: 'URL',
skillDownloadCount: 'downloads',
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/services/i18n.ts
git commit -m "feat: add internal skills i18n keys"
```

---

### Task 8: Add internal skills tab UI to SkillsManager

**Files:**
- Modify: `src/renderer/components/skills/SkillsManager.tsx`

- [ ] **Step 1: Update imports**

Update the type import (line 17):
```typescript
import { HiMarketCategory, HiMarketSkill, HiMarketSkillDetail, MarketplaceSkill, MarketTag, Skill } from '../../types/skill';
```

- [ ] **Step 2: Update SkillTab type**

Change line 30 from:
```typescript
type SkillTab = 'installed' | 'marketplace';
```
to:
```typescript
type SkillTab = 'installed' | 'internal' | 'marketplace';
```

- [ ] **Step 3: Add HiMarket state variables**

Add after `const [isSyncingFromOpenClaw, setIsSyncingFromOpenClaw] = useState(false);` (line 99):

```typescript
const [hiMarketCategories, setHiMarketCategories] = useState<HiMarketCategory[]>([]);
const [hiMarketSkills, setHiMarketSkills] = useState<HiMarketSkill[]>([]);
const [activeHiMarketCategory, setActiveHiMarketCategory] = useState('all');
const [isLoadingHiMarketSkills, setIsLoadingHiMarketSkills] = useState(false);
const [hiMarketPage, setHiMarketPage] = useState(1);
const [hasMoreHiMarketSkills, setHasMoreHiMarketSkills] = useState(true);
const [selectedHiMarketSkill, setSelectedHiMarketSkill] = useState<HiMarketSkill | null>(null);
const [hiMarketSkillDetail, setHiMarketSkillDetail] = useState<HiMarketSkillDetail | null>(null);
const [isLoadingHiMarketDetail, setIsLoadingHiMarketDetail] = useState(false);
const [hiMarketWebBaseUrl, setHiMarketWebBaseUrl] = useState('http://10.1.50.87:5173');
const sentinelRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 4: Add useEffect for initial data fetch**

Add after the marketplace fetch useEffect (after line 143):

```typescript
useEffect(() => {
  let isActive = true;
  skillService.fetchHiMarketCategories().then((categories) => {
    if (!isActive) return;
    setHiMarketCategories(categories);
  });
  skillService.getHiMarketWebBaseUrl().then((url) => {
    if (!isActive) return;
    setHiMarketWebBaseUrl(url);
  });
  return () => { isActive = false; };
}, []);
```

- [ ] **Step 5: Add useEffect for fetching skills on tab/category/page change**

```typescript
useEffect(() => {
  if (activeTab !== 'internal') return;
  let isActive = true;
  setIsLoadingHiMarketSkills(true);
  const categoryId = activeHiMarketCategory === 'all' ? undefined : activeHiMarketCategory;
  skillService.fetchHiMarketSkills(categoryId, hiMarketPage).then((result) => {
    if (!isActive) return;
    if (hiMarketPage === 1) {
      setHiMarketSkills(result.skills);
    } else {
      setHiMarketSkills(prev => [...prev, ...result.skills]);
    }
    setHasMoreHiMarketSkills(result.hasMore);
    setIsLoadingHiMarketSkills(false);
  }).catch(() => {
    if (!isActive) return;
    setIsLoadingHiMarketSkills(false);
  });
  return () => { isActive = false; };
}, [activeTab, activeHiMarketCategory, hiMarketPage]);
```

- [ ] **Step 6: Add IntersectionObserver for scroll pagination**

```typescript
useEffect(() => {
  if (!hasMoreHiMarketSkills || isLoadingHiMarketSkills) return;
  const sentinel = sentinelRef.current;
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMoreHiMarketSkills && !isLoadingHiMarketSkills) {
        setHiMarketPage(prev => prev + 1);
      }
    },
    { threshold: 0.1 },
  );

  observer.observe(sentinel);
  return () => observer.disconnect();
}, [hasMoreHiMarketSkills, isLoadingHiMarketSkills]);
```

- [ ] **Step 7: Add handler functions**

Add before the `return` statement:

```typescript
const handleHiMarketCategoryChange = (categoryId: string) => {
  setActiveHiMarketCategory(categoryId);
  setHiMarketPage(1);
  setHiMarketSkills([]);
  setHasMoreHiMarketSkills(true);
};

const handleHiMarketSkillClick = async (skill: HiMarketSkill) => {
  setSelectedHiMarketSkill(skill);
  setHiMarketSkillDetail(null);
  setIsLoadingHiMarketDetail(true);
  const detail = await skillService.fetchHiMarketSkillDetail(skill.productId);
  setHiMarketSkillDetail(detail);
  setIsLoadingHiMarketDetail(false);
};

const handleInstallHiMarketSkill = async (skill: HiMarketSkill) => {
  if (installingSkillId) return;
  setInstallingSkillId(skill.productId);
  setSkillActionError('');
  try {
    const apiBase = await skillService.getHiMarketApiBaseUrl();
    const downloadUrl = `${apiBase}/skills/${skill.productId}/download`;
    const result = await skillService.downloadSkill(downloadUrl);
    if (!result.success) {
      setSkillActionError(result.error || i18nService.t('skillInstallFailed'));
      return;
    }
    if (result.auditReport && result.pendingInstallId) {
      setSecurityReport(result.auditReport);
      setPendingInstallId(result.pendingInstallId);
      setPendingImportSource(null);
      return;
    }
    if (result.skills) {
      dispatch(setSkills(result.skills));
    }
  } catch {
    setSkillActionError(i18nService.t('skillInstallFailed'));
  } finally {
    setInstallingSkillId(null);
  }
};

const formatDownloadCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
};
```

- [ ] **Step 8: Add "内部技能" tab button**

Insert between the "已安装" and "技能市场" tab buttons. Find the marketplace tab button (starts with `{i18nService.t('skillMarketplace')}`), and insert before it:

```tsx
<button
  type="button"
  onClick={() => setActiveTab('internal')}
  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
    activeTab === 'internal'
      ? 'text-foreground'
      : 'text-secondary hover:hover:text-foreground'
  }`}
>
  {i18nService.t('skillInternal')}
  <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-colors ${
    activeTab === 'internal' ? 'bg-primary' : 'bg-transparent'
  }`} />
</button>
```

- [ ] **Step 9: Add category filter pills for internal tab**

Insert after the marketplace tag filter section (the `{activeTab === 'marketplace' && ...}` block). Find the closing `}` of that block and add after it:

```tsx
{activeTab === 'internal' && hiMarketCategories.length > 0 && (
  <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-hidden">
    <button
      type="button"
      onClick={() => handleHiMarketCategoryChange('all')}
      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
        activeHiMarketCategory === 'all'
          ? 'bg-primary text-white'
          : 'bg-surface text-secondary hover:bg-surface-raised border border-border'
      }`}
    >
      {i18nService.t('skillCategoryAll')}
    </button>
    {hiMarketCategories.map((cat) => (
      <button
        key={cat.categoryId}
        type="button"
        onClick={() => handleHiMarketCategoryChange(cat.categoryId)}
        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
          activeHiMarketCategory === cat.categoryId
            ? 'bg-primary text-white'
            : 'bg-surface text-secondary hover:bg-surface-raised border border-border'
        }`}
      >
        {cat.name}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 10: Add internal skills grid**

Find the marketplace grid rendering block — after the `{activeTab === 'marketplace' && (` block and its closing. Insert the internal skills grid after the marketplace content area:

```tsx
{activeTab === 'internal' && (
  <>
    {hiMarketSkills.length === 0 && !isLoadingHiMarketSkills ? (
      <div className="text-center py-12 text-sm text-secondary">
        {i18nService.t('skillInternalEmpty')}
      </div>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-3">
          {hiMarketSkills.map((skill) => {
            const isInstalled = skills.some(s => s.id === skill.productId);
            return (
              <div
                key={skill.productId}
                className="rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary hover:bg-surface-raised cursor-pointer"
                onClick={() => handleHiMarketSkillClick(skill)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                      <SkillIcon className="h-4 w-4 text-secondary" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {skill.name}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg text-green-600 dark:text-green-400 bg-green-500/10">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        {i18nService.t('skillAlreadyInstalled')}
                      </span>
                    ) : !readOnly ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleInstallHiMarketSkill(skill); }}
                        disabled={installingSkillId !== null}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        {installingSkillId === skill.productId ? i18nService.t('skillInstalling') : i18nService.t('skillInstall')}
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="text-xs text-secondary line-clamp-2 mb-2">
                  {skill.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-secondary">
                  <div className="flex items-center gap-1.5">
                    {(skill.skillConfig?.skillTags ?? []).slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-raised font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-secondary">
                    {formatDownloadCount(skill.skillConfig?.downloadCount ?? 0)} {i18nService.t('skillDownloadCount')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={sentinelRef} className="h-4" />

        {isLoadingHiMarketSkills && (
          <div className="text-center py-4 text-sm text-secondary">
            {i18nService.t('downloadingSkill')}
          </div>
        )}
      </>
    )}
  </>
)}
```

- [ ] **Step 11: Add HiMarket skill detail modal**

Add after the marketplace skill detail portal (after `selectedMarketplaceSkill && createPortal(...` block and its `, document.body)}`):

```tsx
{selectedHiMarketSkill && createPortal(
  <Modal onClose={() => { setSelectedHiMarketSkill(null); setHiMarketSkillDetail(null); }} overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/60" className="w-full max-w-md mx-4 rounded-2xl bg-surface border border-border shadow-2xl p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
          <SkillIcon className="h-5 w-5 text-secondary" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground truncate">
            {selectedHiMarketSkill.name}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => { setSelectedHiMarketSkill(null); setHiMarketSkillDetail(null); }}
        className="p-1.5 rounded-lg text-secondary hover:text-foreground hover:bg-surface-raised transition-colors flex-shrink-0"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>

    {isLoadingHiMarketDetail ? (
      <div className="text-center py-4 text-sm text-secondary">
        {i18nService.t('downloadingSkill')}
      </div>
    ) : (
      <>
        <p className="text-sm text-secondary mb-4">
          {hiMarketSkillDetail?.description ?? selectedHiMarketSkill.description}
        </p>

        <div className="space-y-2 mb-5">
          {((hiMarketSkillDetail?.skillConfig?.skillTags ?? selectedHiMarketSkill.skillConfig?.skillTags ?? []).length > 0) && (
            <div className="flex items-center text-xs">
              <span className="w-16 flex-shrink-0 text-secondary">{i18nService.t('skillDetailTags')}</span>
              <div className="flex items-center gap-1 flex-wrap">
                {(hiMarketSkillDetail?.skillConfig?.skillTags ?? selectedHiMarketSkill.skillConfig?.skillTags ?? []).map((tag, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-raised text-foreground font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center text-xs">
            <span className="w-16 flex-shrink-0 text-secondary">{i18nService.t('skillDetailDownloadCount')}</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-raised text-foreground font-medium">
              {formatDownloadCount(hiMarketSkillDetail?.skillConfig?.downloadCount ?? selectedHiMarketSkill.skillConfig?.downloadCount ?? 0)}
            </span>
          </div>
          <div className="flex items-start text-xs">
            <span className="w-16 flex-shrink-0 text-secondary pt-0.5">{i18nService.t('skillDetailUrl')}</span>
            <button
              type="button"
              className="text-primary hover:underline break-all text-left"
              onClick={(e) => { e.stopPropagation(); window.electron.shell.openExternal(`${hiMarketWebBaseUrl}/skills/${selectedHiMarketSkill.productId}`); }}
            >
              {hiMarketWebBaseUrl}/skills/{selectedHiMarketSkill.productId}
            </button>
          </div>
        </div>

        {(() => {
          const isInstalled = skills.some(s => s.id === selectedHiMarketSkill.productId);
          if (isInstalled) {
            return (
              <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircleIcon className="h-4 w-4" />
                {i18nService.t('skillAlreadyInstalled')}
              </div>
            );
          }
          return !readOnly ? (
            <button
              type="button"
              onClick={() => handleInstallHiMarketSkill(selectedHiMarketSkill)}
              disabled={installingSkillId !== null}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {installingSkillId === selectedHiMarketSkill.productId ? i18nService.t('skillInstalling') : i18nService.t('skillInstall')}
            </button>
          ) : null;
        })()}
      </>
    )}
  </Modal>
, document.body)}
```

- [ ] **Step 12: Commit**

```bash
git add src/renderer/components/skills/SkillsManager.tsx
git commit -m "feat: add internal skills tab with categories, scroll pagination, detail modal"
```

---

### Task 9: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Build the project**

```bash
cd D:/project/lobsterAI && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Fix any build errors**

If there are type errors, fix them and re-run the build.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: build errors from internal skills feature"
```
