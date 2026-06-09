---
title: "Shopify OS 2.0 主题架构：Section、Block 与 JSON Template"
description: "从目录结构到 Section、Block、Section Group，理清 Online Store 2.0 主题到底是怎么组织起来的。"
pubDate: "2026-06-07"
---

刚接手 Shopify 主题开发时，最容易懵的就是：一个页面到底是由哪些文件拼出来的？Online Store 2.0（下文简称 OS 2.0）把整套结构重新梳理了一遍，理解了它，后面做任何改造都会顺很多。

## OS 2.0 带来了什么

相比旧版（Vintage）主题，OS 2.0 最核心的两个变化：

- **所有页面模板都能用 Section**：以前只有首页能拖拽 Section，现在产品页、集合页、甚至博客页都可以。
- **模板从 `.liquid` 变成 `.json`**：模板不再写死结构，而是用 JSON 声明「这个页面由哪些 Section 按什么顺序组成」。

这意味着商家可以在主题编辑器里自由增删、排序几乎所有模块，而开发者只需要把模块（Section）做好。

## 主题目录结构

```
├── assets/          # CSS、JS、图片等静态资源
├── config/          # settings_schema.json（全局设置）、settings_data.json
├── layout/          # theme.liquid，整站外壳
├── locales/         # 多语言翻译
├── sections/        # 可复用的页面模块（核心）
├── blocks/          # 可在 Section 内复用的更小单元（较新）
├── snippets/        # 用 render 引入的 Liquid 片段
└── templates/       # 页面模板，多为 JSON
    └── customers/
```

真正承载「设计感」的逻辑，绝大部分都在 `sections/` 里。

## JSON Template 长什么样

以产品页 `templates/product.json` 为例：

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "settings": {
        "show_vendor": true
      }
    },
    "related": {
      "type": "related-products"
    }
  },
  "order": ["main", "related"]
}
```

`order` 决定了渲染顺序，`sections` 里每一项的 `type` 对应 `sections/` 下的某个 `.liquid` 文件名。模板本身不写任何 HTML，只负责「编排」。

> 小提醒：有些主题生成的 JSON 模板顶部会带一段自动生成的 `/* ... */` 注释。如果你要用脚本 `JSON.parse` 校验，记得先按 JSONC 处理，把头部注释去掉，否则会误报解析失败。

## Section 与 Schema

一个 Section 文件 = Liquid 模板 + 一段 `{% schema %}`。Schema 用 JSON 描述这个模块有哪些可配置项：

```liquid
<section class="promo" style="--pad:{{ section.settings.padding }}px">
  <h2>{{ section.settings.heading }}</h2>
  {% for block in section.blocks %}
    <div class="promo__item" {{ block.shopify_attributes }}>
      {{ block.settings.text }}
    </div>
  {% endfor %}
</section>

{% schema %}
{
  "name": "促销模块",
  "settings": [
    { "type": "text", "id": "heading", "label": "标题", "default": "限时优惠" },
    { "type": "range", "id": "padding", "label": "上下间距",
      "min": 0, "max": 100, "step": 4, "unit": "px", "default": 40 }
  ],
  "blocks": [
    { "type": "item", "name": "条目",
      "settings": [
        { "type": "text", "id": "text", "label": "文案" }
      ]
    }
  ],
  "max_blocks": 6,
  "presets": [{ "name": "促销模块" }]
}
{% endschema %}
```

几个关键点：

- `settings` 是 Section 级别的配置，`section.settings.xxx` 取值。
- `blocks` 是可以在编辑器里反复添加的子单元，`block.settings.xxx` 取值，循环渲染。
- `block.shopify_attributes` 一定要输出在 block 的根元素上，主题编辑器才能精准定位、高亮。
- 有 `presets` 的 Section 才能在编辑器的「添加模块」列表里被商家选用。

## Block：从 Section 内复用到跨 Section 复用

早期 block 是写死在某个 Section 的 schema 里的。较新的主题支持 `blocks/` 目录下的**独立 block 文件**，可以跨 Section 复用，结构和 Section 类似，也带自己的 schema。如果你在做组件化的主题，优先考虑把通用单元抽成独立 block。

## Section Group：让 Header / Footer 也能拖拽

`sections/header-group.json` 这类文件就是 Section Group，它让页眉、页脚区域也变成可在编辑器里配置的 Section 集合：

```json
{
  "type": "header",
  "sections": {
    "announcement": { "type": "announcement-bar" },
    "header": { "type": "header" }
  },
  "order": ["announcement", "header"]
}
```

在 `layout/theme.liquid` 里用 `{% sections 'header-group' %}` 引入整组。

## 小结

把 OS 2.0 拆开看，其实就三层：

1. **Template（JSON）** 负责编排 —— 页面由哪些 Section 组成、什么顺序。
2. **Section（Liquid + Schema）** 负责模块 —— 一块独立、可配置的区域。
3. **Block / Snippet** 负责更小的复用单元。

理清这个层级后，再去读任何一套主题源码，都不会再迷路。下一篇我会专门聊 Section Schema 里那些容易踩的校验坑。
