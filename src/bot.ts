import "./workspace/colors";
import * as oicq from "oicq";
import { md5 } from "./workspace/crypto";
import { login, loginByPassword, loginByQRCode, loginByToken } from "./bot/login";
import { EventMap, EventEntry, EventResponse, MessageEntry, MessageResponse } from "./events";
import * as message from "./message";
import { AppHandler } from "./interface/app-handler"

/** 支持的账号数据类型 */
export type Account = number | string | Buffer;
/** 支持的密码数据类型 */
export type Password = string | Buffer;
/** QQ号类型 */
export type UserID = number | string;
export type GroupID = number | string;
export type DiscussID = number | string;

/** 机器人状态 */
interface BotStatus {
    /** Show status to do with the OICQ Client */
    client: {
        /** if existing the client whose type is `oicq.Client` */
        exist: boolean;
        /** if the OICQ Client has been logged into */
        logged: boolean;
    }
}

export interface Bot {
    /**
     * 注册事件（携带入口条件）
     * @param event_name 事件名称
     * @param entry 入口函数
     * @param response 回应函数
     */
    register<T extends keyof EventMap<this>>(event_name: T, entry: EventEntry<Bot, T>, response: EventResponse<Bot, T>): void;
    /**
     * 注册事件（不带入口条件）
     * @param event_name 事件名称
     * @param response 回应函数
     */
    register<T extends keyof EventMap<this>>(event_name: T, response: EventResponse<Bot, T>): void;
    /**
     * 注册消息事件（携带入口条件）
     * @param entry 入口，可以是函数或消息实例
     * @param response 回应，可以是函数或消息实例
     */
    registerMsg(entry: MessageEntry<Bot>, response: MessageResponse<Bot>): void;
    /**
     * 注册消息事件（不带入口条件）
     * @param response 回应，可以是函数或消息实例
     */
    registerMsg(response: MessageResponse<Bot>): void;
}

export class Bot {
    /** `oicq.Client`实例 */
    readonly CLIENT: oicq.Client;
    /** QQ账号 */
    readonly ACCOUNT: Account;
    /** 机器人状态 */
    protected status: BotStatus;
    /**
     * QQ机器人实例
     * @param account QQ账号
     * @param password QQ密码或其MD5值（如果为空则不会自动登录）
     */
    constructor(account: Account, password?: Password) {
        const that = this;
        // Default status
        this.status = {
            client: {
                exist: false,
                logged: false
            }
        }
        // Generate CLIENT
        this.CLIENT = Bot.createClient(account);
        this.status.client.exist = true;
        // Add Event to CLIENT
        this.CLIENT.on("system.online", function () {
            that.status.client.logged = true;
        }).on("system.offline", function () {
            that.status.client.logged = false;
        });
        // Store ACCOUNT
        this.ACCOUNT = parseInt(account.toString());
        // Process the password
        const PASSWORD_MD5 = (function () {
            if (!password) return undefined;
            if (Buffer.isBuffer(password)) password = String(password);
            if (password.length == 32) return password;
            else return md5(password);
        })()
        // Login method
        this.loginByToken = loginByToken.bind(this);
        this.loginByPassword = loginByPassword.bind(this);
        this.loginByQRCode = loginByQRCode.bind(this);
        this.login = login.bind(this);
        // Login by password
        if (PASSWORD_MD5) {
            this.loginByPassword(PASSWORD_MD5);
        }
    }

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
     * 使用密码（或其MD5值）登录，如果为空则会在控制台界面要求输入
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

    register<T extends keyof EventMap<this>>(event_name: T, entry: EventEntry<Bot, T> | EventResponse<Bot, T>, response?: EventResponse<Bot, T>): void {
        const that = this;
        function isEntryLegal(entry: EventEntry<Bot, T> | EventResponse<Bot, T>): entry is EventEntry<Bot, T> {
            return !!entry && !!response;
        }
        function isResponseLegal(response?: EventResponse<Bot, T>): response is EventResponse<Bot, T> {
            return !!response;
        }
        // register(event_name, entry: EventEntry<Bot, typeof event_name>, response: EventResponse<Bot, typeof event_name>)
        if (isEntryLegal(entry) && isResponseLegal(response)) {
            this.CLIENT.on(event_name, (...args: any) => {
                if (entry.call(that, ...args)) response.call(that, ...args);
            })
        } else {
            // register(event_name, response: EventResponse<Bot, typeof event_name>)
            const response: EventResponse<Bot, T> = entry;
            this.CLIENT.on(event_name, (...args: any) => response.call(that, ...args));
        }
    }

    registerMsg<T extends "message">(entry: MessageEntry<Bot> | MessageResponse<Bot>, response?: MessageResponse<Bot>): void {
        function isEntryLegal(entry: MessageEntry<Bot> | MessageResponse<Bot>): entry is MessageEntry<Bot> {
            return !!entry && !!response;
        }
        function isResponseLegal(response?: MessageResponse<Bot>): response is MessageResponse<Bot> {
            return !!response;
        }
        const genEntryFunc = (entry: MessageEntry<Bot>): EventEntry<Bot, T> => {
            if (typeof entry != "function") { // entry is Sendable
                return function (event: Parameters<EventMap<Bot>[T]>[0]): boolean {
                    return JSON.stringify(message.fromSendable(entry)) == JSON.stringify(event.message);
                }
            } else return entry; // entry is Function
        }
        const genResponseFunc = (response: MessageResponse<Bot>): EventResponse<Bot, T> => {
            if (typeof response != "function") { // response is Sendable
                const _response: oicq.Sendable = response;
                return function (event: Parameters<EventMap<Bot>[T]>[0]): void {
                    event.reply(_response);
                }
            }
            else return response; // response is Function
        }
        // entry_func
        if (isEntryLegal(entry) && isResponseLegal(response)) { // funtion(entry, response)
            return this.register("message", genEntryFunc(entry), genResponseFunc(response));
        } else { // function(response)
            response = entry;
            return this.register("message", genResponseFunc(response));
        }
    }

    /**
     * 创建一个OICQ Client并返回，用于保存到`CLIENT`属性中
     * @param account QQ acount to login
     * @returns {oicq.Client}
     */
    private static createClient(account: Account): oicq.Client {
        const isAccountLegal = function (account: Account): boolean {
            if (Buffer.isBuffer(account)) return isAccountLegal(String(account));
            else if (typeof account == "number") return true;
            else if (typeof account == "string" && parseInt(account).toString() == account) return true;
            else return false;
        }

        if (isAccountLegal(account)) {
            console.log("QQ账号：".info + account);
            if (Buffer.isBuffer(account))
                account = String(account);
            if (typeof account == "string")
                account = parseInt(account);
            return oicq.createClient(account);
        } else {
            throw new Error("Account is illegal");
        }
    }

    use(instance: AppHandler<this> | ((app: Bot) => any)): Bot {
        function isAppHandler(instance: AppHandler<Bot> | ((app: Bot) => any)): instance is AppHandler<Bot> {
            return "apphandler" in instance;
        }
        if (isAppHandler(instance)) instance.apphandler(this);
        else instance(this);
        return this;
    }
}