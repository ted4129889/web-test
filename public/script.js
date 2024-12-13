const API_BASE_URL = 'http://localhost:3000/api';
const TITA_ENDPOINT = `${API_BASE_URL}/tita`;
const DIRS_ENDPOINT = `${API_BASE_URL}/dirs`;
const FILES_ENDPOINT = `${API_BASE_URL}/files`;
const SAVE_AS_ENDPOINT = `${API_BASE_URL}/saveas`;
const TEST_ENDPOINT = `${API_BASE_URL}/test`;

let titaLayoutJson = {};

const titaStringInput = document.getElementById('titaString');

// 保存原始值
let originalValue = titaStringInput.value;

// 針對 "貼上" 事件
titaStringInput.addEventListener('paste', (event) => {
    event.preventDefault(); // 阻止默認的貼上行為
    const paste = (event.clipboardData || window.clipboardData).getData('text'); // 獲取貼上的值
    titaStringInput.value = paste; // 將貼上的值設置到輸入框
    titaStringToTitaJson(); // 調用轉換函數
    originalValue = paste; // 儲存貼上的值
    titaStringInput.blur(); // 失去焦點
});

// 針對 "按下Enter" 和 "按下Tab" 事件
titaStringInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
        titaStringToTitaJson();
        originalValue = titaStringInput.value;
        titaStringInput.blur();
    } else if (event.key === 'Escape') {
        // 恢復原始值並清除變更
        titaStringInput.value = originalValue;
        titaStringInput.blur();
    }
});

// 針對 "失去焦點" 事件
titaStringInput.addEventListener('blur', titaStringToTitaJson);

// 在輸入框獲得焦點時更新原始值
titaStringInput.addEventListener('focus', () => {
    originalValue = titaStringInput.value;
});

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        saveFile();
    }
});

document.getElementById('titaJsonContainer').addEventListener('input', function (event) {
    const target = event.target;
    if (target.tagName === 'INPUT' && target.dataset.labelOrText && target.dataset.key) {
        const labelOrText = target.dataset.labelOrText;
        const key = target.dataset.key;
        if (labelOrText === 'LABEL') {
            titaLayoutJson.LABEL[key].VALUE = target.value;
        } else if (labelOrText === 'TEXT') {
            titaLayoutJson.TEXT[key].VALUE = target.value;
        }
    }
});

/**
 * 當 titaString 元素的值改變時，觸發的函數。
 */
async function titaStringToTitaJson() {
    console.log(`titaStringToTitaJson`);
    const titaString = document.getElementById('titaString').value;
    document.getElementById('titaString').value = titaString;
    stringToJsonParser(titaString);
    renderTitaJsonForm(); // 使用表單呈現 JSON
}

function getTitaLayoutName() {
    console.log(`getTitaLayoutName`);
    const fileContent = document.getElementById('request').value;
    const requsetJsonObj = JSON.parse(fileContent);
    let titaLayoutName = requsetJsonObj.payload?.pyheader?.tx_code; // 使用可選鏈式調用
    titaLayoutName += '.json';
    return titaLayoutName;
}

function renderTitaJsonForm() {
    console.log(`renderTitaJsonForm`);
    showLoading();

    // 使用 setTimeout 確保 Loading 畫面顯示後再進行 DOM 操作
    setTimeout(async () => {
        const titaJsonContainer = document.getElementById('titaJsonContainer');
        titaJsonContainer.innerHTML = ''; // 清空容器
        const form = document.createElement('form');
        form.classList.add('tita-form'); // 添加樣式類

        const fragment = document.createDocumentFragment(); // 创建文档片段

        createLabel(fragment);
        createText(fragment);

        form.appendChild(fragment); // 一次性添加所有元素到表单
        titaJsonContainer.appendChild(form);

        hideLoading();
    }, 0);

}

