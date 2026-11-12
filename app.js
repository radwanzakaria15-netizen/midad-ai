const titles = {
  home: "مرحباً بك في مِداد",
  text: "توليد النصوص",
  image: "توليد الصور",
  audio: "استوديو الصوت",
  video: "استوديو الفيديو"
};
const descriptions = {
  text: ["استوديو الكتابة", "توليد النصوص", "اكتب طلبك للحصول على مساعدة في الكتابة أو التلخيص أو الشرح."],
  image: ["استوديو الصور", "توليد الصور", "صف الصورة التي تريد إنشاءها."],
  audio: ["استوديو الصوت", "توليد الصوت", "اكتب النص أو صف المهمة الصوتية المطلوبة."],
  video: ["استوديو الفيديو", "توليد الفيديو", "صف المشهد أو المقطع الذي تريد إنتاجه."]
};
const views = [...document.querySelectorAll(".view")];
let currentView = "text";

function showView(name) {
  views.forEach(view => view.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === name));
  document.getElementById("pageTitle").textContent = titles[name] || titles.home;
  document.getElementById(name === "home" ? "view-home" : "view-generator").classList.add("active");
  document.getElementById("sidebar").classList.remove("open");
  if (name !== "home") {
    currentView = name;
    const d = descriptions[name];
    document.getElementById("toolEyebrow").textContent = d[0];
    document.getElementById("toolTitle").textContent = d[1];
    document.getElementById("toolDescription").textContent = d[2];
    document.getElementById("prompt").placeholder = d[2];
    document.getElementById("resultText").textContent = "ستظهر النتيجة هنا بعد إرسال الطلب.";
    const oldImage = document.getElementById("generatedImage");
    if (oldImage) oldImage.remove();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
document.getElementById("menuBtn").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

document.getElementById("generateBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value.trim();
  const output = document.getElementById("resultText");
  const button = document.getElementById("generateBtn");
  const language = document.getElementById("language").value;
  const resultPanel = document.getElementById("resultPanel");
  const oldImage = document.getElementById("generatedImage");
  if (oldImage) oldImage.remove();
  if (!prompt) { output.textContent = "اكتب وصفاً أولاً ثم أرسل طلبك."; return; }
  if (currentView !== "text" && currentView !== "image") {
    output.textContent = "محرك هذه الوحدة لم يُربط بعد. المتاح حالياً هو النصوص والصور.";
    return;
  }
  button.disabled = true;
  button.textContent = "جارٍ التوليد...";
  output.textContent = currentView === "image" ? "يعمل محرك الصور على إنشاء صورتك. قد يستغرق ذلك بعض الوقت..." : "يعمل النموذج الآن على إعداد إجابتك...";
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: currentView, prompt, language })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "تعذر تنفيذ الطلب.");
    if (currentView === "image") {
      output.textContent = data.output || "تم إنشاء الصورة.";
      const img = document.createElement("img");
      img.id = "generatedImage";
      img.src = data.image;
      img.alt = prompt;
      img.style.display = "block";
      img.style.width = "100%";
      img.style.maxWidth = "680px";
      img.style.height = "auto";
      img.style.borderRadius = "12px";
      img.style.marginTop = "16px";
      img.style.border = "1px solid #486057";
      resultPanel.appendChild(img);
    } else {
      output.textContent = data.output;
    }
  } catch (error) {
    output.textContent = error.message || "حدث خطأ أثناء الاتصال بمحرك التوليد.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'إرسال الطلب <b>←</b>';
  }
});
