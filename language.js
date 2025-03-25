// Replace with your actual LARA credentials
const LARA_ACCESS_KEY_ID = "ABC123...";
const LARA_ACCESS_KEY_SECRET = "aBc123...";

// 1) Initialize LARA
const credentials = new Credentials(LARA_ACCESS_KEY_ID, LARA_ACCESS_KEY_SECRET);
const lara = new Translator(credentials);

// 2) Helper functions to fetch & replace text in the DOM
async function translateElementText(element, sourceLang, targetLang) {
  // Get the original text
  const originalText = element.innerText.trim();
  if (!originalText) return; // Skip empty text

  try {
    // Call LARA’s translate endpoint
    const res = await lara.translate(originalText, sourceLang, targetLang);
    element.innerText = res.translation; // Replace text with the translation
  } catch (err) {
    console.error("Translation error:", err);
  }
}

async function translatePage(sourceLang, targetLang) {
  // Grab all elements marked for translation
  const translatableElements = document.querySelectorAll("[data-translate]");

  // Translate each element’s text content
  for (const el of translatableElements) {
    await translateElementText(el, sourceLang, targetLang);
  }
}

// 3) Hook up the "Language" button to trigger translation
document.addEventListener("DOMContentLoaded", () => {
  const langBtn = document.getElementById("languageBtn");
  if (langBtn) {
    langBtn.addEventListener("click", async () => {
      // For example, if you want to toggle between English and Kannada:
      // "en-US" → "kn-IN" (check LARA docs for correct locale codes)
      await translatePage("en-US", "kn-IN");
      console.log("Page translated to Kannada");
    });
  }
});
