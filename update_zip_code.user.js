// ==UserScript==
// @name            UpdateAmazonZipCode
// @description     根据当前打开的亚马逊站点无感自动输入对应邮编.
// @version         0.1.1
// @author          Karen
// @namespace       https://github.com/gopkg-dev/amazon_scripts
// @supportURL      https://github.com/gopkg-dev/amazon_scripts
// @updateURL       https://raw.githubusercontent.com/gopkg-dev/amazon_scripts/main/update_zip_code.user.js
// @downloadURL     https://raw.githubusercontent.com/gopkg-dev/amazon_scripts/main/update_zip_code.user.js
// @icon            data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" stroke-width="2" fill="none" stroke="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
// @license         GPL-2.0-only
// @match           https://*.amazon.*
// @run-at          document-idle
// @grant           unsafeWindow
// @run-at          document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Your code here...

    const ZIP_CODE_BY_DOMAIN = {
        'www.amazon.com': '10001',
        'www.amazon.ca': 'M5S 2E8',
        'www.amazon.com.mx': '64849',
        'www.amazon.com.br': '97980 000',
        'www.amazon.co.uk': 'WC1E 7HU',
        'www.amazon.de': '80539',
        'www.amazon.fr': '75007',
        'www.amazon.it': '20133',
        'www.amazon.es': '08007',
        'www.amazon.co.jp': '110-0007',
        'www.amazon.com.au': '2006',
        'www.amazon.in': '110016',
    };

    const getAddressSelections = async (domain, token) => {
        const queryMap = {
            selectedLocationType: '',
            selectedLocationValue: '',
            deviceType: 'mobile',
            pageType: 'gateway-phone-web',
            actionSource: 'mobile-web-subnav',
            storeContext: 'NoStoreName',
        };
        const query = Array.from(Object.entries(queryMap)).map(([key, value]) => { return key + '=' + value }).join('&')
        const response = await fetch('https://' + domain + '/portal-migration/hz/glow/get-rendered-address-selections?' + query, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'anti-csrftoken-a2z': token,
            }
        });
        return response.text();
    };

    const changeAddress = async (domain, zipCode, csrfToken) => {
        const body = {
            actionSource: 'glow',
            deviceType: 'mobileWeb',
            locationType: 'LOCATION_INPUT',
            pageType: 'gateway-phone-web',
            storeContext: 'NoStoreName',
            zipCode: zipCode + ''
        };
        await fetch('https://' + domain + '/portal-migration/hz/glow/address-change?actionSource=glow', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'anti-csrftoken-a2z': csrfToken,
                'x-requested-with': 'XMLHttpRequest'
            },
            body: JSON.stringify(body)
        });
    };

    const getLocationLabel = async (domain) => {
        const response = await fetch('https://' + domain + '/portal-migration/hz/glow/get-location-label?storeContext=NoStoreName&pageType=gateway-phone-web&actionSource=mobile-web-subnav', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    };

    const updateZipCode = async () => {

        const domain = window.location.hostname;
        const zipCode = ZIP_CODE_BY_DOMAIN[domain];

        if (!zipCode || !domain) throw new Error('No zip code found for domain: ' + domain);

        const locationLabelData = await getLocationLabel(domain);
        const customerIntentZipCode = locationLabelData.customerIntent.zipCode;

        if (customerIntentZipCode !== zipCode) {
            const tokenInputElem = document.querySelector('#glowValidationToken');
            if (!tokenInputElem) throw new Error('No token input element found on the page');

            const token = tokenInputElem.value.trim();
            if (!token) throw new Error('No token value found in the input field');

            const addressSelections = await getAddressSelections(domain, token);
            if (!addressSelections) throw new Error('Failed to retrieve address selections data');

            const csrfTokenMatch = addressSelections.match(/CSRF_TOKEN : "(.+?)"/g);
            if (!csrfTokenMatch || !csrfTokenMatch[0]) throw new Error('Unable to extract CSRF token from address selections data');

            const csrfToken = csrfTokenMatch[0].split(":")[1].replace(/(\"| )/g, "");
            await changeAddress(domain, zipCode, csrfToken);

            const updatedLocationLabelData = await getLocationLabel(domain);
            if (!updatedLocationLabelData) throw new Error('Failed to retrieve updated location label data');

            updateGlowIngressBlockElem(updatedLocationLabelData);

            console.log("update zip code success -> ", domain, updatedLocationLabelData.deliveryShortLine)
        } else {
            updateGlowIngressBlockElem(locationLabelData);
            console.log("update zip code success -> ", domain, locationLabelData.deliveryShortLine)
        }
    };

    const updateGlowIngressBlockElem = (data) => {

        console.log(data);

        const glowIngressBlockElem = document.getElementById('glow-ingress-block');
        if (glowIngressBlockElem) {
            const line1Elem = document.getElementById('glow-ingress-line1');
            if (line1Elem) {
                line1Elem.textContent = data.deliveryLine1.replace("&zwnj;", " ");
            }
            const line2Elem = document.getElementById('glow-ingress-line2');
            if (line2Elem) {
                line2Elem.textContent = data.deliveryLine2.replace("&zwnj;", " ");
            }
        }

        const glowIngressSingleElem = document.getElementById('glow-ingress-single-line');
        if (glowIngressSingleElem) {
            glowIngressSingleElem.textContent = data.deliveryShortLine.replace("&zwnj;", " ");
        }

        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'zipcode-updated-hidden-element';
        input.value = 'true';
        document.body.appendChild(input);
    };

    try {
        const rejectAllLink = document.querySelector("#sp-cc-rejectall-link");
        if (rejectAllLink) {
            rejectAllLink.click();
            console.log("click accpet cookies.");
        }
        const specAccept = document.querySelector("#sp-cc-accept");
        if (specAccept) {
            specAccept.click();
            console.log("click accpet cookies.");
        }
        updateZipCode();
    } catch (error) {
        console.error('An error occurred while updating the zip code:', error);
    }

})();