function createLabel(fragment) {
    console.log(`createLabel`);
    for (const key in titaLayoutJson.LABEL) {
        if (titaLayoutJson.LABEL.hasOwnProperty(key) && key !== 'LABEL_TYPE') {
            const item = titaLayoutJson.LABEL[key];
            const desc = item.DESC ? item.DESC : ' ';
            const inputWrapper = createInput(
                `${key} ${desc} ${item.TYPE}`,
                item.VALUE,
                item.TYPE
            );
            const input = inputWrapper.querySelector('input'); // 获取 input 元素
            input.dataset.labelOrText = 'LABEL'; // 使用 data-* 属性设置
            input.dataset.key = key; // 保存 key 值
            // form.appendChild(inputWrapper);
            fragment.appendChild(inputWrapper); // 添加到文档片段
        }
    }
}
function createText(fragment) {
    console.log(`createText`);
    for (const key in titaLayoutJson.TEXT) {
        if (titaLayoutJson.TEXT.hasOwnProperty(key)) {
            const item = titaLayoutJson.TEXT[key];
            const desc = item.DESC ? item.DESC : ' ';
            const inputWrapper = createInput(
                `${key} ${desc} ${item.TYPE}`,
                item.VALUE,
                item.TYPE
            );
            const input = inputWrapper.querySelector('input'); // 获取 input 元素
            input.dataset.labelOrText = 'TEXT'; // 使用 data-* 属性设置
            input.dataset.key = key; // 保存 key 值
            // form.appendChild(inputWrapper);
            fragment.appendChild(inputWrapper); // 添加到文档片段
        }
    }
}

