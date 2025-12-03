// Загружаем базу: сначала ищем в localStorage
async function loadCases() {
    let saved = localStorage.getItem("cases");

    if (saved) {
        console.log("Загружено из localStorage");
        return JSON.parse(saved);
    }

    console.log("Загружаем из CSV впервые…");

    // Если в localStorage нет — берём CSV
    const res = await fetch("case_database_4000.csv");
    const text = await res.text();
    const rows = text.split("\n").map(r => r.split(","));

    // Сохраняем
    localStorage.setItem("cases", JSON.stringify(rows));

    return rows;
}

// Показываем дела на странице
function displayCases(cases) {
    const out = document.getElementById("output");
    out.innerHTML = "";

    for (let i = 0; i < 20; i++) {   // показываем первые 20
        const row = cases[i];
        out.innerHTML += `<p>${row.join(" | ")}</p>`;
    }
}

// Очистка localStorage (по кнопке)
function clearStorage() {
    localStorage.removeItem("cases");
    alert("localStorage очищен! Перезагрузите страницу.");
}

// Старт
loadCases().then(cases => {
    displayCases(cases);
});
