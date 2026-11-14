// Voucherul, roata norocului și cardul de fidelitate.
// Totul se ține pe telefonul clientului (localStorage). E o demonstrație: o versiune reală are nevoie de un server.
import qrcode from "qrcode-generator";

const config = JSON.parse(document.getElementById("extra-config")?.textContent || "null");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* fără memorie: merge doar acum */ } }
};
const day = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
};
const isoDay = (date) => date.toISOString().slice(0, 10);
const human = (iso) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long" });
const code = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return [...bytes].map((b) => letters[b % letters.length]).join("");
};

function setupVoucher() {
  const button = document.querySelector("[data-voucher]");
  const ticket = document.querySelector(".ticket");
  if (!button || !ticket) return;

  function show(voucher) {
    const qr = qrcode(0, "M");
    qr.addData(`CAF VOUCHER ESPRESSO ${voucher.code} PANA LA ${voucher.until}`);
    qr.make();
    ticket.querySelector(".ticket-qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    ticket.querySelector(".ticket-code").textContent = "CAF-" + voucher.code;
    ticket.querySelector(".ticket-until").textContent = "Valabil până pe " + human(voucher.until);
    ticket.hidden = false;
    button.hidden = true;
  }

  const saved = store.get("caf-voucher");
  if (saved) show(saved);
  button.addEventListener("click", () => {
    const voucher = { code: code(), until: isoDay(day(30)) };
    store.set("caf-voucher", voucher);
    show(voucher);
  });
}

function setupWheel() {
  const button = document.querySelector("[data-spin]");
  const wheel = document.querySelector(".wheel");
  const result = document.querySelector(".wheel-result");
  if (!button || !wheel || !config) return;
  const slice = 360 / config.prizes.length;
  let turned = 0;

  function announce(spin) {
    result.innerHTML = "";
    const prize = document.createElement("strong");
    prize.textContent = config.prizes[spin.index];
    const detail = document.createElement("span");
    detail.textContent = `Cod CAF-${spin.code}. Arată ecranul la bar. ${config.wheelValid}`;
    result.append("Ai câștigat: ", prize, detail);
  }

  function lock() {
    button.disabled = true;
    button.textContent = "Revino mâine";
  }

  const saved = store.get("caf-roata");
  if (saved && saved.date === isoDay(day())) {
    turned = 360 - (saved.index + .5) * slice;
    wheel.style.transform = `rotate(${turned}deg)`;
    announce(saved);
    lock();
  }

  button.addEventListener("click", () => {
    const index = crypto.getRandomValues(new Uint32Array(1))[0] % config.prizes.length;
    const spin = { index, code: code(), date: isoDay(day()) };
    // Câteva ture întregi, apoi felia câștigătoare se oprește sub ac.
    turned += 360 * 5 + (360 - (index + .5) * slice - (turned % 360) + 360) % 360;
    button.disabled = true;
    result.textContent = "";
    wheel.style.transform = `rotate(${turned}deg)`;
    const done = () => { store.set("caf-roata", spin); announce(spin); lock(); };
    if (calm) done();
    else wheel.addEventListener("transitionend", done, { once: true });
  });
}

function setupLoyalty() {
  const form = document.querySelector(".stamp-form");
  const cups = [...document.querySelectorAll(".stamps li")];
  const status = document.querySelector(".stamp-status");
  if (!form || !config) return;
  let count = store.get("caf-stampile") || 0;

  function render(message) {
    cups.forEach((cup, i) => cup.classList.toggle("is-stamped", i < count));
    const left = config.stamps - count;
    status.textContent = message || (left > 0
      ? `${count} din ${config.stamps}. Încă ${left} până la cafeaua din partea casei.`
      : "Cafeaua următoare e din partea casei. Arată ecranul la bar.");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    if (input.value !== config.pin) {
      render("Codul nu e bun. Barista îl are la bar.");
      input.select();
      return;
    }
    input.value = "";
    if (count >= config.stamps) {
      count = 0;
      store.set("caf-stampile", count);
      render("Cafeaua gratuită a fost oferită. Cardul începe din nou.");
      return;
    }
    count += 1;
    store.set("caf-stampile", count);
    render();
    cups[count - 1]?.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: calm ? 0 : 300, easing: "cubic-bezier(.16,1,.3,1)" });
  });

  render();
}

setupVoucher();
setupWheel();
setupLoyalty();