function createInput(labelText, value, type) {
    console.log(`createInput`);
    const div = document.createElement('div');
    div.className = 'input-wrapper';

    const label = document.createElement('label');
    label.innerHTML = labelText;

    const input = document.createElement('input');
    input.value = value;

    // 設置最大輸入長度
    const maxLength = getMaxLengthFromType(type);
    input.maxLength = maxLength;

    // 設置型態
    const charType = getCharType(type);

    // 檢核訊息
    const errorMessage = document.createElement('span');
    errorMessage.className = 'error-message';
    errorMessage.style.visibility = 'hidden';

    if (charType == 'X') {
        // input 可以輸入任意字符（包括中文、符號、全形符號）
        input.removeAttribute('pattern'); // 移除任何 pattern 限制
    } else if (charType == '9') {
        // 設置僅允許數字和小數點的正則表達式
        input.setAttribute('pattern', '[0-9.]*'); // 設置正則表達式僅允許數字和小數點
        input.addEventListener('input', debounce((e) => {
            const matchNotNumber = e.target.value.match(/[^\d.]/g);
            const multipleDots = (e.target.value.match(/\./g) || []).length > 1;
            if (matchNotNumber || multipleDots) {
                errorMessage.textContent = '請輸入數值';
                errorMessage.style.visibility = 'visible';
            } else {
                errorMessage.style.visibility = 'hidden';
            }
            e.target.value = e.target.value.replace(/[^\d.]/g, ''); // 移除非數字字符和多餘的小數點
            if (multipleDots) {
                e.target.value = e.target.value.substring(0, e.target.value.lastIndexOf('.')); // 移除多餘的小數點
            }
        }, 300));
    }

    div.appendChild(label);
    div.appendChild(input);
    div.appendChild(errorMessage);

    return div;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 從 item.TYPE 中提取最大長度
function getMaxLengthFromType(type) {
    const matchInt = type.match(/\((\d+)(?:\.\d+)?\)/);
    const matchDecimal = type.match(/\(\d+(?:\.(\d+))?\)/);
    let maxLen = 0;
    if (matchInt) {
        maxLen += parseInt(matchInt[1], 10);
    }
    if (matchDecimal?.[1]) {
        maxLen++; // 留長度給小數點
        maxLen += parseInt(matchDecimal[1], 10);
    }
    return maxLen > 0 ? maxLen : 255; // 默認最大長度為 255
}

/**
 * 將 Base64 編碼的 TITA 字串解析為 JSON 格式，並顯示在 titaLayoutJson 區域。
 */
async function requestToTita() {
    console.log(`requestToTita`);
    const requestToTitaBtn = document.getElementById('requestToTitaBtn');
    requestToTitaBtn.disabled = true; // 停用按鈕
    const fileContent = document.getElementById('request').value;
    const requsetJsonObj = JSON.parse(fileContent);
    const encodeBase64Data = requsetJsonObj.payload?.data; // 使用可選鏈式調用
    const decodeBase64Data = decodeFromBase64(encodeBase64Data);

    let titaLayoutName = requsetJsonObj.payload?.pyheader?.tx_code; // 使用可選鏈式調用
    titaLayoutName += '.json';
    try {
        const response = await fetch(`${TITA_ENDPOINT}/${titaLayoutName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        titaLayoutJson = await response.json();
    } catch (error) {
        console.error('Error loading file:', error);
    } finally {
        requestToTitaBtn.disabled = false; // 重新啟用按鈕
    }
    document.getElementById('titaString').value = decodeBase64Data;
    stringToJsonParser(decodeBase64Data);
    renderTitaJsonForm();
}

/**
 * 解析 TITA 格式的字串為 JSON 格式。
 * @param {object} layout - TITA 布局。
 * @param {string} string - 要解析的字符串。
 * @returns {object} 解析後的 JSON 對象。
 */
function stringToJsonParser(string) {
    console.log(`stringToJsonParser`);
    let substringStartAt = 0;
    let substringEndAt = 0;
    const label = titaLayoutJson.LABEL;
    const text = titaLayoutJson.TEXT;
    for (const key in label) {
        if (label.hasOwnProperty(key)) {
            if (key === 'LABEL_TYPE') {
                continue;
            }
            const item = label[key];
            const type = item.TYPE;
            const charType = getCharType(type);
            const len = getLen(type);
            const decimal = getDecimal(type);
            substringStartAt = substringEndAt;
            item.VALUE = cutString(string, charType, len, decimal, substringStartAt);
            substringEndAt += Number(len);
            substringEndAt += Number(decimal);
        }
    }
    for (const key in text) {
        if (text.hasOwnProperty(key)) {
            const item = text[key];
            const type = item.TYPE;
            const charType = getCharType(type);
            const len = getLen(type);
            const decimal = getDecimal(type);
            substringStartAt = substringEndAt;
            item.VALUE = cutString(string, charType, len, decimal, substringStartAt);
            substringEndAt += Number(len);
            substringEndAt += Number(decimal);
        }
    }
}

/**
 * 獲取字符串的實際長度（考慮全角字符）。
 * @param {string} str - 要測量的字符串。
 * @returns {number} 字符串的實際長度。
 */
function getActualLength(str) {
    let actualLength = 0;
    for (let char of str) {
        if (char.charCodeAt(0) > 255) {
            actualLength += 2;
        } else {
            actualLength += 1;
        }
    }
    return actualLength;
}

/**
 * 根據 charType 切割字串。
 * @param {string} string - 要切割的字串。
 * @param {string} charType - 字符類型 ('X' 或 '9')。
 * @param {number} len - 長度。
 * @param {number} decimal - 小數位數。
 * @param {number} substringStartAt - 開始切割的索引。
 * @returns {string} 切割後的字串。
 */
function cutString(string, charType, len, decimal, substringStartAt) {
    let extracted = extractSubstring(string, substringStartAt, len + decimal);
    if (charType === '9') {
        if (decimal > 0) {
            const integerPart = extractSubstring(extracted, 0, len);
            const integerLength = getActualLength(integerPart);
            const decimalPart = extractSubstring(extracted, integerLength, decimal);
            return `${integerPart}.${decimalPart}`;
        } else {
            return extracted;
        }
    } else if (charType === 'X') {
        extracted = padEndCustom(extracted, len, ' ');
        return extracted;
    } else {
        throw new Error(`Invalid charType: ${charType}`);
    }
}

/**
 * 提取指定長度的子字符串。
 * @param {string} str - 要提取的字符串。
 * @param {number} startAt - 開始索引。
 * @param {number} length - 提取長度。
 * @returns {string} 提取後的子字符串。
 */
function extractSubstring(str, startAt, length) {
    if (!str) return '';
    let realStartAt = 0;
    let realIndex = 0;
    if (realIndex < startAt) {
        for (let char of str) {
            realStartAt += char.charCodeAt(0) > 255 ? 2 : 1;
            realIndex++; // 每個character算1
            if (realStartAt == startAt) {
                break;
            }
        }
    }
    let actualLength = 0;
    let endIndex = realIndex;
    while (actualLength < length && endIndex < str.length) {
        if (str.charCodeAt(endIndex) > 255) {
            actualLength += 2;
        } else {
            actualLength += 1;
        }
        endIndex++;
    }
    return str.substring(realIndex, endIndex);
}

/**
 * 獲取字元類型。
 */
function getCharType(type) {
    const match = /^([X9])\(\d+(\.\d+)?\)$/.exec(type); // 使用 RegExp.exec()
    if (!match) {
        throw new Error(`Invalid type format: ${type}`);
    }
    return match[1];
}

/**
 * 獲取長度。
 */
function getLen(type) {
    const match = /^([X9])\((\d+(\.\d+)?)\)$/.exec(type); // 使用 RegExp.exec()
    if (!match) {
        throw new Error(`Invalid type format: ${type}`);
    }
    const [, charType, number] = match;
    const [integerPart, decimalPart] = number.split('.').map(Number);
    if (charType === 'X' && decimalPart) {
        throw new Error(`Invalid type format for X: ${type} - X cannot have decimal places.`);
    }
    return integerPart;
}

/**
 * 獲取小數位數。
 */
function getDecimal(type) {
    const match = /^([X9])\((\d+(\.\d+)?)\)$/.exec(type); // 使用 RegExp.exec()
    if (!match) {
        throw new Error(`Invalid type format: ${type}`);
    }
    const [, charType, number] = match;
    const [, decimalPart] = number.split('.').map(Number);
    if (charType === 'X') {
        return 0;
    }
    return decimalPart ? Number(decimalPart) : 0;
}
/**
 * 將 JSON 轉換為 Base64 編碼的字串，並顯示在 request 區域。
 */
async function titaToRequest() {
    console.log(`titaToRequest`);
    showLoading();
    // 使用 setTimeout 確保 Loading 畫面顯示後再進行 DOM 操作
    setTimeout(async () => {
        const titaToRequestBtn = document.getElementById('titaToRequestBtn');
        titaToRequestBtn.disabled = true; // 停用按鈕

        const form = document.querySelector('#titaJsonContainer form');
        titaLayoutJson = {}; // 初始化一個新的 titaLayoutJson 對象

        // getTitaLayout
        let titaLayoutName = getTitaLayoutName();

        try {
            const response = await fetch(`${TITA_ENDPOINT}/${titaLayoutName}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            titaLayoutJson = await response.json();
        } catch (error) {
            console.error('Error loading file:', error);
        }

        // 將表單值同步回 titaLayoutJson
        for (const input of form.querySelectorAll('input')) {
            const [key,] = input.previousSibling.textContent.split(' ');
            const labelOrText = input.dataset.labelOrText;; // 使用 data-* 属性获取
            const value = input.value;
            if (labelOrText === 'LABEL' && titaLayoutJson.LABEL[key]) {
                titaLayoutJson.LABEL[key].VALUE = value;
            } else if (labelOrText === 'TEXT' && titaLayoutJson.TEXT[key]) {
                titaLayoutJson.TEXT[key].VALUE = value;
            }
        }

        const titaString = jsonToStringParser();
        // console.log(`titaString`);
        document.getElementById('titaString').value = titaString;
        const encodeBase64Data = encodeToBase64(titaString);

        const fileContent = document.getElementById('request').value;
        const requsetJsonObj = JSON.parse(fileContent);
        requsetJsonObj.payload.data = encodeBase64Data;
        // console.log(`encodeBase64Data=${encodeBase64Data}`);
        document.getElementById('request').value = JSON.stringify(requsetJsonObj, null, 2);
        titaToRequestBtn.disabled = false; // 重新啟用按鈕
        hideLoading();
    }, 0);
}


