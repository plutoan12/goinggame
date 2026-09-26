// No adapter means no ad and no reward. The native adapter resolves "earned"
// only after a reward event AND dismissal; local preview is browser-only.
export function createAdService(adapter = async () => "unavailable") {
  let pending = false;
  return {
    async rewarded(placement) {
      if (pending) return "busy";
      pending = true;
      try {
        const result = await adapter(placement);
        return ["earned", "cancelled", "unavailable"].includes(result)
          ? result
          : "unavailable";
      } catch {
        return "unavailable";
      } finally {
        pending = false;
      }
    },
  };
}

export function showAdPreview(dialog, placement) {
  return new Promise((resolve) => {
    dialog.querySelector("[data-ad-placement]").textContent = placement;
    const onClose = () => {
      dialog.removeEventListener("close", onClose);
      resolve(dialog.returnValue || "cancelled");
    };
    dialog.returnValue = "cancelled";
    dialog.addEventListener("close", onClose);
    dialog.showModal();
  });
}
