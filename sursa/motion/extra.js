// Voucherul pe e-mail, roata norocului și cardul de fidelitate.
// Codul pe e-mail trece prin Supabase; roata și ștampilele se țin pe telefon (localStorage), deci sunt pentru demonstrație.
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

function setupWelcome() {
  const dialog = document.querySelector("dialog.welcome");
  const pill = document.querySelector(".voucher-pill");
  if (!dialog || !config) return;
  const steps = Object.fromEntries([...dialog.querySelectorAll(".welcome-step")].map((el) => [el.dataset.step, el]));
  const live = Boolean(config.supabaseUrl && config.supabaseKey);
  let email = "";
  let demoCode = "";

  function go(name) {
    for (const [key, el] of Object.entries(steps)) el.hidden = key !== name;
    steps[name].querySelector("input")?.focus();
  }
  function fail(step, message) {
    steps[step].querySelector(".welcome-error").textContent = message;
  }
  function open() {
    if (!dialog.open) dialog.showModal();
  }

  function showVoucher(voucher) {
    const qr = qrcode(0, "M");
    qr.addData(`CAF VOUCHER ESPRESSO ${voucher.code} PANA LA ${voucher.until}`);
    qr.make();
    const ticket = steps.voucher;
    ticket.querySelector(".ticket-qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    ticket.querySelector(".ticket-code").textContent = "CAF-" + voucher.code;
    ticket.querySelector(".ticket-until").textContent = "Valabil până pe " + human(voucher.until);
    go("voucher");
    pill.hidden = false;
  }

  // Supabase trimite codul și îl verifică pe server; fără chei, pagina rulează în mod demonstrație.
  async function auth(path, body) {
    const response = await fetch(config.supabaseUrl.replace(/\/$/, "") + "/auth/v1/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.supabaseKey },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.error_description || "eroare");
    return data;
  }

  steps.email.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = steps.email.querySelector("input[type=email]");
    const consent = steps.email.querySelector("input[type=checkbox]");
    fail("email", "");
    if (!input.checkValidity() || !input.value.trim()) return fail("email", "Scrie o adresă de e-mail validă.");
    if (!consent.checked) return fail("email", "Bifează acordul, ca să-ți putem trimite codul.");
    email = input.value.trim().toLowerCase();
    const button = steps.email.querySelector("button");
    button.disabled = true;
    try {
      if (live) {
        await auth("otp", { email, create_user: true });
      } else {
        demoCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
        const note = steps.code.querySelector(".welcome-demo");
        note.textContent = `Mod demonstrație: în varianta finală codul vine pe e-mail. Codul tău este ${demoCode}.`;
        note.hidden = false;
      }
      steps.code.querySelector(".welcome-to").textContent = email;
      go("code");
    } catch {
      fail("email", "Nu am putut trimite codul acum. Încearcă din nou în câteva minute.");
    } finally {
      button.disabled = false;
    }
  });

  steps.code.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = steps.code.querySelector("input").value.trim();
    fail("code", "");
    if (!/^\d{6}$/.test(token)) return fail("code", "Codul are 6 cifre.");
    const button = steps.code.querySelector("button");
    button.disabled = true;
    try {
      if (live) {
        const session = await auth("verify", { type: "email", email, token });
        // Un singur voucher pe adresă: contul trebuie să fie nou.
        const created = Date.parse(session.user?.created_at || 0);
        if (Date.now() - created > 30 * 60 * 1000) {
          return fail("code", "Pe adresa asta s-a dat deja un voucher. Ne vedem la o cafea!");
        }
      } else if (token !== demoCode) {
        return fail("code", "Codul nu se potrivește. Verifică e-mailul.");
      }
      const voucher = { code: code(), until: isoDay(day(30)), email };
      store.set("caf-voucher", voucher);
      showVoucher(voucher);
    } catch {
      fail("code", "Codul nu e bun sau a expirat. Cere altul.");
    } finally {
      button.disabled = false;
    }
  });

  dialog.querySelector(".welcome-back").addEventListener("click", () => go("email"));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {
    if (!store.get("caf-voucher")) store.set("caf-voucher-amanat", Date.now());
  });
  pill.addEventListener("click", open);
  // Butonul apare doar după prima secțiune, ca să nu acopere butoanele de sus.
  const togglePill = () => pill.classList.toggle("is-visible", scrollY > innerHeight * .7);
  addEventListener("scroll", togglePill, { passive: true });
  togglePill();

  const saved = store.get("caf-voucher");
  if (saved) {
    showVoucher(saved);
    return;
  }
  // Fereastra apare singură la intrare; dacă a închis-o, nu mai insistăm o săptămână.
  const later = store.get("caf-voucher-amanat");
  if (!later || Date.now() - later > 7 * 864e5) setTimeout(open, 1800);
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

setupWelcome();
setupWheel();
setupLoyalty();
