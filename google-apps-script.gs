const SPREADSHEET_ID = "1EqkZXESlWdKzPfCg77cIXvYHLlktRUxGz9w2sk1NjiM";
const RAW_SHEET_NAME = "RawData";
const MAX_ROUNDS_PER_MONTH = 4;
const MONTH_SHEET_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const STAFF_NAMES = [
  "คุณอนัตยา",
  "คุณพัชรินทร์",
  "คุณทิพนิกา",
  "คุณอลิน",
  "คุณภัสธารีย์",
  "คุณมาริษา",
  "คุณอัจฉราภรณ์",
  "คุณณัฐ",
  "คุณจุฑาวรรณ",
  "คุณรังสิมา",
  "คุณขนิษฐา",
  "คุณชอบีเราะห์",
  "คุณวงศิยา",
  "คุณบูร์ชัยนี",
  "คุณจิตาภา",
  "คุณสุทธยา",
  "คุณณัฐณิชา",
  "คุณน้ำฝน",
  "คุณวนิดา",
  "คุณฟารีดาห์",
  "คุณธัญชนก",
  "คุณธัญภรณ์",
  "คุณจิติมา",
  "คุณรัชขสิทธิ์",
  "คุณศิริวรรณ",
  "คุณิตาภา",
  "คุณศรีกัญญา",
  "คุณเฟืองลดา",
  "คุณวรกานต์",
  "คุณอัตรชัย",
  "คุณพานิชดา",
  "คุณสุพัตรา",
  "คุณเดือนเพ็ญ",
  "คุณชุติมา",
  "คุณลักษิกา",
  "คุณสุพัตรา ระ",
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("จัดการแบบประเมิน")
    .addItem("ล้างรายคนเป็นครั้งที่ 0", "showResetPersonDialog")
    .addItem("ล้างรายคนแบบพิมพ์ชื่อ", "showResetPersonPrompt")
    .addSeparator()
    .addItem("อัปเดตรายชื่อทุกเดือน", "syncStaffNamesToMonthlySheets")
    .addItem("ซ่อม RawData เวลา/ครั้ง", "repairRawData")
    .addItem("ลบรายการส่งซ้ำ", "removeDuplicateSubmissions")
    .addToUi();
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const submission = normalizeSubmission(payload);
    const sheet = getRawSheet();

    if (isDuplicateSubmission(sheet, submission.id)) {
      return jsonOutput({
        ok: true,
        duplicate: true,
        message: "บันทึกนี้เคยถูกส่งแล้ว ระบบไม่บันทึกซ้ำ",
        round: submission.round,
        month: submission.month,
        year: submission.year,
      });
    }

    const nextRound = getNextRound(sheet, submission.name, submission.month, submission.year);
    if (nextRound > MAX_ROUNDS_PER_MONTH) {
      return jsonOutput({
        ok: false,
        error: `เดือนนี้ประเมินครบ ${MAX_ROUNDS_PER_MONTH} ครั้งแล้ว`,
        status: "complete",
        month: submission.month,
        year: submission.year,
      });
    }

    const moments = submission.moments;
    const momentValue = (number) => {
      const item = moments.find((moment) => Number(moment.moment) === number);
      return item && item.handwash !== "ไม่ล้างมือ" ? 1 : 0;
    };
    const countByHandwash = (label) => moments.filter((moment) => moment.handwash === label).length;
    const completeCount = moments.filter((moment) => moment.steps === "ครบ 7 ขั้นตอน").length;
    const incompleteCount = moments.filter((moment) => moment.steps === "ไม่ครบ 7 ขั้นตอน").length;

    sheet.appendRow([
      submission.name,
      submission.submittedAt,
      nextRound,
      submission.month,
      submission.year,
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
      submission.id,
    ]);
    sheet.getRange(sheet.getLastRow(), 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");
    updateMonthlyHeader(submission.month, submission.year);

    return jsonOutput({
      ok: true,
      id: submission.id,
      round: nextRound,
      month: submission.month,
      year: submission.year,
      remainingRounds: MAX_ROUNDS_PER_MONTH - nextRound,
      complete: nextRound >= MAX_ROUNDS_PER_MONTH,
    });
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message });
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (params.action === "status" && params.name) {
    const period = getServerPeriod();
    const sheet = getRawSheet();
    const nextRound = getNextRound(sheet, params.name, period.month, period.year);
    return jsonOutput({
      ok: true,
      name: params.name,
      month: period.month,
      year: period.year,
      nextRound: Math.min(nextRound, MAX_ROUNDS_PER_MONTH),
      completedRounds: Math.min(nextRound - 1, MAX_ROUNDS_PER_MONTH),
      complete: nextRound > MAX_ROUNDS_PER_MONTH,
    });
  }

  return jsonOutput({ ok: true, message: "Hand washing sheet endpoint is ready." });
}

