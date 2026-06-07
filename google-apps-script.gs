const SPREADSHEET_ID = "1EqkZXESlWdKzPfCg77cIXvYHLlktRUxGz9w2sk1NjiM";
const RAW_SHEET_NAME = "RawData";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("จัดการแบบประเมิน")
    .addItem("ล้างรายคนเป็นครั้งที่ 0", "showResetPersonPrompt")
    .addToUi();
}

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

function showResetPersonPrompt() {
  const ui = SpreadsheetApp.getUi();
  const nameResponse = ui.prompt("ล้างการประเมินรายคน", "พิมพ์ชื่อให้ตรงกับในชีต เช่น คุณอนัตยา", ui.ButtonSet.OK_CANCEL);
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;

  const name = nameResponse.getResponseText().trim();
  if (!name) {
    ui.alert("กรุณากรอกชื่อ");
    return;
  }

  const monthResponse = ui.prompt("เลือกเดือน", "ใส่เลขเดือน 1-12 เช่น 6 = มิ.ย.", ui.ButtonSet.OK_CANCEL);
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;

  const month = Number(monthResponse.getResponseText().trim());
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    ui.alert("กรุณาใส่เลขเดือน 1-12");
    return;
  }

  const yearResponse = ui.prompt("เลือกปี", "ใส่ปี ค.ศ. เช่น 2026", ui.ButtonSet.OK_CANCEL);
  if (yearResponse.getSelectedButton() !== ui.Button.OK) return;

  const year = Number(yearResponse.getResponseText().trim());
  if (!Number.isInteger(year) || year < 2000) {
    ui.alert("กรุณาใส่ปี ค.ศ. ให้ถูกต้อง");
    return;
  }

  const confirm = ui.alert(
    "ยืนยันการล้างข้อมูล",
    `ต้องการล้างข้อมูลของ ${name} เดือน ${month}/${year} ให้กลับเป็นครั้งที่ 0 ใช่ไหม?`,
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  const deletedCount = resetPersonAssessment(name, month, year);
  ui.alert(`ล้างข้อมูลเรียบร้อยแล้ว: ลบ ${deletedCount} รายการ`);
}

function resetPersonAssessment(name, month, year) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  let deletedCount = 0;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    const rowName = String(row[0] || "").trim();
    const rowMonth = Number(row[3]);
    const rowYear = Number(row[4]);

    if (rowName === name && rowMonth === month && rowYear === year) {
      sheet.deleteRow(index + 2);
      deletedCount += 1;
    }
  }

  SpreadsheetApp.flush();
  return deletedCount;
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
