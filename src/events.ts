import * as oicq from "oicq";
import { Bot } from "./bot";

/** 事件地图 */
export interface EventMap<T = Bot> extends oicq.EventMap<T> {
};

/** 事件入口函数 */
export type EventEntry<T, S extends keyof EventMap<T>> = (this: T, ...args: Parameters<EventMap<T>[S]>) => boolean;
/** 事件回应函数 */
export type EventResponse<T, S extends keyof EventMap<T>> = (this: T, ...args: Parameters<EventMap<T>[S]>) => void;

/** 消息事件入口函数或字符串 */
export type MessageEntry<T> = EventEntry<T, "message"> | oicq.Sendable;
/** 消息事件回应函数或字符串 */
export type MessageResponse<T> = EventResponse<T, "message"> | oicq.Sendable;

/** 单事件元素执行函数的This */
export interface ActionThis<T, S = any> {
    app: T
}
/** 单事件元素 */
export type EventElem<T, S extends keyof EventMap<T>, A = ActionThis<T, S>> = { hash: string, event: S, action: EventResponse<A, S> }
/** 事件池 */
export type EventPool<T, E = EventElem<T, keyof EventMap<T>>> = E[];