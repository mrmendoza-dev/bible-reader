import { registerSW } from "virtual:pwa-register";

// This is used for periodic checking for new content
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user about a new version being available
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
});
