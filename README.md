# OpenICQ SDK

[![NPM Version](https://img.shields.io/npm/v/oicq-sdk)](https://www.npmjs.com/package/oicq-sdk)
[![Node Engine Version](https://img.shields.io/node/v/oicq-sdk)](https://nodejs.org)
[![Total Downloads](https://shields.io/npm/dt/oicq-sdk)](https://www.npmjs.com/package/oicq-sdk)

提供`oicq`的QQ机器人工具包

Developing...

## Usage

### 创建并登录

创建一个机器人

```javascript
const osdk = require("oicq-sdk")
const Bot = new osdk.Bot("account") // QQ账号
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
const Bot = new osdk.Bot("account", "password")
```

一种自定义登录方式排序的方法

```javascript
Bot.loginByToken().catch(_ => {
    Bot.loginByPassword(password).catch(_ => {
        Bot.loginByQRCode().catch(e => {
            console.log(e)
        });
    });
});
```

## Example

```javascript
const osdk = require("oicq-sdk")
const Bot = new osdk.Bot("account", "password") // QQ账号
// 上线事件
Bot.online(_ => {console.log("Logged in!")})
// 下线事件
Bot.offline(_ => {console.log("Disconnected!")})
// 注册消息事件
Bot.register("message", () => true, event => {event.reply("message received")})
// 注册单次消息事件（只有当回复函数被成功执行才算`once`成功）
Bot.once("message", event => {
    return osdk.message.equals(event.message, "in")
}, event => {
    event.reply("out")
})
// 使用`Listener`插件
const listener = new osdk.Listener()
listener.event("message", function(event) {
    if(osdk.message.equals(event.message, "hello"))
        event.reply("world")
})
Bot.use(listener)
```

## Documents

具体请见 [TypeDoc](https://cnily03.github.io/oicq-sdk)
