const form = document.querySelector("#handForm");
const momentSections = document.querySelector("#momentSections");
const template = document.querySelector("#momentTemplate");
const resultCard = document.querySelector("#resultCard");

const momentChoices = [
  "ล้างมือด้วยน้ำสบู่",
  "ล้างมือด้วย Alcohol",
  "ไม่ล้างมือ",
];

function createMomentQuestion(momentNumber) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".moment-card");
  const heading = node.querySelector("h3");
  const choices = node.querySelector(".choice-list");
  const error = node.querySelector(".error-text");
  const groupName = `moment-${momentNumber}`;

  card.dataset.requiredGroup = groupName;
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

function renderMomentQuestions() {
  for (let index = 1; index <= 5; index += 1) {
    momentSections.appendChild(createMomentQuestion(index));
  }
}

function getRadioValue(name) {
  const checked = form.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function validateRequiredGroups() {
  const cards = [...form.querySelectorAll("[data-required-group]")];
  let firstInvalid = null;

  cards.forEach((card) => {
    const groupName = card.dataset.requiredGroup;
    const hasAnswer = Boolean(getRadioValue(groupName));
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
    return `<p>Moment ที่ ${momentNumber}: ${getRadioValue(`moment-${momentNumber}`)}</p>`;
  }).join("");

  return `
    <h3>บันทึกคำตอบเรียบร้อย</h3>
    <p>ประเมินครั้งที่: ${getRadioValue("round")}</p>
    ${momentAnswers}
    <p>ล้างมือ 7 ขั้นตอน: ${getRadioValue("steps")}</p>
  `;
}

renderMomentQuestions();

form.addEventListener("change", (event) => {
  const input = event.target;
  if (!input.matches('input[type="radio"]')) return;

  const card = input.closest("[data-required-group]");
  if (card) {
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
