---
title: "Shopify GraphQL 实战：Storefront API 与 Admin API 怎么选"
description: "两套 GraphQL API 长得像，用途和权限却天差地别。讲清楚什么场景该用哪一个，以及分页、限流、安全这些绕不开的细节。"
pubDate: "2026-04-30"
heroImage: "../../assets/blog-placeholder-5.jpg"
---

Shopify 有两套 GraphQL API：**Storefront API** 和 **Admin API**。新手最常见的困惑是「它俩都能查产品，到底用哪个」。一句话区分：**给买家看的、能放到前端的，用 Storefront；做管理的、必须留在服务端的，用 Admin。**

## 一张表看懂区别

| | Storefront API | Admin API |
| --- | --- | --- |
| 面向 | 买家 / 前端 | 商家 / 后端 |
| 典型数据 | 产品、集合、购物车、结账 | 订单、库存、客户、履约 |
| 令牌 | 公开 token，可暴露在客户端 | 私密 token，**只能在服务端用** |
| 认证头 | `X-Shopify-Storefront-Access-Token` | `X-Shopify-Access-Token` |
| 限流方式 | 按请求 | 基于查询成本（calculated cost） |

## Storefront API：取产品给前端展示

Storefront token 是公开的，可以直接在浏览器里发请求。比如取前 5 个产品：

```graphql
query Products {
  products(first: 5) {
    edges {
      node {
        title
        handle
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
  }
}
```

发起请求：

```javascript
const res = await fetch(
  "https://your-shop.myshopify.com/api/2025-01/graphql.json",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query }),
  },
);
const { data } = await res.json();
```

做 headless 商店、自定义购物车、或者主题里的前端增强，基本都走这套。

## Admin API：改库存、查订单

Admin API 能动「真正的业务数据」，所以权限敏感。比如更新一个产品标题：

```graphql
mutation UpdateTitle {
  productUpdate(input: { id: "gid://shopify/Product/123456", title: "夏季新款" }) {
    product { id title }
    userErrors { field message }
  }
}
```

注意两点：

- ID 用的是 **GID** 格式 `gid://shopify/Product/123456`，不是纯数字。
- 几乎所有 mutation 都返回 `userErrors`，**一定要检查它**——HTTP 200 不代表业务成功。

## 分页：永远是 cursor，不是 page number

两套 API 都用游标分页。别想着 `page=2`，要顺着 `pageInfo` 往后翻：

```graphql
query {
  orders(first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      cursor
      node { id name }
    }
  }
}
```

循环逻辑：拿 `endCursor` 当下一次的 `after`，直到 `hasNextPage` 变成 `false`。

## 限流：Admin 按「查询成本」算

Admin GraphQL 不是简单地数请求次数，而是给每个查询算一个 **cost**（字段越多、取得越多，cost 越高），用漏桶模型扣额度。响应里会带 `extensions.cost`：

```json
{
  "extensions": {
    "cost": {
      "requestedQueryCost": 12,
      "throttleStatus": {
        "currentlyAvailable": 988,
        "maximumAvailable": 1000,
        "restoreRate": 50
      }
    }
  }
}
```

实战建议：**只查你要用的字段**（GraphQL 的最大优点就是按需取），批量任务里读 `throttleStatus` 做自适应退避，碰到 `THROTTLED` 就按 `restoreRate` 等额度恢复再继续。

## 安全：Admin token 绝不进前端

这是最容易出事的一条。**Storefront token 设计上就是公开的**，放前端没问题；但 **Admin token 一旦泄露，等于把整个店铺后台交出去**。所以：

- Admin API 调用只在服务端（你的后端 / Serverless 函数）发起。
- token 放环境变量，别硬编码、别提交进 Git。
- 前端需要管理数据时，让它请求你自己的后端，由后端代理调用 Admin API。

## 怎么选，一句话收尾

- 数据是给买家看的、代码跑在浏览器里 → **Storefront API**。
- 操作的是订单/库存/客户、必须保密 → **Admin API**，且只在服务端。

把这条边界守住，既不会用错 API，也不会把店铺安全暴露出去。
