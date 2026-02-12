/**
 * Google Apps Script 範本 - 請貼上到您的 Google Apps Script 專案並部署為 Web App
 * 
 * 設定步驟：
 * 1. 打開一個 Google 試算表
 * 2. 點擊「擴充功能」->「Apps Script」
 * 3. 貼上以下程式碼並儲存
 * 4. 點擊「部署」->「新部署」，類型選「網頁應用程式」
 * 5. 誰可以存取選「任何人」
 * 6. 複製產生的網頁應用程式網址，貼回本網頁的設定頁面
 */

const SECRET_TOKEN = "YOUR_TOKEN_HERE"; // 可在網頁設定中對應填寫

function doPost(e) {
  const contents = JSON.parse(e.postData.contents);
  const { action, token, data } = contents;

  if (SECRET_TOKEN && token !== SECRET_TOKEN) {
    return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "export") {
    // 儲存原始 JSON 到一個隱藏工作表或指定位置
    let sheet = ss.getSheetByName("RAW_DATA");
    if (!sheet) sheet = ss.insertSheet("RAW_DATA");
    sheet.getRange("A1").setValue(JSON.stringify(data));
    
    // 你也可以在這裡撰寫邏輯將資料攤平到各個工作表 (Teams, Matches)
    // ...
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;

  if (SECRET_TOKEN && token !== SECRET_TOKEN) {
    return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "import") {
    const sheet = ss.getSheetByName("RAW_DATA");
    if (sheet) {
      const val = sheet.getRange("A1").getValue();
      return ContentService.createTextOutput(val).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput("{}").setMimeType(ContentService.MimeType.JSON);
  }
}