/**
 * 將 JSON 解析為 TITA 格式的字串。
 */
function jsonToStringParser() {
    console.log(`jsonToStringParser`);

    let string = "";

    const label = titaLayoutJson.LABEL;
    const text = titaLayoutJson.TEXT;
    // console.log('遍歷 LABEL 屬性:');
    for (const key in label) {
        if (label.hasOwnProperty(key)) {
            if (key === 'LABEL_TYPE') {
                continue;
            }
            const item = label[key];
            // console.log(`LABEL ${key} ${item.TYPE}`);
            const type = item.TYPE;
            const charType = getCharType(type);
            const len = getLen(type);
            const decimal = getDecimal(type);
            string += padString(charType, len, decimal, item.VALUE);
            // console.log(`string = ${string}`);
        }
    }
    // console.log('遍歷 TEXT 屬性:');
    for (const key in text) {
        if (text.hasOwnProperty(key)) {
            const item = text[key];
            // console.log(`TEXT ${key} ${item.TYPE}`);
            const type = item.TYPE;
            const charType = getCharType(type);
            const len = getLen(type);
            const decimal = getDecimal(type);
            string += padString(charType, len, decimal, item.VALUE);
            // console.log(`string = ${string}`);
        }
    }
    return string;
}


/**
 * 填充字符串到指定長度。
 * @param {string} charType - 字符類型 ('X' 或 '9')。
 * @param {number} len - 長度。
 * @param {number} decimal - 小數位數。
 * @param {string} value - 要填充的值。
 * @returns {string} 填充後的字符串。
 */
