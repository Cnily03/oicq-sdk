import * as crypto from "crypto";

// AES加密解密
const DEFAULT_AES_ALGORITHM: string = "aes-128-cbc";

export const base64 = {
    encode: function (str: string): string {
        const code: string = Buffer.from(str, 'utf-8').toString('base64');
        return code;
    },
    decode: function (str: string): string {
        const code: string = Buffer.from(str, 'base64').toString('utf-8');
        return code;
    }
}

export const aes = {
    encode: function (str: string, aesKey: string, aesIv: string = aesKey,
        algorithm: string = DEFAULT_AES_ALGORITHM): string {
        const key: crypto.CipherKey = Buffer.from(aesKey, "utf8");
        const iv: crypto.BinaryLike = Buffer.from(aesIv, "utf8");
        var cipher: crypto.Cipher = crypto.createCipheriv(algorithm, key, iv);
        var code: string = cipher.update(str, "utf8", "hex");
        code += cipher.final("hex");
        return code;
    },
    decode: function (str: string, aesKey: string, aesIv: string = aesKey,
        algorithm: string = DEFAULT_AES_ALGORITHM) {
        const key: crypto.CipherKey = Buffer.from(aesKey, "utf8");
        const iv: crypto.BinaryLike = Buffer.from(aesIv, "utf8");
        var cipher: crypto.Cipher = crypto.createDecipheriv(algorithm, key, iv);
        var code: string = cipher.update(str, "hex", "utf8");
        code += cipher.final("utf8");
        return code;
    }
}

export const rsa = {
    encodeByPub: function (str: string, pubKey: crypto.RsaPublicKey): string {
        const buf: Buffer = crypto.publicEncrypt(pubKey, Buffer.from(str, "utf8"));
        return buf.toString("hex");
    },
    encodeByPte: function (str: string, pteKey: crypto.RsaPrivateKey): string {
        const buf: Buffer = crypto.privateEncrypt(pteKey, Buffer.from(str, "utf-8"));
        return buf.toString("hex");
    },
    decodeByPte: function (str: string, pteKey: crypto.RsaPrivateKey): string {
        const buf: Buffer = crypto.privateDecrypt(pteKey, Buffer.from(str, "hex"));
        return buf.toString("utf8");
    },
    decodeByPub: function (str: string, pubKey: crypto.RsaPrivateKey): string {
        const buf: Buffer = crypto.publicDecrypt(pubKey, Buffer.from(str, "hex"));
        return buf.toString("utf8");
    }
}

export function sha256(str: string): string {
    var sha256: crypto.Hash = crypto.createHash("sha256");
    var code: string = sha256.update(str).digest("hex");
    return code;
}

export function sha128(str: string): string {
    var sha128: crypto.Hash = crypto.createHash("sha128");
    var code: string = sha128.update(str).digest("hex");
    return code;
}


export function sha1(str: string): string {
    var sha1: crypto.Hash = crypto.createHash("sha1");
    var code: string = sha1.update(str).digest("hex");
    return code;
}

export function md5(str: string): string {
    var md5: crypto.Hash = crypto.createHash("md5");
    var code: string = md5.update(str).digest("hex");
    return code;
}