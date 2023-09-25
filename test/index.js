const osdk = require("../");
require("../lib/workspace/colors");

// const CONFIG = require("./config");
// const oicq = require("oicq");
const reading = require("../lib/workspace/reading")

var Bot;
// account
const isAccountLegal = function (account) {
    if (!account) return false;
    else if (typeof account == "number") return true;
    else if (typeof account == "string" && parseInt(account).toString() == account) return true;
    else return false;
}

function getAccount(account) {
    return new Promise(resolve => {
        if (isAccountLegal(account)) resolve(account);
        else {
            reading("请输入QQ账号：".info).then(input => {
                getAccount(String(input)).then(account => {
                    resolve(account);
                });
            })
        }
    })
}
getAccount(2706109441).then(account => {
    Bot = new osdk.Bot(account, {
        platform: 3
    });

    // Login
    const loginType = (function () {
        var loginArg;
        for (const arg of process.argv)
            if (arg.includes(":") && (loginArg = arg.split(":")).length == 2 && loginArg[0].trim() == "login")
                return ["password", "qrcode"].includes(loginArg[1].trim().toLowerCase()) ?
                    loginArg[1].trim().toLowerCase() : "qrcode";
        return "auto";
    })()
    if (loginType == "password") Bot.loginByPassword();
    else if (loginType == "qrcode") Bot.loginByQRCode();
    else {
        Bot.loginByToken().catch(() => {
            Bot.loginByPassword().catch(() => {
                Bot.loginByQRCode().catch(e => {
                    console.log(e);
                });
            });
        });
    }

    // 监听上线事件
    Bot.CLIENT.on("system.online", () => console.log("Logged in!".success));

    // 监听消息并回复
    Bot.CLIENT.once("message", (event) => {
        console.log(event)
    });
    Bot.registerMsg("request", "response");
    Bot.onceMsg(["我是", "人工智障！"]);

    // 使用监听对象
    const listner1 = new osdk.Listener();
    listner1.event("message", function (event) {
        if (osdk.message.equals(event.message, "hello")) event.reply("world!", this.options.quote)
    }, {
        quote: true
    })

    Bot.use(listner1);
})