function padString(charType, len, decimal, value) {
    let paddedString = "";
    if (charType === 'X') {
        const extractedValue = extractSubstring(value, 0, len);
        paddedString = padEndCustom(extractedValue, len, ' ');
    } else if (charType === '9') {
        let [integerPart, decimalPart] = value.split('.');
        integerPart = extractSubstring(integerPart, 0, len);
        if (integerPart.length > len) {
            integerPart = integerPart.substring(0, len);
        } else {
            integerPart = padStartCustom(integerPart, len, '0');
        }
        if (decimalPart && decimalPart.length > decimal) {
            decimalPart = decimalPart.substring(0, decimal);
        } else {
            decimalPart = padEndCustom(decimalPart || '', decimal, '0');
        }
        paddedString = integerPart + decimalPart;
    } else {
        throw new Error(`Invalid charType: ${charType}`);
    }
    return paddedString;
}

/**
 * 填充字符串到指定長度，處理全角和半角字符。
 * @param {string} str - 要填充的字符串。
 * @param {number} targetLength - 目標長度。
 * @param {string} padString - 填充字符。
 * @returns {string} 填充後的字符串。
 */
function padEndCustom(str, targetLength, padString) {
    let actualLength = 0;
    for (let char of str) {
        actualLength += char.charCodeAt(0) > 255 ? 2 : 1;
    }
    while (actualLength < targetLength) {
        str += padString;
        actualLength += padString.charCodeAt(0) > 255 ? 2 : 1;
    }
    return str;
}

/**
 * 填充字符串到指定長度，處理全角和半角字符。
 * @param {string} str - 要填充的字符串。
 * @param {number} targetLength - 目標長度。
 * @param {string} padString - 填充字符。
 * @returns {string} 填充後的字符串。
 */
function padStartCustom(str, targetLength, padString) {
    let actualLength = 0;
    for (let char of str) {
        actualLength += char.charCodeAt(0) > 255 ? 2 : 1;
    }

    while (actualLength < targetLength) {
        str = padString + str;
        actualLength += padString.charCodeAt(0) > 255 ? 2 : 1;
    }

    return str;
}

/**
 * 載入目錄列表並顯示在選擇器中。
 */
