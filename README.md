# OpenICQ SDK

提供`iocq`的QQ机器人工具包

Developing...

## Usage

### 创建并登录

创建一个机器人

```javascript
const osdk = require("oicq-osdk")
const Bot = new osdk.Bot(123456789) // QQ账号
```

登录

```javascript
Bot.loginByPassword() // 控制台界面输入QQ密码后登录
Bot.loginByPassword("password") // 使用密码或密码的md5值登录
Bot.loginByQRCode() // 使用二维码登录
Bot.loginByToken() // 使用Token登录
Bot.login() // 自动登录（先尝试Token，如果有密码则使用密码登录，否则使用扫描二维码登录）
```

也可以直接在创建时登录

```javascript
const Bot = new osdk.Bot(123456789, "password")
```

一种自定义登录方式排序的方法

```javascript
Bot.loginByToken().catch(()=>{
  Bot.loginByPassword(password).catch(()=>{
    Bot.loginByQRCode().catch((e)=>{console.log(e)});
  })
})
```

## Documents

### Class

- [x] `Bot` - 机器人实例

### Properties

- [x] `Bot.CLIENT` - `oicq.Client` 实例
- [x] `Bot.ACCOUNT` - 实例登录的QQ账号
- [x] `Bot.status` - 用于记录一些机器人状态参数

### Method

- [x] `Bot.loginByPassword(password?: string | Buffer)` - 使用密码登录
- [x] `Bot.loginByQRCode()` - 使用二维码登录
- [x] `Bot.loginByToken()` - 使用Token登录
- [x] `Bot.login(password?: string | Buffer)` - 自动选择登录方式
- [x] `Bot.register(event_name: string, entry, response)` - 注册事件（带入口条件）
      `Bot.register(event_name: string, response)` - 注册事件（不带入口条件）
- [x] `Bot.registerMsg(entry, response)` - 注册消息监听（带入口条件）
      `Bot.registerMsg(response)` - 注册消息监听（不带入口条件）
