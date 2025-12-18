
export function MD5(input: string) {
    input = utf8ToBinaryString(input);

    function utf8ToBinaryString(str: string) {
        const bytes = new TextEncoder().encode(str);
        let result = "";
        for (let i = 0; i < bytes.length; i++) {
            result += String.fromCharCode(bytes[i]);
        }
        return result;
    }

    function M(d) {
        let m = "0123456789ABCDEF";
        let f = "";
        for (let r = 0; r < d.length; r++) {
            let c = d.charCodeAt(r);
            f += m.charAt((c >>> 4) & 15) + m.charAt(c & 15);
        }
        return f;
    }

    function X(d) {
        let arr = Array(d.length >> 2).fill(0);
        for (let i = 0; i < 8 * d.length; i += 8) {
            arr[i >> 5] |= (255 & d.charCodeAt(i / 8)) << (i % 32);
        }
        return arr;
    }

    function V(d) {
        let out = "";
        for (let i = 0; i < 32 * d.length; i += 8) {
            out += String.fromCharCode((d[i >> 5] >>> (i % 32)) & 255);
        }
        return out;
    }

    function Y(d, len) {
        d[len >> 5] |= 128 << (len % 32);
        d[14 + ((len + 64 >>> 9) << 4)] = len;

        let a = 1732584193;
        let b = -271733879;
        let c = -1732584194;
        let d0 = 271733878;

        for (let i = 0; i < d.length; i += 16) {
            let aa = a;
            let bb = b;
            let cc = c;
            let dd = d0;

            // FF
            a = md5_ff(a, b, c, d0, d[i+0], 7, -680876936);
            d0 = md5_ff(d0, a, b, c, d[i+1], 12, -389564586);
            c = md5_ff(c, d0, a, b, d[i+2], 17, 606105819);
            b = md5_ff(b, c, d0, a, d[i+3], 22, -1044525330);

            a = md5_ff(a, b, c, d0, d[i+4], 7, -176418897);
            d0 = md5_ff(d0, a, b, c, d[i+5], 12, 1200080426);
            c = md5_ff(c, d0, a, b, d[i+6], 17, -1473231341);
            b = md5_ff(b, c, d0, a, d[i+7], 22, -45705983);

            a = md5_ff(a, b, c, d0, d[i+8], 7, 1770035416);
            d0 = md5_ff(d0, a, b, c, d[i+9], 12, -1958414417);
            c = md5_ff(c, d0, a, b, d[i+10], 17, -42063);
            b = md5_ff(b, c, d0, a, d[i+11], 22, -1990404162);

            a = md5_ff(a, b, c, d0, d[i+12], 7, 1804603682);
            d0 = md5_ff(d0, a, b, c, d[i+13], 12, -40341101);
            c = md5_ff(c, d0, a, b, d[i+14], 17, -1502002290);
            b = md5_ff(b, c, d0, a, d[i+15], 22, 1236535329);

            // GG
            a = md5_gg(a, b, c, d0, d[i+1], 5, -165796510);
            d0 = md5_gg(d0, a, b, c, d[i+6], 9, -1069501632);
            c = md5_gg(c, d0, a, b, d[i+11], 14, 643717713);
            b = md5_gg(b, c, d0, a, d[i+0], 20, -373897302);

            a = md5_gg(a, b, c, d0, d[i+5], 5, -701558691);
            d0 = md5_gg(d0, a, b, c, d[i+10], 9, 38016083);
            c = md5_gg(c, d0, a, b, d[i+15], 14, -660478335);
            b = md5_gg(b, c, d0, a, d[i+4], 20, -405537848);

            a = md5_gg(a, b, c, d0, d[i+9], 5, 568446438);
            d0 = md5_gg(d0, a, b, c, d[i+14], 9, -1019803690);
            c = md5_gg(c, d0, a, b, d[i+3], 14, -187363961);
            b = md5_gg(b, c, d0, a, d[i+8], 20, 1163531501);

            a = md5_gg(a, b, c, d0, d[i+13], 5, -1444681467);
            d0 = md5_gg(d0, a, b, c, d[i+2], 9, -51403784);
            c = md5_gg(c, d0, a, b, d[i+7], 14, 1735328473);
            b = md5_gg(b, c, d0, a, d[i+12], 20, -1926607734);

            // HH
            a = md5_hh(a, b, c, d0, d[i+5], 4, -378558);
            d0 = md5_hh(d0, a, b, c, d[i+8], 11, -2022574463);
            c = md5_hh(c, d0, a, b, d[i+11], 16, 1839030562);
            b = md5_hh(b, c, d0, a, d[i+14], 23, -35309556);

            a = md5_hh(a, b, c, d0, d[i+1], 4, -1530992060);
            d0 = md5_hh(d0, a, b, c, d[i+4], 11, 1272893353);
            c = md5_hh(c, d0, a, b, d[i+7], 16, -155497632);
            b = md5_hh(b, c, d0, a, d[i+10], 23, -1094730640);

            a = md5_hh(a, b, c, d0, d[i+13], 4, 681279174);
            d0 = md5_hh(d0, a, b, c, d[i+0], 11, -358537222);
            c = md5_hh(c, d0, a, b, d[i+3], 16, -722521979);
            b = md5_hh(b, c, d0, a, d[i+6], 23, 76029189);

            a = md5_hh(a, b, c, d0, d[i+9], 4, -640364487);
            d0 = md5_hh(d0, a, b, c, d[i+12], 11, -421815835);
            c = md5_hh(c, d0, a, b, d[i+15], 16, 530742520);
            b = md5_hh(b, c, d0, a, d[i+2], 23, -995338651);

            // II
            a = md5_ii(a, b, c, d0, d[i+0], 6, -198630844);
            d0 = md5_ii(d0, a, b, c, d[i+7], 10, 1126891415);
            c = md5_ii(c, d0, a, b, d[i+14], 15, -1416354905);
            b = md5_ii(b, c, d0, a, d[i+5], 21, -57434055);

            a = md5_ii(a, b, c, d0, d[i+12], 6, 1700485571);
            d0 = md5_ii(d0, a, b, c, d[i+3], 10, -1894986606);
            c = md5_ii(c, d0, a, b, d[i+10], 15, -1051523);
            b = md5_ii(b, c, d0, a, d[i+1], 21, -2054922799);

            a = md5_ii(a, b, c, d0, d[i+8], 6, 1873313359);
            d0 = md5_ii(d0, a, b, c, d[i+15], 10, -30611744);
            c = md5_ii(c, d0, a, b, d[i+6], 15, -1560198380);
            b = md5_ii(b, c, d0, a, d[i+13], 21, 1309151649);

            a = md5_ii(a, b, c, d0, d[i+4], 6, -145523070);
            d0 = md5_ii(d0, a, b, c, d[i+11], 10, -1120210379);
            c = md5_ii(c, d0, a, b, d[i+2], 15, 718787259);
            b = md5_ii(b, c, d0, a, d[i+9], 21, -343485551);

            a = safe_add(a, aa);
            b = safe_add(b, bb);
            c = safe_add(c, cc);
            d0 = safe_add(d0, dd);
        }

        return [a, b, c, d0];
    }

    function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }

    function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function safe_add(x, y) {
        let l = (x & 0xffff) + (y & 0xffff);
        return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff);
    }

    function bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    return M(V(Y(X(input), input.length * 8))).toLowerCase();
}
