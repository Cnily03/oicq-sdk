import * as oicq from "oicq";

// Copied and edited from oicq.segment.fromCqcode
function unescapeCQ(s: string) {
    if (s === "&#91;") return "[";
    if (s === "&#93;") return "]";
    if (s === "&amp;") return "&";
    return "";
}

// Copied and edited from oicq.segment.fromCqcode
function unescapeCQInside(s: string) {
    if (s === "&#44;") return ",";
    if (s === "&#91;") return "[";
    if (s === "&#93;") return "]";
    if (s === "&amp;") return "&";
    return "";
}

// Copied and edited from oicq.segment.fromCqcode
function qs(s: string, sep = ",", equal = "=") {
    const ret: any = {}
    const split = s.split(sep)
    for (let v of split) {
        const i = v.indexOf(equal)
        if (i === -1) continue
        ret[v.substring(0, i)] = v.substring(i + 1).replace(/&#44;|&#91;|&#93;|&amp;/g, unescapeCQInside)
    }
    for (let k in ret) {
        try {
            if (k !== "text")
                ret[k] = JSON.parse(ret[k])
        } catch { }
    }
    return ret as oicq.MessageElem
}

// Copied and edited from oicq.segment.fromCqcode
function _cqToMessage(str: string): oicq.MessageElem[] {
    const elems: oicq.MessageElem[] = [];
    const res = str.matchAll(/\[CQ:[^\]]+\]/g);
    let prev_index = 0;
    for (let v of res) {
        const text = str.slice(prev_index, v.index).replace(/&#91;|&#93;|&amp;/g, unescapeCQ);
        if (text)
            elems.push({ type: "text", text });
        const element = v[0];
        let cq = element.replace("[CQ:", "type=");
        cq = cq.substring(0, cq.length - 1);
        elems.push(qs(cq));
        prev_index = v.index as number + element.length;
    }
    if (prev_index < str.length) {
        const text = str.slice(prev_index).replace(/&#91;|&#93;|&amp;/g, unescapeCQ);
        if (text)
            elems.push({ type: "text", text });
    }
    return elems;
}

/** 将可发送的消息类转化为`oicq.MessageElem[]` */
export function fromSendable(content: oicq.Sendable): oicq.MessageElem[] {
    if (!Array.isArray(content)) {
        // string | MessageElem
        if (typeof content == "string") return _cqToMessage(content);
        else return [content];
    } else {
        // (string | MessageElem)[]
        const elems: oicq.MessageElem[] = [];
        const result: oicq.MessageElem[] = [];
        for (let i = 0; i < content.length; i++) {
            const element = content[i];
            if (typeof element == "string") // cq:string => messageElem[]
                _cqToMessage(element).forEach(messageElem => {
                    elems.push(messageElem);
                })
            else elems.push(element);
        }
        // 合并连续的 text 类型
        result.push(elems[0]);
        function isTextElem(elem: oicq.MessageElem): elem is oicq.TextElem {
            return elem.type == "text";
        }
        for (let i = 1; i < elems.length; i++) {
            const cur_elem = elems[i];
            const cur_result = result[result.length - 1];
            if (isTextElem(cur_elem) && isTextElem(cur_result)) // 合并
                result[result.length - 1] = {
                    type: "text",
                    text: cur_result.text + cur_elem.text
                }
            else // 不合并
                result.push(cur_elem);
        }
        return result;
    }
}

/**
 * 比较两条消息的内容是否相同
 */
export function equals(arg1: oicq.Sendable, arg2: oicq.Sendable): boolean {
    return JSON.stringify(fromSendable(arg1)) == JSON.stringify(fromSendable(arg2));
}