const form = document.querySelector("#handForm");
const momentSections = document.querySelector("#momentSections");
const momentTemplate = document.querySelector("#momentTemplate");
const stepsTemplate = document.querySelector("#stepsTemplate");
const resultCard = document.querySelector("#resultCard");
const backButton = document.querySelector(".icon-button");

const momentChoices = [
  "ล้างมือด้วยน้ำสบู่",
  "ล้างมือด้วย Alcohol",
  "ไม่ล้างมือ",
];

function createMomentQuestion(momentNumber) {
  const node = momentTemplate.content.cloneNode(true);
  const card = node.querySelector(".moment-card");
  const heading = node.querySelector("h3");
  const choices = node.querySelector(".choice-list");
  const error = node.querySelector(".error-text");
  const groupName = `moment-${momentNumber}`;

  card.dataset.requiredGroup = groupName;
  card.dataset.kicker = `Moment ${momentNumber}`;
  heading.innerHTML = `การล้างมือใน moment ที่ ${momentNumber} <span>*</span>`;
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
  card.dataset.kicker = `ขั้นตอนการล้างมือ | Moment ${momentNumber}`;
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
  `;
}

renderMomentQuestions();

backButton.addEventListener("click", () => {
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

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateRequiredGroups()) {
    resultCard.classList.remove("show");
    return;
  }

  resultCard.innerHTML = buildSummary();
  resultCard.classList.add("show");
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    form.querySelectorAll(".invalid").forEach((card) => card.classList.remove("invalid"));
    resultCard.classList.remove("show");
    resultCard.innerHTML = "";
  });
});
