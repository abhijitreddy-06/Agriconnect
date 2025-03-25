document.addEventListener("DOMContentLoaded", () => {
  const micButton = document.getElementById("micButton");
  const micStatus = document.getElementById("micStatus");
  const descriptionField = document.getElementById("description");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const uploadForm = document.getElementById("uploadForm");

  // Image preview functionality
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  // Setup speech-to-text using the Web Speech API
  let recognition;
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    // Update mic status when speech recognition starts
    recognition.addEventListener("start", () => {
      micStatus.innerText = "Listening, please speak...";
    });

    // Clear status when speech recognition ends
    recognition.addEventListener("end", () => {
      micStatus.innerText = "";
    });
  } else {
    micButton.style.display = "none";
  }

  micButton.addEventListener("click", () => {
    if (recognition) {
      recognition.start();
    }
  });

  if (recognition) {
    recognition.addEventListener("result", (e) => {
      const transcript = e.results[0][0].transcript;
      descriptionField.value += transcript;
    });
  }

  // Handle form submission: upload image, description, and language, then analyze
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(uploadForm);
    try {
      // Upload image, description, and language
      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        // Call the analyze endpoint using the returned predictionId
        const analysisResponse = await fetch("/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ predictionId: result.predictionId }),
        });
        const analysisResult = await analysisResponse.json();
        if (analysisResult.success) {
          // Redirect to the prediction page with the returned predictionId
          window.location.href = `/prediction.html?id=${result.predictionId}`;
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  });
});
