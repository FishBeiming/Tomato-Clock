# Tomato Clock

一个可部署到 Vercel 的沉浸式番茄钟网页，支持 Supabase 账号云同步。

## 功能

- 专注、短休息、长休息三种模式
- 开始、暂停、重置、跳过
- 圆形倒计时进度读条
- 电子时钟 / 翻页倒计时切换
- 预设背景、图片地址、本地图片背景
- 今日专注分钟和番茄数量统计
- 月度专注热力图
- 专注时长、休息时长、今日目标和提示音设置
- 专注结束后自动进入短休息
- 短休息结束后询问是否开始下一轮
- 邮箱密码注册 / 登录
- 登录后同步设置、今日统计、历史热力图、当前模式和剩余时间
- 未登录或未配置 Supabase 时仍可本地使用

## 配置 Supabase

1. 新建 Supabase 项目。
2. 打开 Supabase 控制台的 `SQL Editor`。
3. 执行 [supabase/schema.sql](./supabase/schema.sql)。
4. 打开 `Project Settings` -> `API`。
5. 复制 `Project URL` 和 `anon public` key。
6. 填入 [supabase-config.js](./supabase-config.js)：

```js
window.TOMATO_SUPABASE_CONFIG = {
  url: "https://你的项目.supabase.co",
  anonKey: "你的 anon public key",
};
```

`anon public` key 会暴露在前端，这是 Supabase 的正常用法。安全边界由 `supabase/schema.sql` 里的 RLS 策略保证：用户只能读取和修改自己的番茄钟数据。

## 多设备同步说明

同一个账号在多个设备登录后，会共用同一份云端记录。网页会在这些时机保存到 Supabase：

- 修改设置或背景 URL 后
- 暂停、重置、切换模式、跳过或完成一轮后
- 专注计时运行时定期保存一次
- 每日专注历史会用于热力图
- 点击账号面板里的“立即同步”

注意：本地上传的图片会保存到当前浏览器，但不会同步到其它设备。要让背景跨设备显示，请使用图片 URL。后续如果需要同步本地图片，可以再接 Supabase Storage。

## 部署到 Vercel

1. 将本目录推送到 GitHub。
2. 在 Vercel 新建项目并导入该仓库。
3. Framework Preset 选择 `Other`。
4. Build Command 留空，Output Directory 使用 `.`。
5. 确认 `supabase-config.js` 已填入你的 Supabase 配置。
6. 点击 Deploy。

也可以使用 Vercel CLI：

```bash
vercel --prod
```

## 本地预览

直接用浏览器打开 `index.html` 即可。也可以在当前目录启动一个静态服务器：

```bash
python -m http.server 5173
```
