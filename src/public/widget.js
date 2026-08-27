(async function () {
  const script = document.currentScript;
  const widgetId = script.getAttribute("data-widget-id");

  if (!widgetId) {
    console.error("FlyRank: data-widget-id is missing");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/public/widgets/${widgetId}`
    );

    if (!response.ok) {
      throw new Error("Widget could not be loaded");
    }

    const widget = await response.json();

    const container = document.createElement("div");

    container.innerHTML = `
      <div style="
        max-width:400px;
        padding:20px;
        border:1px solid #ddd;
        border-radius:10px;
        font-family:Arial,sans-serif;
      ">
        <h2>${widget.title}</h2>
        <p>${widget.description || ""}</p>

        <input
          type="email"
          placeholder="Your email"
          id="flyrank-email-${widgetId}"
          style="padding:8px;width:90%;margin-bottom:10px;"
        >

        <button
          type="button"
          id="flyrank-submit-${widgetId}"
        >
          ${widget.button_text}
        </button>

        <p id="flyrank-message-${widgetId}"></p>
      </div>
    `;

    document.body.appendChild(container);

    const button = document.getElementById(`flyrank-submit-${widgetId}`);
    const emailInput = document.getElementById(`flyrank-email-${widgetId}`);
    const message = document.getElementById(`flyrank-message-${widgetId}`);

    button.addEventListener("click", async () => {
      const email = emailInput.value.trim();

      if (!email) {
        message.textContent = "Please enter your email.";
        return;
      }
      if (!email.includes("@") || !email.includes(".")) {
        message.textContent = "Please enter a valid email";
        return;
    }

      button.disabled = true;
      message.textContent = "Submitting...";

      try {
        const submitResponse = await fetch(
          `http://localhost:3000/api/public/widgets/${widgetId}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
          }
        );

        const result = await submitResponse.json();

        if (!submitResponse.ok) {
          throw new Error(result.error || "Submission failed");
        }

        message.textContent = "Thank you! Your submission was received.";
        emailInput.value = "";
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
      });
} catch (error) {
  console.error("FlyRank widget error:", error);
}
})();