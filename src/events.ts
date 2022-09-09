import * as oicq from "oicq";
import { Bot } from "./bot";

export interface EventMap<T = Bot> extends oicq.EventMap<T> {
};

/** 事件入口函数 */
export type EventEntry<T, S extends keyof EventMap<T>> = (this: T, event: Parameters<EventMap<T>[S]>[0]) => boolean;
/** 事件回应函数 */
export type EventResponse<T, S extends keyof EventMap<T>> = (this: T, event: Parameters<EventMap<T>[S]>[0]) => void;

/** 消息事件入口函数或字符串 */
export type MessageEntry<T, S extends keyof EventMap<T>> = EventEntry<T, S> | oicq.Sendable;
/** 消息事件回应函数或字符串 */
export type MessageResponse<T, S extends keyof EventMap<T>> = EventResponse<T, S> | oicq.Sendable;

/** 事件池 */
export type EventPool<T> = { event: keyof EventMap<T>, action: any }[];