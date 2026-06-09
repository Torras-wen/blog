---
title: "写好 Shopify Section Schema：那些容易踩的校验坑"
description: "range 档位、default 取值、text_alignment、内联 CSS 变量优先级……把这些 schema 校验坑一次性讲清楚。"
pubDate: "2026-05-28"
heroImage: "../../assets/blog-placeholder-3.jpg"
---

Section 的 `{% schema %}` 看起来只是一段 JSON，但它有一套并不那么直观的校验规则。下面这些都是实打实踩过的坑，遇到「主题保存失败 / 编辑器报错 / 设置项不生效」时，可以对照排查。

## 一、`range` 的三条硬性规则

`range` 是最容易翻车的控件，它同时要满足三个条件，缺一不可：

1. **档位总数不能超过 101**，即 `(max - min) / step ≤ 100`。
2. **`default` 必须正好落在某个档位上**，即 `(default - min) % step == 0`。
3. **至少要有合理的档数**，只有 1～2 档时别硬用 range。

来看一个**会校验失败**的例子：

```json
{ "type": "range", "id": "height", "label": "高度",
  "min": 0, "max": 1000, "step": 2, "default": 401 }
```

这里有两个问题：`(1000 - 0) / 2 = 500` 档，远超 101；而且 `401` 不是 2 的整数倍，default 也不合法。

正确写法是把 step 放大：

```json
{ "type": "range", "id": "height", "label": "高度",
  "min": 0, "max": 1000, "step": 10, "default": 400, "unit": "px" }
```

`(1000 - 0) / 10 = 100` 档，刚好不超；`400 % 10 == 0`，default 也落在档位上。**高度、宽度这类大范围数值，用 step 4 / 5 / 10，别用 2。**

## 二、只有两档时，用 `select` 而不是 `range`

想做一个「1 列 / 2 列」的切换，别这么写：

```json
{ "type": "range", "id": "cols", "min": 1, "max": 2, "step": 1, "default": 1 }
```

档数太少，体验和校验都不友好。改用 `select`：

```json
{ "type": "select", "id": "cols", "label": "列数", "default": "1",
  "options": [
    { "value": "1", "label": "单列" },
    { "value": "2", "label": "双列" }
  ]
}
```

## 三、`text_alignment` 不被接受时，退回 `select`

有些环境（不同的本地校验器 / Theme Check 版本）并不认 `text_alignment` 这个类型，保存时会报「invalid setting type」。最省事、最兼容的做法是直接用 `select` 模拟：

```json
{ "type": "select", "id": "align", "label": "对齐方式", "default": "left",
  "options": [
    { "value": "left", "label": "左对齐" },
    { "value": "center", "label": "居中" },
    { "value": "right", "label": "右对齐" }
  ]
}
```

模板里直接 `text-align: {{ section.settings.align }}` 即可。

## 四、内联 CSS 变量会盖掉 media query 里的同名变量

这是一个很隐蔽的坑，跟 schema 关系不大，但经常和它一起出现。假设你在 Section 根节点用内联 style 写了 CSS 变量：

```liquid
<section style="--gap: {{ section.settings.gap_desktop }}px">
```

然后想在移动端用 media query 改小：

```css
@media (max-width: 749px) {
  .section { --gap: 12px; }   /* ❌ 不会生效 */
}
```

**根节点元素上的内联 `--gap` 优先级更高，会一直盖住 media query 里的同名变量。** 移动端的差异尺寸有两种解法：

- 改成直接设置属性，而不是改同名变量：`@media (...) { .section { gap: 12px; } }`
- 或者干脆给移动端用一个**不同名**的变量，避免覆盖。

更稳的做法是把响应式差异也交给 setting，桌面/移动各一个值，分别输出到不同变量。

## 五、解析 JSON 模板前，先当 JSONC 处理

如果你写脚本去批量校验 `templates/*.json`，会发现有些文件顶部带一段自动生成的注释：

```json
/* 该文件由主题编辑器自动生成，请勿手动修改 */
{
  "sections": { ... }
}
```

标准 `JSON.parse` 碰到这段 `/* ... */` 会直接抛错。处理方式：先用正则去掉头部注释，或者用支持 JSONC 的解析器，再做后续校验。

## 顺手装上 Theme Check

上面大部分问题，`shopify theme check` 都能在提交前帮你抓出来。把它接进编辑器或 CI，比保存到线上才发现报错要省心得多。下一篇会聊到完整的本地开发工作流。

---

把这几条记牢，schema 这一块基本就不会再莫名其妙地保存失败了。
