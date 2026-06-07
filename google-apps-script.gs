const SPREADSHEET_ID = "1EqkZXESlWdKzPfCg77cIXvYHLlktRUxGz9w2sk1NjiM";
const RAW_SHEET_NAME = "RawData";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_SHEET_NAME);
    const moments = payload.moments || [];
    const momentValue = (number) => {
      const item = moments.find((moment) => Number(moment.moment) === number);
      return item && item.handwash !== "ไม่ล้างมือ" ? 1 : 0;
    };
    const countByHandwash = (label) => moments.filter((moment) => moment.handwash === label).length;
    const completeCount = moments.filter((moment) => moment.steps === "ครบ 7 ขั้นตอน").length;
    const incompleteCount = moments.filter((moment) => moment.steps === "ไม่ครบ 7 ขั้นตอน").length;

    sheet.appendRow([
      payload.name || "",
      payload.submittedAt || new Date().toISOString(),
      payload.round || "",
      payload.month || new Date().getMonth() + 1,
      payload.year || new Date().getFullYear(),
      momentValue(1),
      momentValue(2),
      momentValue(3),
      momentValue(4),
      momentValue(5),
      countByHandwash("ล้างมือด้วยน้ำสบู่"),
      countByHandwash("ล้างมือด้วย Alcohol"),
      countByHandwash("ไม่ล้างมือ"),
      completeCount,
      incompleteCount,
      payload.id || Utilities.getUuid(),
    ]);

    return jsonOutput({ ok: true });
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message });
  }
}

function doGet() {
  return jsonOutput({ ok: true, message: "Hand washing sheet endpoint is ready." });
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
