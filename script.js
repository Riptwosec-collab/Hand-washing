const form = document.querySelector("#handForm");
const momentSections = document.querySelector("#momentSections");
const momentTemplate = document.querySelector("#momentTemplate");
const stepsTemplate = document.querySelector("#stepsTemplate");
const resultCard = document.querySelector("#resultCard");
const backButton = document.querySelector(".icon-button");
const fullNameInput = document.querySelector("#fullName");
const autofillNote = document.querySelector("#autofillNote");
const SUMMARY_ENDPOINT = "https://summary-hand.vercel.app/api/submit";

const momentChoices = [
  "ล้างมือด้วยน้ำสบู่",
  "ล้างมือด้วย Alcohol",
  "ไม่ล้างมือ",
];

const staffNames = [
  "คุณอนัตยา",
  "คุณพัชรพร",
  "คุณพิพินา",
  "คุณอลิน",
  "คุณสัสรชัย",
  "คุณนารียา",
  "คุณนุ้ย",
  "คุณวาวรรณ",
  "คุณรังสินา",
  "คุณขนิษฐา",
  "คุณอัสรีราช",
  "คุณวาดียา",
  "คุณรุ่งอรัย",
  "คุณวารีการ",
  "คุณสุกรยา",
  "คุณณัฐณิชา",
  "คุณน้ำฝน",
  "คุณวนิดา",
  "คุณฟาริดา",
  "คุณธัญชนก",
  "คุณอัญชลี",
  "คุณธนัชสิรี",
  "คุณศิริวรรณ",
  "คุณธากา",
  "คุณศรีธนญา",
  "คุณสายฯ",
  "คุณเปี่ยลด",
  "คุณวรากานต์",
  "คุณอัครชัย",
  "คุณพาณิชยา",
  "คุณสุพัตรา",
  "คุณเดือนเพ็ญ",
  "คุณชุติมา",
  "คุณลักษิกา",
  "คุณสุพัตรา ระ",
];

function applyNameFromLink() {
  const params = new URLSearchParams(window.location.search);
  const nameFromLink = params.get("name") || params.get("staff");

  if (!nameFromLink) return;

  fullNameInput.value = nameFromLink.trim();
  fullNameInput.readOnly = true;
  fullNameInput.classList.add("is-autofilled");
  autofillNote.classList.add("show");
  backButton.setAttribute("aria-label", "กลับไปเลือกรายชื่อ");
  backButton.dataset.staffBack = "true";
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
  const momentAnswers = Array.from({ length: 5 }, (_, index) => {
    const momentNumber = index + 1;
    return `
      <p>Moment ที่ ${momentNumber}: ${getRadioValue(`moment-${momentNumber}`)}</p>
      <p>ล้างมือ 7 ขั้นตอน Moment ที่ ${momentNumber}: ${getRadioValue(`steps-${momentNumber}`)}</p>
    `;
  }).join("");

  return `
    <h3>บันทึกคำตอบเรียบร้อย</h3>
    <p>ชื่อ - นามสกุล: ${form.elements.fullName.value.trim()}</p>
    <p>ประเมินครั้งที่: ${getRadioValue("round")}</p>
    ${momentAnswers}
    ${sendStatus ? `<p class="send-status">${sendStatus}</p>` : ""}
  `;
}

function buildSubmissionPayload() {
  const fullName = form.elements.fullName.value.trim();
  const round = Number(getRadioValue("round"));
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
    source: "hand-washing-form",
    submittedAt: new Date().toISOString(),
    name: fullName,
    round,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
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

async function sendToSummary(payload) {
  const response = await fetch(SUMMARY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Summary endpoint returned ${response.status}`);
  }

  return response;
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
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateRequiredGroups()) {
    resultCard.classList.remove("show");
    return;
  }

  const payload = buildSubmissionPayload();

  resultCard.dataset.sendStatus = "กำลังส่งข้อมูลไปยังเว็บสรุป...";
  resultCard.innerHTML = buildSummary();
  resultCard.classList.add("show");
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });

  try {
    await sendToSummary(payload);
    resultCard.dataset.sendStatus = "ส่งข้อมูลไปยังเว็บสรุปเรียบร้อยแล้ว";
  } catch (error) {
    savePendingSubmission(payload);
    resultCard.dataset.sendStatus =
      `บันทึกคำตอบแล้ว แต่ยังส่งไปเว็บสรุปไม่สำเร็จ (${error.message}) จึงเก็บข้อมูลรอส่งไว้ในเครื่องนี้`;
  }

  resultCard.innerHTML = buildSummary();
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    form.querySelectorAll(".invalid").forEach((card) => card.classList.remove("invalid"));
    resultCard.classList.remove("show");
    resultCard.innerHTML = "";
  });
});
