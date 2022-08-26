import { Bot, Password } from "../bot";
import * as fs from "fs";
import * as path from "path";
import { reading } from "../workspace/reading";
import { md5 } from "../workspace/crypto";


let __before_run = false;

/** 预设置登录的监听事件 */
const __before = function (this: Bot): void {
    if (__before_run) return;
    __before_run = true;
    // Login by password
    this.CLIENT.on("system.login.slider", function (event) { //监听滑动验证码事件
        reading("请输入Ticket：".info).then((input: Buffer) => {
            const ticket: string = String(input).trim();
            this.submitSlider(ticket);
        })
    }).on("system.login.device", function (event) { // 监听登录保护验证事件
        console.log("若需要短信验证，请输入 " + "SMS".info + " 后回车");
        var _listenEvent: (inputBuf: Buffer) => void;
        var sms_enabled = false;
        reading().then(_listenEvent = (inputBuf: Buffer) => {
            const input = String(inputBuf).trim();
            if (input == "SMS") { // SMS: Use SMS to login
                sms_enabled = true;
                this.sendSmsCode();
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
                this.submitSmsCode(input); // Number: submit the SMS code
            else this.login(); // Enter: Login after verifying
        })
    }).on("system.login.qrcode", async function (event) { // login by QR Code
        await reading("扫码完成并确认后回车".info)
        this.login();
    })
}

/** 使用 Token 登录 */
export const loginByToken: Bot["loginByToken"] = async function (this: Bot) {
    __before.call(this);
    // try loggin by token
    try {
        const token: Buffer = await fs.promises.readFile(path.join(this.CLIENT.dir, "token"));
        return this.CLIENT.tokenLogin(token);
    } catch (e) {
        return new Promise((_, reject) => { reject(e) });
    }
}

/** 使用密码登录，如果密码为空则会在控制台界面要求输入 */
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
    return this.CLIENT.login(pwd_md5); // Password or md5 crypted
}

/** 使用二维码登录，扫码完成后回车可尝试登录 */
export const loginByQRCode: Bot["loginByQRCode"] = async function (this: Bot) {
    __before.call(this);
    return this.CLIENT.sig.qrsig.length ? this.CLIENT.qrcodeLogin() : this.CLIENT.fetchQrcode();
}

/** 自动登录 */
export const login: Bot["login"] = async function (this: Bot, password?: Password) {
    __before.call(this);
    return this.CLIENT.login(password)
}