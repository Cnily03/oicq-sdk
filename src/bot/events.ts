import * as oicq from "oicq";
export * from "./message";

/** 事件入口函数 */
export type EventEntry<T, S extends keyof oicq.EventMap> = (this: T, event: Parameters<oicq.EventMap<oicq.Client>[S]>[0]) => boolean;
/** 事件回应函数 */
export type EventResponse<T, S extends keyof oicq.EventMap> = (this: T, event: Parameters<oicq.EventMap<oicq.Client>[S]>[0], quote?: boolean) => void;

/** 消息事件入口函数或字符串 */
export type MessageEntry<T, S extends keyof oicq.EventMap> = EventEntry<T, S> | oicq.Sendable;
/** 消息事件回应函数或字符串 */
export type MessageResponse<T, S extends keyof oicq.EventMap> = EventResponse<T, S> | oicq.Sendable;