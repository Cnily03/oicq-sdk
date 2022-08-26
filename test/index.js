const osdk = require("../");
require("../lib/workspace/colors");
// const CONFIG = require("./config");
// const oicq = require("oicq");
const reading = require("../lib/workspace/reading")

var OICQ

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
getAccount(3136377562).then(account => {
    OICQ = new osdk.Bot(account);

    // Login
    const loginType = (function () {
        var loginArg;
        for (const arg of process.argv)
            if (arg.includes(":") && (loginArg = arg.split(":")).length == 2 && loginArg[0].trim() == "login")
                return ["password", "qrcode"].includes(loginArg[1].trim().toLowerCase()) ?
                    loginArg[1].trim().toLowerCase() : "qrcode";
        return "password";
    })()
    if (loginType == "password") OICQ.loginByPassword();
    else OICQ.loginByQRCode()

    // 监听上线事件
    OICQ.CLIENT.on("system.online", () => console.log("Logged in!".success));

    // 监听消息并回复
    OICQ.CLIENT.on("message", (event) => {
        event.reply("hello world")
        console.log(event)
    });
    OICQ.CLIENT.on("message", (event) => {
        event.reply("gaga")
        // console.log(event)
    });
})