const form = document.querySelector("#handForm");
const momentSections = document.querySelector("#momentSections");
const momentTemplate = document.querySelector("#momentTemplate");
const stepsTemplate = document.querySelector("#stepsTemplate");
const resultCard = document.querySelector("#resultCard");
const backButton = document.querySelector(".icon-button");
const evaluatorNameInput = document.querySelector("#evaluatorName");
const evaluatorAutofillNote = document.querySelector("#evaluatorAutofillNote");
const fullNameInput = document.querySelector("#fullName");
const autofillNote = document.querySelector("#autofillNote");
const roundStatus = document.querySelector("#roundStatus");
const roundNote = document.querySelector("#roundNote");
const submitButtons = document.querySelectorAll('button[type="submit"]');
const GOOGLE_SHEET_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwvOktR0boBmhoiGngJQTQL16I3c67GoUTJk2LB3kEloIZMsJQxsMEGu2Q-HyuSGBS1/exec";

let currentAssessmentStatus = null;
let activeSubmissionId = createSubmissionId();
let isSubmitting = false;
let hasSubmittedSuccessfully = false;

const momentChoices = [
  "ล้างมือด้วยน้ำสบู่",
  "ล้างมือด้วย Alcohol",
  "ไม่ล้างมือ",
];

const staffNames = [
  "คุณอณัศยา",
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
  "คุณซอบีเราะห์",
  "คุณวงศิยา",
  "คุณนูร์อัยนี",
  "คุณจิดาภา",
  "คุณสุทธยา",
  "คุณณัฐณิชา",
  "คุณน้ำฝน",
  "คุณวนิดา",
  "คุณฟารีดาห์",
  "คุณธิติมา",
  "คุณธัญชนก",
  "คุณธัญภรณ์",
  "คุณรัชชสิทธิ์",
  "คุณศิริวรรณ",
  "คุณธิตาภา",
  "คุณศรีกัญญา",
  "คุณเฟื่องลดา",
  "คุณวรกานต์",
  "คุณอัครชัย",
  "คุณพาณิชดา",
  "คุณสุพัตรา",
  "คุณเดือนเพ็ญ",
  "คุณลักษิกา",
  "คุณชุติมา",
  "คุณสุพัตรา ระย้า",
];

function applyNameFromLink() {
  const params = new URLSearchParams(window.location.search);
  const evaluatorFromLink = params.get("evaluator") || params.get("auditor");
  const nameFromLink = params.get("name") || params.get("staff");

  if (evaluatorFromLink) {
    evaluatorNameInput.value = evaluatorFromLink.trim();
    evaluatorNameInput.readOnly = true;
    evaluatorNameInput.classList.add("is-autofilled");
    evaluatorAutofillNote.classList.add("show");
  }

  if (nameFromLink) {
    fullNameInput.value = nameFromLink.trim();
    fullNameInput.readOnly = true;
    fullNameInput.classList.add("is-autofilled");
    autofillNote.classList.add("show");
    refreshAssessmentStatus(nameFromLink.trim());
  }

  if (evaluatorFromLink || nameFromLink) {
    backButton.setAttribute("aria-label", "กลับไปเลือกรายชื่อ");
    backButton.dataset.staffBack = "true";
  }
}

function createMomentQuestion(momentNumber) {
  const node = momentTemplate.content.cloneNode(true);
  const card = node.querySelector(".moment-card");
  const heading = node.querySelector("h3");
  const choices = node.querySelector(".choice-list");
  const error = node.querySelector(".error-text");
  const groupName = `moment-${momentNumber}`;

  card.dataset.requiredGroup = groupName;
  card.dataset.kicker = `Moment ที่ ${momentNumber}`;
  heading.innerHTML = `การล้างมือใน moment ที่ประเมิน <span>*</span>`;
  error.textContent = `กรุณาเลือกคำตอบของ moment ที่ ${momentNumber}`;

  choices.innerHTML = momentChoices
    .map((choice, index) => {
      const required = index === 0 ? "required" : "";
      return `
        <label>
          <input type="radio" name="${groupName}" value="${choice}" ${required} />
          ${choice}
        </label>
      `;
    })
    .join("");

  return node;
}