function showResetPersonDialog() {
  const period = getServerPeriod();
  const namesJson = JSON.stringify(STAFF_NAMES);
  const html = HtmlService.createHtmlOutput(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, "Noto Sans Thai", sans-serif; padding: 16px; color: #123; }
          label { display: grid; gap: 6px; margin: 0 0 12px; font-weight: 700; }
          select, input { min-height: 38px; padding: 6px 10px; border: 1px solid #c9d8d5; border-radius: 6px; font: inherit; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 6px; background: #0f766e; color: white; font-weight: 700; cursor: pointer; }
          button.secondary { background: #687782; }
          .actions { display: flex; gap: 8px; justify-content: end; margin-top: 14px; }
          #status { margin-top: 10px; color: #0f766e; font-weight: 700; }
        </style>
      </head>
      <body>
        <h3>ล้างการประเมินรายคน</h3>
        <label>
          เลือกรายชื่อ
          <select id="name"></select>
        </label>
        <div class="grid">
          <label>
            เดือน
            <input id="month" type="number" min="1" max="12" value="${period.month}">
          </label>
          <label>
            ปี ค.ศ.
            <input id="year" type="number" min="2000" value="${period.year}">
          </label>
        </div>
        <div class="actions">
          <button class="secondary" type="button" onclick="google.script.host.close()">ยกเลิก</button>
          <button type="button" onclick="resetPerson()">ล้างข้อมูล</button>
        </div>
        <p id="status"></p>
        <script>
          const names = ${namesJson};
          const select = document.querySelector("#name");
          select.innerHTML = names.map((name) => '<option value="' + name + '">' + name + '</option>').join("");

          function resetPerson() {
            const payload = {
              name: select.value,
              month: Number(document.querySelector("#month").value),
              year: Number(document.querySelector("#year").value),
            };
            document.querySelector("#status").textContent = "กำลังล้างข้อมูล...";
            google.script.run
              .withSuccessHandler((message) => {
                document.querySelector("#status").textContent = message;
              })
              .withFailureHandler((error) => {
                document.querySelector("#status").textContent = error.message || "ล้างข้อมูลไม่สำเร็จ";
              })
              .resetSelectedPerson(payload);
          }
        </script>
      </body>
    </html>
  `).setWidth(420).setHeight(360);

  SpreadsheetApp.getUi().showModalDialog(html, "ล้างรายคนเป็นครั้งที่ 0");
}

function resetSelectedPerson(payload) {
  const name = String(payload && payload.name ? payload.name : "").trim();
  const month = Number(payload && payload.month);
  const year = Number(payload && payload.year);

  if (!name) throw new Error("กรุณาเลือกรายชื่อ");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("กรุณาใส่เลขเดือน 1-12");
  if (!Number.isInteger(year) || year < 2000) throw new Error("กรุณาใส่ปี ค.ศ. ให้ถูกต้อง");

  const deletedCount = resetPersonAssessment(name, month, year);
  if (!deletedCount) return `ไม่พบข้อมูลของ ${name} เดือน ${month}/${year}`;
  return `ล้างข้อมูลของ ${name} เดือน ${month}/${year} แล้ว: ลบ ${deletedCount} รายการ`;
}

function showResetPersonPrompt() {
  const ui = SpreadsheetApp.getUi();
  const period = getServerPeriod();
  const nameResponse = ui.prompt("ล้างการประเมินรายคน", "พิมพ์ชื่อให้ตรงกับในชีต เช่น คุณอนัตยา", ui.ButtonSet.OK_CANCEL);
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;

  const name = nameResponse.getResponseText().trim();
  if (!name) {
    ui.alert("กรุณากรอกชื่อ");
    return;
  }

  const monthResponse = ui.prompt("เลือกเดือน", `ใส่เลขเดือน 1-12 เช่น ${period.month} = เดือนปัจจุบัน`, ui.ButtonSet.OK_CANCEL);
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;

  const month = Number(monthResponse.getResponseText().trim());
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    ui.alert("กรุณาใส่เลขเดือน 1-12");
    return;
  }

  const yearResponse = ui.prompt("เลือกปี", `ใส่ปี ค.ศ. เช่น ${period.year}`, ui.ButtonSet.OK_CANCEL);
  if (yearResponse.getSelectedButton() !== ui.Button.OK) return;

  const year = Number(yearResponse.getResponseText().trim());
  if (!Number.isInteger(year) || year < 2000) {
    ui.alert("กรุณาใส่ปี ค.ศ. ให้ถูกต้อง");
    return;
  }

  const matchCount = countPersonAssessments(name, month, year);
  if (matchCount === 0) {
    ui.alert(
      "ไม่พบข้อมูลที่จะล้าง",
      `ไม่พบรายการของ "${name}" ในเดือน ${month}/${year}\n\nให้ตรวจว่าชื่อสะกดตรงกับในชีต และเลือกเดือน/ปีถูกต้อง`,
      ui.ButtonSet.OK,
    );
    return;
  }

  const confirm = ui.alert(
    "ยืนยันการล้างข้อมูล",
    `พบข้อมูลของ ${name} เดือน ${month}/${year} จำนวน ${matchCount} รายการ\n\nต้องการล้างให้กลับเป็นครั้งที่ 0 ใช่ไหม?`,
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  const deletedCount = resetPersonAssessment(name, month, year);
  SpreadsheetApp.flush();
  ui.alert(`ล้างข้อมูลเรียบร้อยแล้ว: ลบ ${deletedCount} รายการ\n\nถ้าหน้าสรุปยังไม่เปลี่ยน ให้กดรีเฟรชชีต 1 ครั้ง`);
}

function normalizeSubmission(payload) {
  const name = String(payload.name || "").trim();
  const moments = Array.isArray(payload.moments) ? payload.moments : [];
  const submittedAt = new Date();
  const period = getServerPeriod(submittedAt);

  if (!name) throw new Error("Missing name");
  if (moments.length !== 5) throw new Error("Invalid moments");

  return {
    id: String(payload.id || Utilities.getUuid()),
    name,
    submittedAt,
    month: period.month,
    year: period.year,
    moments,
  };
}

function getServerPeriod(dateValue) {
  const timezone = Session.getScriptTimeZone() || "Asia/Bangkok";
  const now = dateValue || new Date();
  return {
    month: Number(Utilities.formatDate(now, timezone, "M")),
    year: Number(Utilities.formatDate(now, timezone, "yyyy")),
  };
}

function getRawSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_SHEET_NAME);
}

function getNextRound(sheet, name, month, year) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  const targetName = normalizeName(name);
  const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const usedRounds = new Set();

  values.forEach((row) => {
    const rowName = normalizeName(row[0]);
    const rowRound = Number(row[2]);
    const rowMonth = Number(row[3]);
    const rowYear = Number(row[4]);

    if (rowName === targetName && rowMonth === month && rowYear === year && rowRound >= 1) {
      usedRounds.add(rowRound);
    }
  });

  for (let round = 1; round <= MAX_ROUNDS_PER_MONTH; round += 1) {
    if (!usedRounds.has(round)) return round;
  }

  return MAX_ROUNDS_PER_MONTH + 1;
}

function isDuplicateSubmission(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (!id || lastRow < 2) return false;

  const ids = sheet.getRange(2, 16, lastRow - 1, 1).getValues().flat();
  return ids.some((value) => String(value || "") === String(id));
}

function resetPersonAssessment(name, month, year) {
  const sheet = getRawSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  let deletedCount = 0;
  const targetName = normalizeName(name);

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    const rowName = normalizeName(row[0]);
    const rowMonth = Number(row[3]);
    const rowYear = Number(row[4]);

    if (rowName === targetName && rowMonth === month && rowYear === year) {
      sheet.deleteRow(index + 2);
      deletedCount += 1;
    }
  }

  SpreadsheetApp.flush();
  return deletedCount;
}

function countPersonAssessments(name, month, year) {
  const sheet = getRawSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const targetName = normalizeName(name);

  return values.filter((row) => {
    const rowName = normalizeName(row[0]);
    const rowMonth = Number(row[3]);
    const rowYear = Number(row[4]);
    return rowName === targetName && rowMonth === month && rowYear === year;
  }).length;
}

function repairRawData() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "ซ่อม RawData เวลา/ครั้ง",
    "ระบบจะเติมครั้งที่ประเมิน เดือน ปี ที่ว่าง และจัดรูปแบบเวลาส่งเป็นเวลาไทย ต้องการทำต่อไหม?",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  const result = repairRawDataRows();
  refreshAllMonthlyHeaders();
  ui.alert(
    "ซ่อม RawData เรียบร้อย",
    `ปรับปรุง ${result.updatedRows} แถว\nเติมครั้งที่ประเมิน ${result.fixedRounds} แถว\nเติมเดือน/ปี ${result.fixedPeriods} แถว\nจัดรูปแบบเวลา ${result.fixedTimes} แถว\n\nถ้าหน้าสรุปยังไม่เปลี่ยน ให้กดรีเฟรชชีต`,
    ui.ButtonSet.OK,
  );
}

function removeDuplicateSubmissions() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "ลบรายการส่งซ้ำ",
    "ระบบจะลบแถวที่ชื่อเดียวกัน เดือน/ปีเดียวกัน ผลประเมินเหมือนกัน และส่งห่างกันไม่เกิน 2 นาที โดยเก็บรายการแรกไว้ ต้องการทำต่อไหม?",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  const deletedCount = removeDuplicateSubmissionRows();
  refreshAllMonthlyHeaders();
  ui.alert(
    "ลบรายการส่งซ้ำเรียบร้อย",
    `ลบรายการซ้ำ ${deletedCount} แถว\n\nถ้าหน้าสรุปยังไม่เปลี่ยน ให้กดรีเฟรชชีต`,
    ui.ButtonSet.OK,
  );
}

function removeDuplicateSubmissionRows() {
  const sheet = getRawSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  const seen = {};
  const rowsToDelete = [];

  values.forEach((row, index) => {
    const name = normalizeName(row[0]);
    const submittedAt = parseSubmittedAt(row[1]);
    const month = Number(row[3]);
    const year = Number(row[4]);
    if (!name || !submittedAt || !month || !year) return;

    const answerSignature = row.slice(5, 15).map((value) => Number(value) || 0).join("|");
    const key = `${name}|${month}|${year}|${answerSignature}`;
    const submittedTime = submittedAt.getTime();
    const previous = seen[key];

    if (previous && Math.abs(submittedTime - previous.submittedTime) <= 2 * 60 * 1000) {
      rowsToDelete.push(index + 2);
      return;
    }

    seen[key] = { submittedTime, rowNumber: index + 2 };
  });

  rowsToDelete.reverse().forEach((rowNumber) => sheet.deleteRow(rowNumber));
  SpreadsheetApp.flush();
  return rowsToDelete.length;
}

function syncStaffNamesToMonthlySheets() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "อัปเดตรายชื่อทุกเดือน",
    "ระบบจะเขียนรายชื่อชุดใหม่ลงแท็บ ม.ค.-ธ.ค. ในคอลัมน์รายชื่อ และล้างชื่อส่วนเกินเดิม ต้องการทำต่อไหม?",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  const updatedSheets = syncStaffNamesToMonthlySheetRows();
  refreshAllMonthlyHeaders();
  ui.alert(
    "อัปเดตรายชื่อเรียบร้อย",
    `อัปเดต ${updatedSheets} เดือนแล้ว\n\nถ้าหน้าชีตยังไม่เปลี่ยน ให้กดรีเฟรชชีต 1 ครั้ง`,
    ui.ButtonSet.OK,
  );
}

function syncStaffNamesToMonthlySheetRows() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const startRow = 4;
  const indexColumn = 1;
  const nameColumn = 2;
  let updatedSheets = 0;

  MONTH_SHEET_NAMES.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;

    const totalRow = startRow + STAFF_NAMES.length;
    const requiredRows = STAFF_NAMES.length + 1;
    const lastRow = Math.max(sheet.getLastRow(), totalRow);
    const rowsToClear = Math.max(lastRow - startRow + 1, requiredRows);

    sheet.getRange(startRow, indexColumn, rowsToClear, 1).clearContent();
    sheet.getRange(startRow, nameColumn, rowsToClear, 1).clearContent();
    sheet.getRange(startRow, indexColumn, STAFF_NAMES.length, 1).setValues(STAFF_NAMES.map((_, index) => [index + 1]));
    sheet.getRange(startRow, nameColumn, STAFF_NAMES.length, 1).setValues(STAFF_NAMES.map((name) => [name]));
    sheet.getRange(totalRow, indexColumn).setValue(STAFF_NAMES.length + 1);
    sheet.getRange(totalRow, nameColumn).setValue("Total");
    updatedSheets += 1;
  });

  SpreadsheetApp.flush();
  return updatedSheets;
}

function repairRawDataRows() {
  const sheet = getRawSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { updatedRows: 0, fixedRounds: 0, fixedPeriods: 0, fixedTimes: 0 };
  }

  const range = sheet.getRange(2, 1, lastRow - 1, 16);
  const values = range.getValues();
  const usedRoundsByKey = {};
  let updatedRows = 0;
  let fixedRounds = 0;
  let fixedPeriods = 0;
  let fixedTimes = 0;

  values.forEach((row) => {
    const name = normalizeName(row[0]);
    const submittedAt = parseSubmittedAt(row[1]) || new Date();
    const period = getServerPeriod(submittedAt);
    const month = Number(row[3]) || period.month;
    const year = Number(row[4]) || period.year;
    const key = `${name}|${month}|${year}`;

    if (!usedRoundsByKey[key]) usedRoundsByKey[key] = new Set();
    const rowRound = Number(row[2]);
    if (rowRound >= 1 && rowRound <= MAX_ROUNDS_PER_MONTH) {
      usedRoundsByKey[key].add(rowRound);
    }
  });

  values.forEach((row) => {
    let rowChanged = false;
    const name = normalizeName(row[0]);
    const submittedAt = parseSubmittedAt(row[1]) || new Date();
    const period = getServerPeriod(submittedAt);

    if (!(row[1] instanceof Date)) {
      row[1] = submittedAt;
      rowChanged = true;
      fixedTimes += 1;
    }

    if (!Number(row[3]) || !Number(row[4])) {
      row[3] = Number(row[3]) || period.month;
      row[4] = Number(row[4]) || period.year;
      rowChanged = true;
      fixedPeriods += 1;
    }

    const month = Number(row[3]);
    const year = Number(row[4]);
    const key = `${name}|${month}|${year}`;
    if (!usedRoundsByKey[key]) usedRoundsByKey[key] = new Set();

    const rowRound = Number(row[2]);
    if (!rowRound && name) {
      const nextRound = nextAvailableRound(usedRoundsByKey[key]);
      row[2] = nextRound;
      usedRoundsByKey[key].add(nextRound);
      rowChanged = true;
      fixedRounds += 1;
    }

    if (rowChanged) updatedRows += 1;
  });

  range.setValues(values);
  sheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  SpreadsheetApp.flush();

  return { updatedRows, fixedRounds, fixedPeriods, fixedTimes };
}

function refreshAllMonthlyHeaders() {
  const period = getServerPeriod();
  for (let month = 1; month <= 12; month += 1) {
    updateMonthlyHeader(month, period.year);
  }
}

function updateMonthlyHeader(month, year) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const monthSheet = spreadsheet.getSheetByName(MONTH_SHEET_NAMES[month - 1]);
  const rawSheet = spreadsheet.getSheetByName(RAW_SHEET_NAME);
  if (!monthSheet || !rawSheet) return;

  const lastRow = rawSheet.getLastRow();
  if (lastRow < 2) {
    monthSheet.getRange("A2").setValue("เดือนนี้ 0 คน. | รายการที่ส่งมา 0 รายการ");
    return;
  }

  const values = rawSheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const names = new Set();
  let submissionCount = 0;

  values.forEach((row) => {
    const name = String(row[0] || "").trim();
    const rowMonth = Number(row[3]);
    const rowYear = Number(row[4]);

    if (name && rowMonth === month && rowYear === year) {
      names.add(normalizeName(name));
      submissionCount += 1;
    }
  });

  monthSheet.getRange("A2").setValue(`เดือนนี้ ${names.size} คน. | รายการที่ส่งมา ${submissionCount} รายการ`);
}

function nextAvailableRound(usedRounds) {
  for (let round = 1; round <= MAX_ROUNDS_PER_MONTH; round += 1) {
    if (!usedRounds.has(round)) return round;
  }
  return MAX_ROUNDS_PER_MONTH;
}

function parseSubmittedAt(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

function normalizeName(value) {
  return String(value || "")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "")
    .trim();
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
