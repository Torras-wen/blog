---
title: "我的 Shopify 主题开发工作流：CLI、Theme Check 与 Git"
description: "从本地热重载到 Theme Check 把关，再到用 Git 管理多环境，一套让主题开发不再靠在后台手改的工作流。"
pubDate: "2026-04-18"
---

在后台代码编辑器里直接改线上主题，是新手最容易养成的坏习惯——没有版本、没有校验、改崩了还不好回滚。下面是我现在用的一套主题开发流程，核心就三件事：**本地实时预览、提交前自动校验、用 Git 管版本和环境。**

## 一、Shopify CLI：本地实时预览

先装 CLI：

```bash
npm install -g @shopify/cli@latest
```

进到主题目录，启动开发服务器：

```bash
shopify theme dev --store your-store.myshopify.com
```

它会做几件很爽的事：

- 起一个本地预览地址，**保存即热重载**，改 Liquid / CSS / JS 立刻看到效果。
- 用的是线上店铺的真实数据（产品、集合），所见即所得。
- 改动只在本地预览会话里，**不碰线上已发布主题**。

## 二、拉取与推送

把线上主题拉到本地，或把本地改动推上去：

```bash
shopify theme pull                 # 拉取
shopify theme push                 # 推送到指定主题
shopify theme push --unpublished -t "dev-backup"   # 推成一个未发布的新主题
```

我习惯先 `push --unpublished` 推一份未发布的，在后台预览确认没问题，再正式发布。**永远不要直接 push 覆盖线上已发布主题。**

## 三、Theme Check：提交前的守门员

Theme Check 是官方的 Liquid linter，能抓出未定义变量、废弃语法、性能问题，以及上一篇聊过的不少 schema 校验坑：

```bash
shopify theme check
```

把它接进编辑器（有官方 VS Code 扩展）和 CI，问题在写的时候就标红，而不是等保存到线上才报错。这一步省下的来回时间，比想象中多得多。

## 四、用 Git 管版本和环境

主题本质就是一堆文本文件，天生适合 Git。我的分支约定：

- `main` → 线上已发布主题
- `staging` → 预发布，给同事 / 客户验收
- `feature/*` → 单个功能改动

配合不同的目标主题推送：

```bash
# 在 staging 分支，推到「预发布」主题
shopify theme push -t "staging-theme"
```

Shopify 后台的 **Online Store → Themes** 还支持直接连接 GitHub 仓库，连上之后某个主题会跟着指定分支自动同步——团队协作时很方便，但要注意：**连了 GitHub 的主题，别再去后台代码编辑器手改**，否则两边会打架。

## 五、一个典型的改动流程

把上面串起来，我做一次改动通常是这样：

1. `git switch -c feature/new-hero` 开分支。
2. `shopify theme dev` 起本地预览，一边写一边看。
3. 写完跑 `shopify theme check`，把警告清干净。
4. `git commit` 提交，推上去走 review。
5. 合进 `staging`，`push` 到预发布主题给人验收。
6. 验收通过合进 `main`，发布。

## 小结

这套流程的价值不在「用了多少工具」，而在于把**预览、校验、版本**这三件事固化下来：本地能实时看效果，提交前机器帮你挑错，出了问题能用 Git 回到任意一版。养成习惯之后，你基本不会再需要在后台战战兢兢地改线上代码了。
