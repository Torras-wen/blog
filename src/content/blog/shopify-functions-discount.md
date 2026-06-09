---
title: "Shopify Functions 入门：用代码自定义折扣逻辑"
description: "Scripts 退场之后，自定义折扣、运费、支付规则都靠 Functions。用一个「满 3 件减 10%」的例子跑通整条链路。"
pubDate: "2026-05-15"
---

以前要写自定义折扣，靠的是 Shopify Scripts（Plus 专属、运行在 Ruby 沙箱里）。现在这套能力被 **Shopify Functions** 取代：你写一段逻辑，编译成 WebAssembly，由 Shopify 在结账等环节高速执行。

## Functions 的运行模型

几个要点先建立认知：

- **运行时是 Wasm**：代码最终编译成 `.wasm`，在 Shopify 平台上运行，毫秒级、无网络、无副作用。
- **语言可选**：官方支持 Rust（性能最好），也支持 JavaScript / TypeScript（通过 Javy 编译成 Wasm）。
- **纯函数**：输入一个 JSON，返回一个 JSON。你不能在里面发请求、读数据库，需要的数据全部通过 **input query** 提前声明。
- **挂在 App 上**：Function 是 App 扩展的一种，通过 Shopify CLI 创建和部署。

每个 Function 都由三部分组成：**input query（要什么数据）+ run 函数（怎么算）+ toml 配置（挂到哪个 target）**。

## 创建一个 Function

在 App 项目里：

```bash
shopify app generate extension --template product_discount
```

它会生成一个目录，核心文件大致是 `src/run.graphql`、`src/run.js`（或 `.ts` / Rust 的 `src/main.rs`）和 `shopify.extension.toml`。

## 第一步：声明需要的输入

`src/run.graphql` 决定 run 函数能拿到哪些数据。我们要做「单个商品买够 3 件就打 9 折」，只需要每条购物车行的 id 和数量：

```graphql
query RunInput {
  cart {
    lines {
      id
      quantity
    }
  }
}
```

## 第二步：写折扣逻辑

`src/run.js`，导出一个 `run` 函数，输入就是上面 query 的结果：

```javascript
// @ts-check

/**
 * @param {import("../generated/api").RunInput} input
 * @returns {import("../generated/api").FunctionRunResult}
 */
export function run(input) {
  const EMPTY = { discounts: [], discountApplicationStrategy: "FIRST" };

  // 找出数量 >= 3 的购物车行
  const targets = input.cart.lines
    .filter((line) => line.quantity >= 3)
    .map((line) => ({ cartLine: { id: line.id } }));

  if (targets.length === 0) {
    return EMPTY;
  }

  return {
    discounts: [
      {
        targets,
        value: { percentage: { value: "10.0" } },
        message: "满 3 件 9 折",
      },
    ],
    discountApplicationStrategy: "FIRST",
  };
}
```

逻辑很纯粹：过滤出符合条件的行，构造 `targets`，返回一个百分比折扣。`discountApplicationStrategy` 决定多个折扣并存时怎么取舍，`FIRST` 表示按顺序取第一个适用的。

## 第三步：配置 toml

`shopify.extension.toml` 把这个 Function 挂到具体的扩展点（target）：

```toml
api_version = "2025-01"

[[extensions]]
name = "volume-discount"
handle = "volume-discount"
type = "function"

  [[extensions.targeting]]
  target = "purchase.product-discount.run"
  input_query = "src/run.graphql"
  export = "run"
```

`target` 是关键——它告诉 Shopify「在计算商品折扣时调用我」。运费、支付方式排序等也是换一个 target 而已。`api_version` 请以官方当前文档为准。

## 部署与激活

```bash
shopify app deploy
```

部署只是把 Function「上架」。它还不会自动生效——你需要**创建一个折扣去引用它**。可以在后台手动建，也可以用 Admin GraphQL 的 `discountAutomaticAppCreate` 之类的 mutation 自动创建，把 `functionId` 指过去。

## 本地怎么调试

```bash
shopify app function run
```

它会用一份示例输入跑一遍你的 run 函数，直接看到返回的 JSON，不用每次都部署到线上。配合单元测试，逻辑越复杂越值得这么做。

---

Functions 的心智模型其实很简单：**声明输入 → 纯函数计算 → 返回结果**。把第一个折扣 Function 跑通之后，运费规则、捆绑销售、会员价这些需求都是同一套路子。下一篇聊聊数据从哪来——Storefront 与 Admin 两套 GraphQL API。
