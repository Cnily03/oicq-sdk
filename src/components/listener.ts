import * as oicq from "oicq";
import { NOOP } from "oicq/lib/common";
import { Bot, DiscussID, GroupID, UserID } from "../bot";
import { ActionThis, EventElem, EventMap, EventPool } from "../events";
import { AppHandler } from "../interface/app-handler";
import { sha1 } from "../workspace/crypto";
interface ListenerActionThis<T, S extends keyof EventMap<Bot>> extends ActionThis<T, S> {
    readonly options: Options[S]
}
type ListenerEventElem<T, S extends keyof EventMap<T>, A = ListenerActionThis<T, S>> = EventElem<T, S, A>

/**
 * 一个事件监听器
 */
export class Listener extends AppHandler<Bot> {
    private default_options: Partial<Options>;
    private option_map: {
        [hash: string]: Options[keyof Options]
    };
    // private event_pool: EventPool<Bot, ListenerEventElem<Bot, keyof EventMap<Bot>>>;
    private event_pool: EventPool<Bot, ListenerEventElem<Bot, keyof EventMap<Bot>, any>>
    /**
     * Register a listener to one or more listeners.
     */
    constructor() {
        super("Listener");
        this.default_options = default_options;
        this.option_map = {};
        this.event_pool = [];
    }

    apphandler(app: Bot) {
        for (const elem of this.event_pool) {
            const options = Listener.mergeOptions<Options[typeof elem.event]>(this.default_options[elem.event] || {}, this.option_map[elem.hash] || {});
            const actionThis = {
                app: app,
                options: options
            }
            app.CLIENT.on(elem.event, (...args: Parameters<EventMap<Bot>[typeof elem.event]>) => {
                if (this.option_pass<typeof elem.event>(elem.event, options, args))
                    elem.action.call(actionThis, ...args)
            });
        }
    }

    /**
     * 
     * @param event_name 事件名称
     * @param action 事件执行函数
     * @param options 附加选项
     */
    event<T extends keyof EventMap<Bot>>(
        event_name: T,
        action: ListenerEventElem<Bot, T>["action"],
        options?: Partial<Options[T]>
    ) {
        const hash = sha1(String(new Date().getTime()))
        const event_elem: ListenerEventElem<Bot, T> = {
            hash: hash,
            event: event_name,
            action: action
        }
        this.event_pool.push(event_elem);
        if (typeof options !== "undefined") // Reduce the storage. Empty options will be `{}` when merging with the default.
            this.option_map[hash] = options;
        return this;
    }

    private option_pass<T extends keyof EventMap<Bot>>(event_name: T, options: Options[T], args: Parameters<EventMap<Bot>[T]>) {
        switch (true) {
            case Listener.isEventNameMessage(event_name): { // event_name is EventName.Message
                switch ((args[0] as oicq.PrivateMessageEvent | oicq.GroupMessageEvent | oicq.DiscussMessageEvent).message_type) {
                    case "private":
                        const private_event = args[0] as oicq.PrivateMessageEvent;
                        return Listener.filterInExclude(private_event.sender.user_id,
                            (options as Options["message.private"]).include.private,
                            (options as Options["message.private"]).exclude.private,
                        )
                        break;
                    case "group":
                        const group_event = args[0] as oicq.GroupMessageEvent;
                        return Listener.filterInExclude(group_event.group_id,
                            (options as Options["message.group"]).include.group,
                            (options as Options["message.group"]).exclude.group,
                        ) && Listener.filterInExclude(group_event.sender.user_id,
                            (options as Options["message.group"]).include.group_member,
                            (options as Options["message.group"]).exclude.group_member,
                        )
                        break;
                    case "discuss":
                        const discuss_event = args[0] as oicq.DiscussMessageEvent;
                        return Listener.filterInExclude(discuss_event.discuss_id,
                            (options as Options["message.discuss"]).include.discuss,
                            (options as Options["message.discuss"]).exclude.discuss,
                        ) && Listener.filterInExclude(discuss_event.sender.user_id,
                            (options as Options["message.discuss"]).include.discuss_member,
                            (options as Options["message.discuss"]).exclude.discuss_member,
                        )
                        break;
                    default: break;
                }
                break;
            }
            // TODO: other cases of events
            default: break;
        }
        return true;
    }

    private static filterInExclude(
        id: number | string,
        include: number | string | (number | string)[] | undefined,
        exclude: number | string | (number | string)[] | undefined
    ): boolean {
        var includePass = false, excludePass = true;
        if (typeof id !== "number") id = parseInt(id);
        // exclude
        if (typeof exclude !== "undefined") {
            if (!Array.isArray(exclude)) exclude = [exclude];
            for (const __id of exclude) {
                const _id = typeof __id !== "number" ? parseInt(__id) : __id;
                if (_id == id) { return excludePass = false; break; }
            }
        }
        // include
        if (typeof include !== "undefined") {
            if (!Array.isArray(include)) include = [include];
            for (const __id of include) {
                const _id = typeof __id !== "number" ? parseInt(__id) : __id;
                if (_id == id) { return includePass = true; break; }
            }
        } else return includePass = true;
        // other circumstances
        return excludePass && includePass;
    }

    private static mergeOptions<T>(options: T, patch: Partial<T>) {
        for (const key of Array.from(new Set([...Object.keys(options as {}), ...Object.keys(patch as {})]))) {
            const _options = (options as any)[key], _patch = (patch as any)[key];
            if (isJSON(_options) && isJSON(_patch))
                (patch as any)[key] = Listener.mergeOptions(_options, _patch);
        }
        return { ...options, ...patch } as T;
    }

