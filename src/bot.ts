import "./workspace/colors";
import * as oicq from "oicq";
import { md5 } from "./workspace/crypto";
import { login, loginByPassword, loginByQRCode, loginByToken } from "./bot/login";
import { EventEntry, EventResponse } from "./bot/events";
import { toMessage } from "./bot/message";

export declare type Account = number | string | Buffer;
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

type MessageEntry<T, S extends keyof oicq.EventMap> = EventEntry<T, S> | oicq.Sendable;
type MessageResponse<T, S extends keyof oicq.EventMap> = EventResponse<T, S> | oicq.Sendable;

// export interface EventPool extends oicq.EventMap {
//     name: keyof oicq.EventMap,
//     action
// };

export interface Bot {
    /**
     * 注册事件（携带入口条件）
     * @param event_name 事件名称
     * @param entry 入口函数
     * @param response 回应函数
     */
    register<T extends keyof oicq.EventMap>(event_name: T, entry: EventEntry<Bot, T>, response: EventResponse<Bot, T>): void;
    /**
     * 注册事件
     * @param event_name 事件名称
     * @param response 回应函数
     */
    register<T extends keyof oicq.EventMap>(event_name: T, response: EventResponse<Bot, T>): void;
    /**
     * 注册消息事件
     * @param entry 入口，可以是函数或消息实例
     * @param response 回应，可以是函数或消息实例
     */
    registerMsg<T extends keyof oicq.EventMap>(entry: MessageEntry<Bot, T>, response: MessageResponse<Bot, T>): void;
    /**
     * 注册消息事件
     * @param response 回应，可以是函数或消息实例
     */
    registerMsg<T extends keyof oicq.EventMap>(response: MessageResponse<Bot, T>): void;
}

export class Bot {
    readonly CLIENT: oicq.Client;
    readonly ACCOUNT: Account;
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
        const PASSWORD_MD5 = (function () {
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
        if (PASSWORD_MD5) {
            this.loginByPassword(PASSWORD_MD5)
        }
        // TODO: reaisterMsg
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

    register<T extends keyof oicq.EventMap>(event_name: T, entry: EventEntry<Bot, T> | EventResponse<Bot, T>, response?: EventResponse<Bot, T>): void { // Promise<Parameters<oicq.EventMap[T]>[1]>
        const that = this;
        function isEntryLegal(entry: EventEntry<Bot, T> | EventResponse<Bot, T>): entry is EventEntry<Bot, T> {
            return !!entry && !!response;
        }
        function isResponseLegal(response?: EventResponse<Bot, T>): response is EventResponse<Bot, T> {
            return !!response;
        }
        if (isEntryLegal(entry) && isResponseLegal(response)) {
            this.CLIENT.on(event_name, (event: any) => {
                if (entry.call(that, event)) response.call(that, event);
            })
        } else {
            const response: EventResponse<Bot, T> = entry;
            this.CLIENT.on(event_name, (event: any) => response.call(that, event));
        }
    }

    registerMsg<T extends "message">(entry: MessageEntry<Bot, T> | MessageResponse<Bot, T>, response?: MessageResponse<Bot, T>): void {
        function isEntryLegal(entry: MessageEntry<Bot, T> | MessageResponse<Bot, T>): entry is MessageEntry<Bot, T> {
            return !!entry && !!response;
        }
        function isResponseLegal(response?: MessageResponse<Bot, T>): response is MessageResponse<Bot, T> {
            return !!response;
        }
        const genEntryFunc = (entry: MessageEntry<Bot, T>): EventEntry<Bot, T> => {
            if (typeof entry != "function") { // entry is Sendable
                return function (event: Parameters<oicq.EventMap<oicq.Client>[T]>[0]): boolean {
                    return JSON.stringify(toMessage(entry)) == JSON.stringify(event.message);
                }
            } else return entry; // entry is Function
        }
        const genResponseFunc = (response: MessageResponse<Bot, T>): EventResponse<Bot, T> => {
            if (typeof response != "function") { // response is Sendable
                const _response: oicq.Sendable = response;
                return function (event: Parameters<oicq.EventMap<oicq.Client>[T]>[0], quote?: boolean): void {
                    event.reply(_response, quote);
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
     * 创建一个OICQ Client并保存到`CLIENT`属性中
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
}