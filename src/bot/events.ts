import * as oicq from "oicq";

export type EventEntry<T, S extends keyof oicq.EventMap> = (this: T, event: Parameters<oicq.EventMap<oicq.Client>[S]>[0]) => boolean;
export type EventResponse<T, S extends keyof oicq.EventMap> = (this: T, event: Parameters<oicq.EventMap<oicq.Client>[S]>[0], quote?: boolean) => void;