    private static isEventNameMessage(event_name: keyof EventMap<Bot>): event_name is EventName.Message {
        return /^message/.test(event_name);
    }
}

function isJSON(obj: any): obj is { [k: string]: any, [k: number]: any } {
    return typeof obj == 'object' && JSON.stringify(obj).indexOf('{') == 0
}

/** 事件名称的分类 */
namespace EventName {
    export namespace Message {
        export type Private = "message.private" | "message.private.friend" | "message.private.group" | "message.private.other" | "message.private.self"
        export type Group = "message.group" | "message.group.anonymous" | "message.group.normal"
        export type Discuss = "message.discuss"
    }
    export type Message = "message" & EventName.Message.Private & EventName.Message.Group & EventName.Message.Discuss
}

/** 不同时间的Options的格式 */
namespace OptionsFormat {
    type BaseMessage = {
        /**
         * 是否引用对方的消息
         * @notice 该配置项仅作为传递项，需要通过`this.options.quote`在执行函数中获取并设置
         * @default false
         */
        quote: boolean,
        /** 
         * 优先级低于`exclude`.
         * 即当`include`和`exclude`都包含同一值时，忽略`include`.
         */
        include: { [k: string]: any },
        /** 
         * 优先级高于`include`.
         * 即当`include`和`exclude`都包含同一值时，忽略`include`.
         */
        exclude: { [k: string]: any }
    }
    /**
     * 以下`Options`的格式
     * ```
     * Options["message"]
     * ```
     */
    export type Message = Message.Private & Message.Group & Message.Discuss
    export namespace Message {
        /**
         * 以下`Options`的格式
         * ```
         * Options["message.private" | "message.private.friend" | "message.private.group" | "message.private.other" | "message.private.self"]
         * ```
         */
        export type Private = {
            include: {
                /**
                 * 包含的用户QQ号
                 * @default undefined
                 */
                private?: UserID | UserID[]
            },
            exclude: {
                /**
                 * 排除的用户QQ号
                 * @default undefined
                 */
                private?: UserID | UserID[]
            }
        } & BaseMessage
        /**
         * 以下`Options`的格式
         * ```
         * Options["message.group" | "message.group.anonymous" | "message.group.normal"]
         * ```
         */
        export type Group = {
            include: {
                /**
                 * 包含的群号
                 * @default undefined
                 */
                group?: GroupID | GroupID[],
                /**
                 * 包含的群成员
                 * @default undefined
                 */
                group_member?: UserID | UserID[]
            },
            exclude: {
                /**
                 * 排除的群号
                 * @default undefined
                 */
                group?: GroupID | GroupID[],
                /**
                 * 排除的群成员
                 * @default undefined
                 */
                group_member?: UserID | UserID[]
            }
        } & BaseMessage
        /**
         * 以下`Options`的格式
         * ```
         * Options["message.discuss"]
         * ```
         */
        export type Discuss = {
            include: {
                /**
                 * 包含的讨论组号
                 * @default undefined
                 */
                discuss?: DiscussID | DiscussID[],
                /**
                 * 包含的讨论组成员
                 * @default undefined
                 */
                discuss_member?: UserID | UserID[]
            },
            exclude: {
                /**
                 * 排除的讨论组号
                 * @default undefined
                 */
                discuss?: DiscussID | DiscussID[],
                /**
                 * 排除的讨论组成员
                 * @default undefined
                 */
                discuss_member?: UserID | UserID[]
            }
        } & BaseMessage
    }
}

type Options = { [event in keyof EventMap<Bot>]: {}; } &
    { [event_message_private in EventName.Message.Private]: OptionsFormat.Message.Private; } &
    { [event_message_group in EventName.Message.Group]: OptionsFormat.Message.Group; } &
    { [event_message_discuss in EventName.Message.Discuss]: OptionsFormat.Message.Discuss; } & {
        "message": OptionsFormat.Message
    }

const default_options: Partial<Options> = {
    "message": {
        quote: false,
        include: {
            private: undefined,
            group: undefined,
            group_member: undefined,
            discuss: undefined,
            discuss_member: undefined
        },
        exclude: {
            private: undefined,
            group: undefined,
            group_member: undefined,
            discuss: undefined,
            discuss_member: undefined
        }
    },
    "message.discuss": {
        quote: false,
        include: {
            discuss: undefined,
            discuss_member: undefined
        },
        exclude: {
            discuss: undefined,
            discuss_member: undefined
        }
    },
    "message.group": {
        quote: false,
        include: {
            group: undefined,
            group_member: undefined
        },
        exclude: {
            group: undefined,
            group_member: undefined
        }
    },
    "message.group.anonymous": {
        quote: false,
        include: {
            group: undefined,
            group_member: undefined
        },
        exclude: {
            group: undefined,
            group_member: undefined
        }
    },
    "message.group.normal": {
        quote: false,
        include: {
            group: undefined,
            group_member: undefined
        },
        exclude: {
            group: undefined,
            group_member: undefined
        }
    },
    "message.private": {
        quote: false,
        include: {
            private: undefined
        },
        exclude: {
            private: undefined
        }
    },
    "message.private.friend": {
        quote: false,
        include: {
            private: undefined
        },
        exclude: {
            private: undefined
        }
    },
    "message.private.group": {
        quote: false,
        include: {
            private: undefined
        },
        exclude: {
            private: undefined
        }
    },
    "message.private.other": {
        quote: false,
        include: {
            private: undefined
        },
        exclude: {
            private: undefined
        }
    },
    "message.private.self": {
        quote: false,
        include: {
            private: undefined
        },
        exclude: {
            private: undefined
        }
    },
}