/*******************************************************************************
 * mailArchiver_ATD LICENSE************************
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Claude Fauconnet claude.fauconnet@neuf.fr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ******************************************************************************/
var util = (function () {
    var self = {};
    var colSep = ",";
    var lineSep = "\n";
    var dataTable;
    var keyStr = "ABCDEFGHIJKLMNOP" +
        "QRSTUVWXYZabcdef" +
        "ghijklmnopqrstuv" +
        "wxyz0123456789+/" +
        "=";

    self.encode64 = function (input) {
        /**
         * Encode string into Base64, as defined by RFC 4648 [http://tools.ietf.org/html/rfc4648].
         * As per RFC 4648, no newlines are added.
         *
         * Characters in str must be within ISO-8859-1 with Unicode code point <= 256.
         *
         * Can be achieved JavaScript with btoa(), but this approach may be useful in other languages.
         *
         * @param {string} str ASCII/ISO-8859-1 string to be encoded as base-64.
         * @returns {string} Base64-encoded string.
         */

        if (/([^\u0000-\u00ff])/.test(str)) throw Error('String must be ASCII');

        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, bits, h1, h2, h3, h4, e = [], pad = '', c;

        c = str.length % 3;  // pad string to length of multiple of 3
        if (c > 0) {
            while (c++ < 3) {
                pad += '=';
                str += '\0';
            }
        }
        // note: doing padding here saves us doing special-case packing for trailing 1 or 2 chars

        for (c = 0; c < str.length; c += 3) {  // pack three octets into four hexets
            o1 = str.charCodeAt(c);
            o2 = str.charCodeAt(c + 1);
            o3 = str.charCodeAt(c + 2);

            bits = o1 << 16 | o2 << 8 | o3;

            h1 = bits >> 18 & 0x3f;
            h2 = bits >> 12 & 0x3f;
            h3 = bits >> 6 & 0x3f;
            h4 = bits & 0x3f;

            // use hextets to index into code string
            e[c / 3] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        }
        str = e.join('');  // use Array.join() for better performance than repeated string appends

        // replace 'A's from padded nulls with '='s
        str = str.slice(0, str.length - pad.length) + pad;

        return str;
    }

        ,
        self.decode64ToUTF8=function(str) {
            return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            }).join(''))
        }



    self.decode64 = function (str) {

            /**
             * Decode string from Base64, as defined by RFC 4648 [http://tools.ietf.org/html/rfc4648].
             * As per RFC 4648, newlines are not catered for.
             *
             * Can be achieved JavaScript with atob(), but this approach may be useful in other languages.
             *
             * @param {string} str Base64-encoded string.
             * @returns {string} Decoded ASCII/ISO-8859-1 string.
             */

            if (!(/^[a-z0-9+/]+={0,2}$/i.test(str)) || str.length % 4 != 0) throw Error('Not base64 string');

            var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var o1, o2, o3, h1, h2, h3, h4, bits, d = [];

            for (var c = 0; c < str.length; c += 4) {  // unpack four hexets into three octets
                h1 = b64.indexOf(str.charAt(c));
                h2 = b64.indexOf(str.charAt(c + 1));
                h3 = b64.indexOf(str.charAt(c + 2));
                h4 = b64.indexOf(str.charAt(c + 3));

                bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

                o1 = bits >>> 16 & 0xff;
                o2 = bits >>> 8 & 0xff;
                o3 = bits & 0xff;

                d[c / 4] = String.fromCharCode(o1, o2, o3);
                // check for padding
                if (h4 == 0x40) d[c / 4] = String.fromCharCode(o1, o2);
                if (h3 == 0x40) d[c / 4] = String.fromCharCode(o1);
            }
            str = d.join('');  // use Array.join() for better performance than repeated string appends

            return str;


        },

        self.countColSep = function (str, colSep) {
            var regex = new RegExp(colSep, "g")
            var match = str.match(regex);
            if (match)
                return match.length;
            return -1;
        }

    self.csv2json = function (csv, _colSep) {

        colSep = _colSep;
        var lines = csv.split(lineSep);
        var header = [];
        var headerSize;
        var objs = [];
        var obj = null;

        for (var i = 0; i < lines.length; i++) {
            var emptyCols = 0;
            lines[i] = lines[i].replace(/\r/g, "")
            var cols = lines[i].split(colSep);

            if (i == 0) {
                header = cols;

            } else {

                obj = {}
                for (var j = 0; j < cols.length; j++) {
                    var value = cols[j];
                    if (value)
                        value = value.trim();
                    if (cols[0] == "")
                        emptyCols += 1
                    value = common.convertNumStringToNumber(value);
                    obj[header[j]] = value;
                }
            }
            if (emptyCols > 0)// first col empty we stop
                break;
            if (cols.length != header.length) {
                return {error: "ERROR :line" + i + " has a wrong number of col separators :" + lines[i]}
            }
            if (obj)
                objs.push(obj);

        }
        return objs;


    }

    self.initDBsSelect = function (select, preffix) {
        if (false)
            return;
        var dbs = devisuProxy.getDBNames();
        var names = [];
        for (var i = 0; i < dbs.length; i++) {
            var name = dbs[i].name;
            if (!preffix || (preffix && name.indexOf(preffix) == 0))
                names.push(name);

        }
        common.fillSelectOptionsWithStringArray(select, names, true)
    }

    self.fillDataTable = function (header, dataSet, tableId) {
        $.fn.dataTable.ext.errMode = 'none';
        var columns = []
        for (var i = 0; i < header.length; i++) {
            columns.push({title: header[i]})
        }

        if (dataTable)
            dataTable.destroy();
        dataTable = $('#' + tableId).DataTable({
            data: dataSet,
            columns: columns,
            paging: true,
            searching: true

        });

        dataTable.columns.adjust().draw();
    }


    self.sortByField = function (data, field, desc) {
        var p = 1;
        if (desc)
            p = -1;
        var out = data.sort(function (a, b) {
            a = a[field];
            b = b[field];
            if (!a || !b)
                return 1;

            if (a > b)
                return 1 * p;
            if (a < b)
                return -1 * p;
            return 0;

        })
        return out;
    }


    self.find = function (data, field, value, firstValue, withoutIndexes) {
        var result = [];
        var indexes = []
        for (var i = 0; i < data.length; i++) {
            if (data[i][field] == value)
                if (firstValue) {
                    if (!withoutIndexes)
                        data[i].$findIndexes = [i];
                    return data[i];
                }
                else {
                    indexes.push(i);
                    result.push(data[i]);
                }

        }
        if (!withoutIndexes)
            result.$findIndexes = indexes;
        return result;
    }


    /**
     * Traverses a javascript object, and deletes all circular values
     * @param source object to remove circular references from
     * @param censoredMessage optional: what to put instead of censored values
     * @param censorTheseItems should be kept null, used in recursion
     * @returns {undefined}
     */
    self.preventCircularJson = function (source, censoredMessage, censorTheseItems) {
        //init recursive value if this is the first call
        censorTheseItems = censorTheseItems || [source];
        //default if none is specified
        censoredMessage = censoredMessage || "CIRCULAR_REFERENCE_REMOVED";
        //values that have allready apeared will be placed here:
        var recursiveItems = {};
        //initaite a censored clone to return back
        var ret = {};
        //traverse the object:
        for (var key in source) {
            var value = source[key]
            if (typeof value == "object") {
                //re-examine all complex children again later:
                recursiveItems[key] = value;
            } else {
                //simple values copied as is
                ret[key] = value;
            }
        }
        //create list of values to censor:
        var censorChildItems = [];
        for (var key in recursiveItems) {
            var value = source[key];
            //all complex child objects should not apear again in children:
            censorChildItems.push(value);
        }
        //censor all circular values
        for (var key in recursiveItems) {
            var value = source[key];
            var censored = false;
            censorTheseItems.forEach(function (item) {
                if (item === value) {
                    censored = true;
                }
            });
            if (censored) {
                //change circular values to this
                value = censoredMessage;
            } else {
                //recursion:
                value = self.preventCircularJson(value, censoredMessage, censorChildItems.concat(censorTheseItems));
            }
            ret[key] = value

        }

        return ret;
    }

    self.joinData = function (data1, key1, data2, key2, fields1, fields2, strict) {// if strict jointure ouverte
        if (!data1 || !data2)
            return null;
        var joinData = []
        for (var i = 0; i < data1.length; i++) {
            var obj1 = data1[i];
            var obj3 = {};
            for (var key in obj1) {
                obj3[key] = obj1[key];

            }

            var value = data1[i][key1];
            if (data1[i].id == 104) {
                var xx = "aaa"

            }
            var objs2 = self.find(data2, key2, value);
            if (objs2.length == 0 && !strict)
                joinData.push(obj3);
            else {

                for (var j = 0; j < objs2.length; j++) {
                    var obj2 = objs2[j];
                    for (var key in obj2) {// on n'écrase pas avec obj2 les champs existant das obj1

                        if (!obj3.key) {


                            obj3[key] = obj2[key];
                        }
                    }
                    joinData.push(obj3);

                }

            }

        }
        joinData.key = key2;
        return joinData;
    }

    self.convertHyperlinks = function (str) {
        if (common.isNumber(str))
            return str;

        var regex = /http.+?(?= )/g


        var array = str.match(regex);
        if (array) {
            for (var i = 0; i < array.length; i++) {
                str = str.replace(array[0], "<a  target='_blanck' href='" + array[0] + "'>" + array[0] + "</a>")
            }
        }


        return str;
    }

    self.getQueryParams = function (qs) {
        qs = qs.split("+").join(" ");
        var params = {}, tokens, re = /[?&]?([^=]+)=([^&]*)/g;
        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }
        return params;
    }
    self.removeDirRecursive=function (path) {


        var fs = require('fs');
        var recurse = function (path) {
            if (fs.existsSync(path)) {
                fs.readdirSync(path).forEach(function (file, index) {
                    var curPath = path + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                        recurse(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(path);
            }
        };
        recurse(path);
    }


    return self;
})();