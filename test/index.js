const osdk = require("../");
const {
    Listener
} = osdk;
require("../lib/workspace/colors");
// const CONFIG = require("./config");
// const oicq = require("oicq");
const reading = require("../lib/workspace/reading")

var OICQ;
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
        return "auto";
    })()
    if (loginType == "password") OICQ.loginByPassword();
    else if (loginType == "qrcode") OICQ.loginByQRCode();
    else {
        OICQ.loginByToken().catch(() => {
            OICQ.loginByPassword().catch(() => {
                OICQ.loginByQRCode().catch(e => {
                    console.log(e);
                });
            });
        });
    }

    // 监听上线事件
    OICQ.CLIENT.on("system.online", () => console.log("Logged in!".success));

    // 监听消息并回复
    OICQ.CLIENT.on("message", (event) => {
        console.log(event)
    });
    OICQ.registerMsg("request", "response");
    OICQ.registerMsg(["1", "12"]);

    // 使用监听对象
    const listner1 = new Listener();
    listner1.event("message", function (event) {
        if (event.raw_message == "hello") event.reply("world!")
    })
    OICQ.use(listner1);
})