async function loadDirs() {
    console.log(`loadDirs`);
    try {
        const response = await fetch(`${DIRS_ENDPOINT}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dirs = await response.json();
        const select = document.getElementById('dir-select');
        select.innerHTML = dirs.map(dir => `<option value="${dir}">${dir}</option>`).join('');
        select.onchange = loadFiles;
        if (dirs.length > 0) {
            select.value = dirs[0];
            await loadFiles();
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

/**
 * 載入檔案列表並顯示在選擇器中。
 */
async function loadFiles() {
    console.log(`loadFiles`);
    const dirname = document.getElementById('dir-select').value;
    try {
        const response = await fetch(`${DIRS_ENDPOINT}/${dirname}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const files = await response.json();
        const select = document.getElementById('file-select');
        select.innerHTML = files.map(file => `<option value="${file}">${file}</option>`).join('');
        select.onchange = loadSelectedFile;
        if (files.length > 0) {
            select.value = files[0];
            await loadSelectedFile();
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

/**
 * 載入選擇的檔案並顯示其內容。
 */
async function loadSelectedFile() {
    console.log(`loadSelectedFile`);
    const dirname = document.getElementById('dir-select').value;
    const filename = document.getElementById('file-select').value;
    try {
        const response = await fetch(`${FILES_ENDPOINT}/${dirname}/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fileContent = await response.json();
        document.getElementById('request').value = JSON.stringify(fileContent, null, 2);
        await requestToTita();
    } catch (error) {
        console.error('Error loading file:', error);
    }
}

/**
 * 儲存當前檔案。
 */
async function saveFile() {
    console.log(`saveFile`);
    const saveFileBtn = document.getElementById('saveFileBtn');
    saveFileBtn.disabled = true; // 停用按鈕
    const dirname = document.getElementById('dir-select').value;
    const filename = document.getElementById('file-select').value;
    const requestText = document.getElementById('request').value;
    try {
        const requestPayload = JSON.parse(requestText);
        const response = await fetch(`${FILES_ENDPOINT}/${dirname}/${filename}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert('File saved successfully');
    } catch (error) {
        console.error('Error saving file:', error);
        alert(`Error saving file: ${error.message}`);
    } finally {
        saveFileBtn.disabled = false; // 重新啟用按鈕
    }
}

/**
 * 另存新檔並重新載入檔案列表。
 */
async function saveAsNewFile() {
    console.log(`saveAsNewFile`);
    const saveAsNewFileBtn = document.getElementById('saveAsNewFileBtn');
    saveAsNewFileBtn.disabled = true; // 停用按鈕
    let newFilename = prompt("Enter new filename (with .json extension):");
    if (newFilename === null) {
        saveAsNewFileBtn.disabled = false; // 重新啟用按鈕
        return;
    }
    if (!newFilename.trim()) {
        alert("必須輸入檔名!");
        saveAsNewFileBtn.disabled = false; // 重新啟用按鈕
        return;
    }
    if (!newFilename.toLowerCase().endsWith('.json')) {
        newFilename += '.json';
    }
    const dirname = document.getElementById('dir-select').value;
    const requestText = document.getElementById('request').value;
    try {
        const requestPayload = JSON.parse(requestText);
        const response = await fetch(`${SAVE_AS_ENDPOINT}/${dirname}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: newFilename, content: requestPayload })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert(`New file ${newFilename} saved successfully `);
        await loadFiles();
        document.getElementById('file-select').value = newFilename;
        await loadSelectedFile();
    } catch (error) {
        console.error('Error saving new file:', error);
        alert(`Error saving new file: ${error.message}`);
    } finally {
        saveAsNewFileBtn.disabled = false; // 重新啟用按鈕
    }
}
/**
 * 格式化回應數據。
 * @param {Object} responseData - 回應數據。
 * @returns {Object} 格式化後的回應數據。
 */
function formatResponse(responseData) {
    console.log(`formatResponse`);
    const decoder = new TextDecoder();

    for (const key in responseData.payload) {
        if (responseData.payload.hasOwnProperty(key)) {
            const dataItem = responseData.payload[key].data;
            if (dataItem && Array.isArray(dataItem.data)) {
                responseData.payload[key].data = decoder.decode(new Uint8Array(dataItem.data));
            }
        }
    }
    return responseData;
}

/**
 * 發送請求並顯示回應。
 */
async function sendRequest() {
    console.log(`sendRequest`);
    showLoading();
    // 使用 setTimeout 確保 Loading 畫面顯示後再進行 DOM 操作
    setTimeout(async () => {
        const sendButton = document.getElementById('sendRequestBtn');
        sendButton.disabled = true; // 停用按鈕
        document.getElementById('response').value = ''; // 清空回應區域
        const requestText = document.getElementById('request').value;
        try {
            const requestPayload = JSON.parse(requestText);
            const response = await fetch(TEST_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let responseData = await response.json();
            responseData = formatResponse(responseData);
            // console.log(responseData);
            document.getElementById('response').value = JSON.stringify(responseData, null, 2);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('response').value = `Error: ${error.message}`;
        } finally {
            sendButton.disabled = false; // 重新啟用按鈕
        }
        hideLoading();
    }, 0);
}

/**
 * 將普通文字編碼為 Base64。
 * @param {string} plainText - 要編碼的普通文字。
 * @returns {string} Base64 編碼的文字。
 */
function encodeToBase64(plainText) {
    console.log(`encodeToBase64`);
    const encoder = new TextEncoder();
    const byteArray = encoder.encode(plainText);
    return btoa(String.fromCharCode(...byteArray));
}

/**
 * 將 Base64 編碼的文字解碼為普通文字。
 * @param {string} encodedText - 要解碼的 Base64 文字。
 * @returns {string} 解碼後的普通文字。
 */
function decodeFromBase64(encodedText) {
    console.log(`decodeFromBase64`);
    let decodedText = "";
    try {
        const byteArray = Uint8Array.from(atob(encodedText), char => char.charCodeAt(0));
        const decoder = new TextDecoder();
        decodedText = decoder.decode(byteArray);
    } catch (e) {
        alert('解碼失敗，請確認你的輸入是否為有效的Base64編碼。');
    }
    return decodedText;
}

/**
 * 頁面載入時初始化。
 */
function onLoad() {
    console.log(`onLoad`);
    loadDirs();
}
window.onload = onLoad;

function showLoading() {
    console.log(`showLoading`);
    document.getElementById("load").style.display = "flex";
}

function hideLoading() {
    console.log(`hideLoading`);
    document.getElementById("load").style.display = "none";
}