function createStepsQuestion(momentNumber) {
  const node = stepsTemplate.content.cloneNode(true);
  const card = node.querySelector(".steps-card");
  const heading = node.querySelector("h3");
  const choices = node.querySelector(".choice-list");
  const error = node.querySelector(".error-text");
  const groupName = `steps-${momentNumber}`;

  card.dataset.requiredGroup = groupName;
  card.dataset.kicker = `Moment ที่ ${momentNumber}`;
  heading.innerHTML = `ล้างมือ 7 ขั้นตอน <span>*</span>`;
  error.textContent = `กรุณาเลือกผลการล้างมือ 7 ขั้นตอนของ moment ที่ ${momentNumber}`;

  choices.innerHTML = `
    <label>
      <input type="radio" name="${groupName}" value="ครบ 7 ขั้นตอน" required />
      ครบ 7 ขั้นตอน
    </label>
    <label>
      <input type="radio" name="${groupName}" value="ไม่ครบ 7 ขั้นตอน" />
      ไม่ครบ 7 ขั้นตอน
    </label>
  `;

  return node;
}

function renderMomentQuestions() {
  for (let index = 1; index <= 5; index += 1) {
    momentSections.appendChild(createMomentQuestion(index));
    momentSections.appendChild(createStepsQuestion(index));
  }
}

