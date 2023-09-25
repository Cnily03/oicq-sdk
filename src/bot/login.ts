import { Bot, Password } from "../bot";
import * as fs from "fs";
import * as path from "path";
import { reading } from "../workspace/reading";
import { md5 } from "../workspace/crypto";


let __has_run = false;

/** 预设置登录的监听事件 */
const __before = function (this: Bot): void {
    if (__has_run) return;
    __has_run = true;
    const that = this.CLIENT;
    // Login by password
    this.CLIENT.on("system.login.slider", function (event) { //监听滑动验证码事件
        reading("请输入Ticket：".info).then((input: Buffer) => {
            const ticket: string = String(input).trim();
            that.submitSlider(ticket);
        })
    }).on("system.login.device", function (event) { // 监听登录保护验证事件
        console.log("若需要短信验证，请输入 " + "SMS".info + " 后回车");
        var _listenEvent: (inputBuf: Buffer) => void;
        var sms_enabled = false;
        reading().then(_listenEvent = (inputBuf: Buffer) => {
            const input = String(inputBuf).trim();
            if (input == "SMS") { // SMS: Use SMS to login
                sms_enabled = true;
                that.sendSmsCode();
                // wait for sending successfully
                var psw = process.stdout.write;
                process.stdout.write = (...args: any[]): boolean => {
                    const psw_new = process.stdout.write;
                    process.stdout.write = psw;
                    const rv: boolean = process.stdout.write(args[0], args[1]);
                    if (String(args[0]).includes("已向密保手机发送短信验证码")) {
                        setTimeout(() => {
                            // successfully sent, ask to input the SMS code
                            reading("请输入短信验证码：".info).then((smsCodeBuf: Buffer) => {
                                _listenEvent(smsCodeBuf);
                            })
                        }, 1);
                        return rv;
                    } else {
                        process.stdout.write = psw_new;
                        return rv;
                    }
                }
            } else if (sms_enabled && parseInt(input).toString() == input)
                that.submitSmsCode(input); // Number: submit the SMS code
            else that.login(); // Enter: Login after verifying
        })
    }).on("system.login.qrcode", async function (event) { // login by QR Code
        await reading("扫码完成并确认后回车".info)
        that.login();
    });
}

/** 使用 Token 登录 */
export const loginByToken: Bot["loginByToken"] = async function (this: Bot) {
    __before.call(this);
    // try loggin by token
    try {
        if (typeof this.CLIENT.uin !== "number") this.CLIENT.uin = Number(this.ACCOUNT.toString())
        let uin = this.CLIENT.uin;
        if (!uin) throw new Error("No uin specified");
        const token_path = path.join(this.CLIENT.dir, uin + "_token");
        if (!fs.existsSync(token_path) && fs.existsSync(token_path + "_bak")) {
            fs.renameSync(token_path + "_bak", token_path);
        }
        const token: Buffer = await fs.promises.readFile(token_path);
        return this.CLIENT.tokenLogin(token);
    } catch (e) {
        return new Promise((_, reject) => { reject(e) });
    }
}

/** 使用密码（或其MD5值）登录，如果为空则会在控制台界面要求输入 */
export const loginByPassword: Bot["loginByPassword"] = async function (this: Bot, password?: Password) {
    __before.call(this);
    // logging in by token failed, ask for password
    if (Buffer.isBuffer(password)) password = String(password);
    else if (typeof password == "undefined")
        // ask for inputing password
        password = String(await reading("请输入QQ密码：".info, true));
    var pwd_md5: Password;
    if (password.length == 32) pwd_md5 = password;
    else pwd_md5 = md5(password);
    return this.CLIENT.login(parseInt(this.ACCOUNT.toString()), pwd_md5); // Password or md5 crypted
}

/** 使用二维码登录，扫码完成后回车可尝试登录 */
export const loginByQRCode: Bot["loginByQRCode"] = async function (this: Bot) {
    __before.call(this);
    return this.CLIENT.sig.qrsig.length ? this.CLIENT.qrcodeLogin() : this.CLIENT.fetchQrcode();
}

/** 自动登录 */
export const login: Bot["login"] = async function (this: Bot, password?: Password) {
    __before.call(this);
    return this.CLIENT.login(parseInt(this.ACCOUNT.toString()), password);
}