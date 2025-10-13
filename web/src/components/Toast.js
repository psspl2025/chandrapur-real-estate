// web/src/components/useToast.js
// Tiny toast utility (no dependency)
export function toast(message, opts = {}) {
  const { timeout = 2200 } = opts;
  const el = document.createElement("div");
  el.className =
    "fixed bottom-4 right-4 z-[9999] px-3 py-2 rounded-md bg-slate-800 text-slate-100 shadow-lg border border-slate-700";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .2s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, timeout);
}
