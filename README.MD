# 安裝

1. 安裝 Node.js

   請從官方網站下載並安裝 Node.js : [Node.js官網](https://nodejs.org/en)

2. 安裝插件，在專案目錄底下點兩下執行。

    ```sh
    install.bat
    ```

# 啟動

1. 啟動伺服器，在專案目錄底下點兩下執行。

    ```sh
    start.bat
    ```


2. 啟動你應該會在畫面中看到以下的輸出：

    ```sh
    Server is running on http://localhost:3000
    ```

3. 檢查運行結果
   
   打開你的瀏覽器，連線至 [http://localhost:3000](http://localhost:3000) 檢查服務器是否正確運行。

# 使用說明

1. 選擇請求的 JSON 文件: 選擇你要測試的交易電文。

2. 修改請求電文 `Request` 內容:
    - `tx_code`
    - `txcode_fmtid`

3. 轉成 TITA

    按下按鈕後會把 `Request` 的`data`轉成 `UTF8` ，放到 `TITA` 的欄位

4. 修改電文欄位的 `VALUE` 值

5. 轉成 REQUEST

    按下按鈕後會把 `TITA` 的轉成 `Base64` ，放到 `Request` 的 `data`

6. 儲存檔案或另存新檔

7. 發送請求

    按下按鈕後會把 `Request` 用 `gRPC` 的方式送到 `localhost:8081`
