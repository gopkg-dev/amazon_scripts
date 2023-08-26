// ==UserScript==
// @name            AmazonHelper
// @description     根据当前打开的亚马逊站点无感自动输入对应邮编,自动输入验证码.
// @version         0.1.4
// @author          Karen
// @namespace       https://github.com/gopkg-dev/amazon_scripts
// @supportURL      https://github.com/gopkg-dev/amazon_scripts
// @updateURL       https://raw.githubusercontent.com/gopkg-dev/amazon_scripts/main/amazon.user.js
// @downloadURL     https://raw.githubusercontent.com/gopkg-dev/amazon_scripts/main/amazon.user.js
// @icon            data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" stroke-width="2" fill="none" stroke="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
// @license         GPL-2.0-only
// @match           https://*.amazon.*
// @run-at          document-end
// @grant           unsafeWindow
// @require         https://cdn.jsdelivr.net/gh/gopkg-dev/amazon_scripts@main/wasm_exec_tinygo.js
// ==/UserScript==

(function () {
    'use strict';

    // This is a polyfill for FireFox and Safari
    if (!WebAssembly.instantiateStreaming) {
        WebAssembly.instantiateStreaming = async (resp, importObject) => {
            const source = await (await resp).arrayBuffer()
            return await WebAssembly.instantiate(source, importObject)
        }
    }

    // Promise to load the wasm file
    function loadWasm(path) {
        const go = new Go();
        return new Promise((resolve, reject) => {
            fetch(path, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br'
                }
            })
                .then(response => WebAssembly.instantiateStreaming(response, go.importObject))
                .then(result => {
                    go.run(result.instance);
                    resolve(result.instance);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    // Load the wasm file
    loadWasm("https://cdn.jsdelivr.net/gh/gopkg-dev/amazon_scripts@main/amazoncaptchaV1.3.5.wasm").catch(console.error);

})();