function getRadioValue(name) {
  const checked = form.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function createSubmissionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSubmitDisabled(disabled) {
  const shouldDisable = disabled || isSubmitting || hasSubmittedSuccessfully;
  submitButtons.forEach((button) => {
    button.disabled = shouldDisable;
    button.classList.toggle("is-disabled", shouldDisable);
  });
}

function isValidAssessmentStatus(status) {
  return Boolean(
    status &&
      Number.isInteger(Number(status.month)) &&
      Number.isInteger(Number(status.year)) &&
      Number.isInteger(Number(status.nextRound)) &&
      Number.isInteger(Number(status.completedRounds)),
  );
}

function updateRoundStatus(status) {
  currentAssessmentStatus = isValidAssessmentStatus(status)
    ? {
        ...status,
        month: Number(status.month),
        year: Number(status.year),
        nextRound: Number(status.nextRound),
        completedRounds: Number(status.completedRounds),
        complete: Boolean(status.complete),
      }
    : null;

  if (!currentAssessmentStatus) {
    roundStatus.textContent = "ระบบจะกำหนดให้อัตโนมัติ";
    roundNote.textContent = "ระบบใช้เดือน/ปีจาก Google Apps Script และเลือกครั้งที่ 1-4 ตามข้อมูลในชีต";
    setSubmitDisabled(false);
    return;
  }

  const periodText = `เดือน ${currentAssessmentStatus.month}/${currentAssessmentStatus.year}`;

  if (currentAssessmentStatus.complete) {
    roundStatus.textContent = `ครบ 4 ครั้งแล้ว`;
    roundNote.textContent = `${periodText} ประเมินครบแล้ว ไม่ต้องส่งเพิ่ม`;
    setSubmitDisabled(true);
    return;
  }

  const remainingRounds = Math.max(0, 4 - currentAssessmentStatus.completedRounds);
  roundStatus.textContent = `ครั้งที่ ${currentAssessmentStatus.nextRound}`;
  roundNote.textContent = `${periodText} ประเมินแล้ว ${currentAssessmentStatus.completedRounds} ครั้ง เหลือ ${remainingRounds} ครั้ง`;
  setSubmitDisabled(false);
}

async function refreshAssessmentStatus(name) {
  if (!name || !GOOGLE_SHEET_WEB_APP_URL) {
    updateRoundStatus(null);
    return;
  }

  roundStatus.textContent = "กำลังตรวจครั้งที่ประเมิน...";
  roundNote.textContent = "กำลังอ่านข้อมูลล่าสุดจาก Google Sheet";

  try {
    const url = `${GOOGLE_SHEET_WEB_APP_URL}?action=status&name=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "อ่านสถานะไม่สำเร็จ");
    }
    if (!isValidAssessmentStatus(data)) {
      throw new Error("ข้อมูลสถานะไม่ครบ");
    }
    updateRoundStatus(data);
  } catch (error) {
    currentAssessmentStatus = null;
    roundStatus.textContent = "ระบบจะกำหนดให้อัตโนมัติ";
    roundNote.textContent = "ยังอ่านสถานะจากชีตไม่ได้ แต่ตอนกดส่ง Apps Script จะตรวจซ้ำให้อีกครั้ง";
    setSubmitDisabled(false);
  }
}

function validateRequiredGroups() {
  const cards = [...form.querySelectorAll("[data-required-group], [data-required-text]")];
  let firstInvalid = null;

  cards.forEach((card) => {
    const groupName = card.dataset.requiredGroup;
    const textName = card.dataset.requiredText;
    const hasAnswer = groupName
      ? Boolean(getRadioValue(groupName))
      : Boolean(form.elements[textName]?.value.trim());

    card.classList.toggle("invalid", !hasAnswer);

    if (!hasAnswer && !firstInvalid) {
      firstInvalid = card;
    }
  });

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return !firstInvalid;
}

function buildSummary() {
  const sendStatus = resultCard.dataset.sendStatus || "";
  const savedRound = resultCard.dataset.savedRound || (isValidAssessmentStatus(currentAssessmentStatus) ? currentAssessmentStatus.nextRound : "-");
  const savedPeriod = resultCard.dataset.savedPeriod || "";
  const momentAnswers = Array.from({ length: 5 }, (_, index) => {
    const momentNumber = index + 1;
    return `
      <p>Moment ที่ ${momentNumber}: ${getRadioValue(`moment-${momentNumber}`)}</p>
      <p>ล้างมือ 7 ขั้นตอน Moment ที่ ${momentNumber}: ${getRadioValue(`steps-${momentNumber}`)}</p>
    `;
  }).join("");

  return `
    <h3>บันทึกคำตอบเรียบร้อย</h3>
    <p>ผู้ประเมิน: ${form.elements.evaluatorName.value.trim()}</p>
    <p>ผู้ถูกประเมิน: ${form.elements.fullName.value.trim()}</p>
    <p>ประเมินครั้งที่: ${savedRound}${savedPeriod ? ` (${savedPeriod})` : ""}</p>
    ${momentAnswers}
    ${sendStatus ? `<p class="send-status">${sendStatus}</p>` : ""}
  `;
}

function buildSubmissionPayload() {
  const evaluatorName = form.elements.evaluatorName.value.trim();
  const fullName = form.elements.fullName.value.trim();
  const moments = Array.from({ length: 5 }, (_, index) => {
    const momentNumber = index + 1;
    const handwash = getRadioValue(`moment-${momentNumber}`);
    const steps = getRadioValue(`steps-${momentNumber}`);

    return {
      moment: momentNumber,
      handwash,
      steps,
      compliant: handwash !== "ไม่ล้างมือ",
      method: handwash,
      completeSteps: steps === "ครบ 7 ขั้นตอน",
    };
  });

  return {
    id: activeSubmissionId,
    source: "hand-washing-form",
    submittedAt: new Date().toISOString(),
    evaluator: evaluatorName,
    evaluatorName,
    name: fullName,
    assessedName: fullName,
    moments,
    summary: {
      momentCompliance: moments.map((item) => ({
        moment: item.moment,
        value: item.compliant ? 1 : 0,
      })),
      soapCount: moments.filter((item) => item.handwash === "ล้างมือด้วยน้ำสบู่").length,
      alcoholCount: moments.filter((item) => item.handwash === "ล้างมือด้วย Alcohol").length,
      noHandwashCount: moments.filter((item) => item.handwash === "ไม่ล้างมือ").length,
      completeStepsCount: moments.filter((item) => item.completeSteps).length,
      incompleteStepsCount: moments.filter((item) => !item.completeSteps).length,
      totalMoments: moments.length,
    },
  };
}

function savePendingSubmission(payload) {
  const key = "hand-washing-pending-submissions";
  const current = JSON.parse(localStorage.getItem(key) || "[]");
  current.push(payload);
  localStorage.setItem(key, JSON.stringify(current));
}

async function sendToGoogleSheet(payload) {
  if (!GOOGLE_SHEET_WEB_APP_URL) {
    throw new Error("ยังไม่ได้ตั้งค่า Google Apps Script Web App URL");
  }

  const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || `Google Sheet endpoint returned ${response.status}`);
  }

  return data;
}

renderMomentQuestions();
applyNameFromLink();

backButton.addEventListener("click", () => {
  if (backButton.dataset.staffBack === "true") {
    window.location.href = "index.html";
    return;
  }

  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

form.addEventListener("change", (event) => {
  const input = event.target;
  if (!input.matches('input[type="radio"], input[type="text"]')) return;

  const card = input.closest("[data-required-group], [data-required-text]");
  if (card) {
    card.classList.remove("invalid");
  }
});

form.addEventListener("input", (event) => {
  const input = event.target;
  if (!input.matches('input[type="text"]')) return;

  const card = input.closest("[data-required-text]");
  if (card && input.value.trim()) {
    card.classList.remove("invalid");
  }

  if (input === fullNameInput) {
    window.clearTimeout(input.dataset.statusTimer);
    input.dataset.statusTimer = window.setTimeout(() => {
      refreshAssessmentStatus(input.value.trim());
    }, 500);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) return;

  if (currentAssessmentStatus?.complete) {
    resultCard.dataset.sendStatus = "เดือนนี้ประเมินครบ 4 ครั้งแล้ว ไม่สามารถส่งเพิ่มได้";
    resultCard.dataset.savedRound = "ครบ 4 ครั้ง";
    resultCard.dataset.savedPeriod = `${currentAssessmentStatus.month}/${currentAssessmentStatus.year}`;
    resultCard.innerHTML = buildSummary();
    resultCard.classList.add("show");
    resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (!validateRequiredGroups()) {
    resultCard.classList.remove("show");
    return;
  }

  const payload = buildSubmissionPayload();
  isSubmitting = true;
  setSubmitDisabled(true);

  resultCard.dataset.sendStatus = "กำลังส่งข้อมูลไปยัง Google Sheet...";
  resultCard.dataset.savedRound = isValidAssessmentStatus(currentAssessmentStatus) ? currentAssessmentStatus.nextRound : "อัตโนมัติ";
  resultCard.dataset.savedPeriod = isValidAssessmentStatus(currentAssessmentStatus)
    ? `${currentAssessmentStatus.month}/${currentAssessmentStatus.year}`
    : "";
  resultCard.innerHTML = buildSummary();
  resultCard.classList.add("show");
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });

  try {
    const result = await sendToGoogleSheet(payload);
    resultCard.dataset.savedRound = result.round || resultCard.dataset.savedRound;
    resultCard.dataset.savedPeriod = result.month && result.year ? `${result.month}/${result.year}` : resultCard.dataset.savedPeriod;
    resultCard.dataset.sendStatus = result.duplicate
      ? "ข้อมูลนี้เคยถูกส่งแล้ว ระบบไม่บันทึกซ้ำ"
      : "ส่งข้อมูลไปยัง Google Sheet เรียบร้อยแล้ว";
    hasSubmittedSuccessfully = true;
    await refreshAssessmentStatus(payload.name);
    setSubmitDisabled(true);
  } catch (error) {
    savePendingSubmission(payload);
    resultCard.dataset.sendStatus =
      `บันทึกคำตอบแล้ว แต่ยังส่งไป Google Sheet ไม่สำเร็จ (${error.message}) จึงเก็บข้อมูลรอส่งไว้ในเครื่องนี้`;
    isSubmitting = false;
    setSubmitDisabled(false);
  }

  resultCard.innerHTML = buildSummary();
});

form.addEventListener("reset", () => {
  const shouldRestoreLinkNames = fullNameInput.readOnly || evaluatorNameInput.readOnly;

  setTimeout(() => {
    form.querySelectorAll(".invalid").forEach((card) => card.classList.remove("invalid"));
    resultCard.classList.remove("show");
    resultCard.innerHTML = "";
    resultCard.dataset.savedRound = "";
    resultCard.dataset.savedPeriod = "";
    resultCard.dataset.sendStatus = "";
    activeSubmissionId = createSubmissionId();
    isSubmitting = false;
    hasSubmittedSuccessfully = false;

    if (shouldRestoreLinkNames) {
      applyNameFromLink();
    } else {
      updateRoundStatus(null);
    }

    if (!currentAssessmentStatus?.complete) {
      setSubmitDisabled(false);
    }
  });
});
