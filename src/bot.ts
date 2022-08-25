import "./components/colors";
import * as oicq from "oicq";
import { md5 } from "./components/crypto";
import { login, loginByPassword, loginByQRCode, loginByToken } from "./bot/login";

export declare type Account = number | string;
export declare type Password = string | Buffer;

interface BotStatus {
    /** Show status to do with the OICQ Client */
    client: {
        /** if existing the client whose type is oicq.Client */
        exist: boolean;
        /** if the OICQ Client has been logged into */
        logged: boolean;
    }
}

export class Bot {
    readonly CLIENT: oicq.Client;
    readonly ACCOUNT: Account;
    readonly PASSWORD_MD5?: Password;
    /**
     * 使用 Token 登录
     * ```
     * // 一种 Token 验证失败时的验证方式排序的实现
     * Bot.loginByToken().catch(()=>{
     *     Bot.loginByPassword(password).catch(()=>{
     *         Bot.loginByQRCode().catch((e)=>{console.log(e)});
     *     })
     * })
     * ```
     */
    readonly loginByToken: (this: Bot) => Promise<void>;
    /**
     * 使用密码登录，如果密码为空则会在控制台界面要求输入
     */
    readonly loginByPassword: (this: Bot, password?: Password) => Promise<void>;
    /**
     * 使用二维码登录，扫码完成后回车可尝试登录
     */
    readonly loginByQRCode: (this: Bot) => Promise<void>;
    /**
     * 会优先尝试使用token登录 (token在上次登录成功后存放在`this.CLIENT.dir`下)
     *
     * 无token或token失效时：
     * * 传了`password`则尝试密码登录
     * * 不传`password`则尝试扫码登录
     *
     * 掉线重连时也是自动调用此函数，走相同逻辑
     * 你也可以在配置中修改`reconn_interval`，关闭掉线重连并自行处理
     *
     * @param password 可以为密码原文，或密码的md5值
     */
    readonly login: (this: Bot, password?: Password) => Promise<void>;
    private status: BotStatus;
    /**
     * QQ机器人
     * @param account QQ账号
     * @param password QQ密码（如果为空则不会自动登录）
     */
    constructor(account: Account, password?: Password) {
        this.status = {
            client: {
                exist: false,
                logged: false
            }
        }
        // Generate CLIENT
        this.CLIENT = Bot.createClient(account);
        this.status.client.exist = true;
        // STORE ACCOUNT
        this.ACCOUNT = parseInt(account.toString());
        // define property LOGIN
        this.PASSWORD_MD5 = (function () {
            if (!password) return undefined;
            if (Buffer.isBuffer(password)) password = String(password);
            if (password.length == 32) return password;
            else return md5(password);
        })()
        // login method
        this.loginByToken = loginByToken.bind(this);
        this.loginByPassword = loginByPassword.bind(this);
        this.loginByQRCode = loginByQRCode.bind(this);
        this.login = login.bind(this);
        // login by password
        if (this.PASSWORD_MD5) {
            this.loginByPassword(this.PASSWORD_MD5)
        }
        // TODO: reaisterMsg
    }

    /**
     * 创建一个OICQ Client并保存到`CLIENT`属性中
     * @param account - QQ acount to login
     * @returns {oicq.Client}
     */
    private static createClient(account: Account): oicq.Client {
        const isAccountLegal = function (account: Account): boolean {
            if (typeof account == "number") return true;
            else if (typeof account == "string" && parseInt(account).toString() == account) return true;
            else return false;
        }

        if (isAccountLegal(account)) {
            console.log("QQ账号：".info + account);
            if (typeof account == "string")
                account = parseInt(account);
            return oicq.createClient(account);
        } else {
            throw new Error("Account is illegal");
        }
    }
}