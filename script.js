// ==========================================
// NETGUARD - AI-BASED NETWORK TRAFFIC DASHBOARD
// ==========================================


// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const fileInput = document.getElementById("datasetFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const uploadStatus = document.getElementById("uploadStatus");

const totalRecords = document.getElementById("totalRecords");
const normalRecords = document.getElementById("normalRecords");
const anomalyRecords = document.getElementById("anomalyRecords");
const detectionRate = document.getElementById("detectionRate");

const resultsTable = document.getElementById("resultsTable");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const recordCount = document.getElementById("recordCount");

let selectedFile = null;
let detectionData = [];


// ==========================================
// 2. SHOW STATUS MESSAGE
// ==========================================

function showStatus(message, type = "info") {

    if (!uploadStatus) return;

    uploadStatus.textContent = message;
    uploadStatus.className = "upload-status " + type;
}


// ==========================================
// 3. CSV PARSER
// ==========================================

function parseCSV(text) {

    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {

            if (insideQuotes && nextChar === '"') {
                value += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }

        }

        else if (char === "," && !insideQuotes) {

            row.push(value.trim());
            value = "";

        }

        else if ((char === "\n" || char === "\r") && !insideQuotes) {

            if (char === "\r" && nextChar === "\n") {
                i++;
            }

            row.push(value.trim());

            if (row.some(item => item !== "")) {
                rows.push(row);
            }

            row = [];
            value = "";

        }

        else {

            value += char;

        }

    }

    if (insideQuotes) {
        throw new Error("Invalid CSV file: Unclosed quotation mark.");
    }

    row.push(value.trim());

    if (row.some(item => item !== "")) {
        rows.push(row);
    }

    return rows;
}


// ==========================================
// 4. INITIALIZE BAR CHART
// ==========================================

let trafficBarChart = null;

if (typeof Chart !== "undefined") {

    const barCanvas = document.getElementById("trafficBarChart");

    if (barCanvas) {

        trafficBarChart = new Chart(barCanvas, {

            type: "bar",

            data: {

                labels: ["Normal Traffic", "Anomaly Traffic"],

                datasets: [{

                    label: "Traffic Records",

                    data: [0, 0],

                    backgroundColor: [
                        "#22c55e",
                        "#ef4444"
                    ],

                    borderRadius: 6

                }]

            },

            options: {

                responsive: true,
                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }

                }

            }

        });

    }

}


// ==========================================
// 5. INITIALIZE DOUGHNUT CHART
// ==========================================

let trafficPieChart = null;

if (typeof Chart !== "undefined") {

    const pieCanvas = document.getElementById("trafficPieChart");

    if (pieCanvas) {

        trafficPieChart = new Chart(pieCanvas, {

            type: "doughnut",

            data: {

                labels: ["Normal", "Anomaly"],

                datasets: [{

                    data: [0, 0],

                    backgroundColor: [
                        "#22c55e",
                        "#ef4444"
                    ],

                    borderWidth: 0

                }]

            },

            options: {

                responsive: true,
                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        position: "bottom"
                    }

                }

            }

        });

    }

}


// ==========================================
// 6. UPDATE CHARTS
// ==========================================

function updateCharts(normal, anomaly) {

    if (trafficBarChart) {

        trafficBarChart.data.datasets[0].data = [
            normal,
            anomaly
        ];

        trafficBarChart.update();

    }

    if (trafficPieChart) {

        trafficPieChart.data.datasets[0].data = [
            normal,
            anomaly
        ];

        trafficPieChart.update();

    }

}


// ==========================================
// 7. UPDATE DASHBOARD STATISTICS
// ==========================================

function updateStatistics(total, normal, anomaly) {

    const rate = total > 0
        ? ((anomaly / total) * 100).toFixed(2)
        : 0;

    if (totalRecords) {
        totalRecords.textContent = total;
    }

    if (normalRecords) {
        normalRecords.textContent = normal;
    }

    if (anomalyRecords) {
        anomalyRecords.textContent = anomaly;
    }

    if (detectionRate) {
        detectionRate.textContent = rate + "%";
    }

    updateCharts(normal, anomaly);

}


// ==========================================
// 8. SHOW EMPTY STATE
// ==========================================

function showEmptyState(message) {

    if (!resultsTable) return;

    const oldMessage = resultsTable.querySelector(
        '[data-empty-state="true"]'
    );

    if (oldMessage) {
        oldMessage.remove();
    }

    const row = document.createElement("tr");

    row.dataset.emptyState = "true";

    const cell = document.createElement("td");

    cell.colSpan = 3;
    cell.className = "empty-state";
    cell.textContent = message;

    row.appendChild(cell);

    resultsTable.appendChild(row);

}


// ==========================================
// 9. DISPLAY DETECTION RESULTS
// ==========================================

function displayResults(data) {

    if (!resultsTable) return;

    resultsTable.innerHTML = "";

    if (data.length === 0) {

        showEmptyState(
            "No detection records available."
        );

        return;

    }

    data.forEach(record => {

        const row = document.createElement("tr");

        // Record ID
        const idCell = document.createElement("td");

        idCell.textContent = record.record_id;

        // Prediction
        const predictionCell = document.createElement("td");

        const badge = document.createElement("span");

        badge.textContent = record.label;
        badge.className = record.label;

        predictionCell.appendChild(badge);

        // Anomaly Score
        const scoreCell = document.createElement("td");

        scoreCell.textContent = record.score || "Not provided";

        row.appendChild(idCell);
        row.appendChild(predictionCell);
        row.appendChild(scoreCell);

        resultsTable.appendChild(row);

    });

}


// ==========================================
// 10. SEARCH AND FILTER DETECTION LOGS
// ==========================================

function filterRecords() {

    if (!resultsTable) return;

    const searchValue = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const filterValue = filterSelect
        ? filterSelect.value.toLowerCase()
        : "all";

    const rows = Array.from(
        resultsTable.querySelectorAll("tr")
    ).filter(row => row.dataset.emptyState !== "true");

    let visibleCount = 0;

    // No records uploaded
    if (rows.length === 0) {

        showEmptyState(
            "No detection records yet. Upload a CSV file to get started."
        );

        if (recordCount) {
            recordCount.textContent = "Showing 0 records";
        }

        return;

    }

    // Remove previous empty message
    const oldMessage = resultsTable.querySelector(
        '[data-empty-state="true"]'
    );

    if (oldMessage) {
        oldMessage.remove();
    }

    // Apply search and filter
    rows.forEach(row => {

        const recordID = row.cells[0].textContent.toLowerCase();

        const prediction = row.cells[1].textContent.toLowerCase();

        const matchesSearch = recordID.includes(searchValue);

        const matchesFilter =
            filterValue === "all" ||
            prediction === filterValue;

        if (matchesSearch && matchesFilter) {

            row.style.display = "";
            visibleCount++;

        } else {

            row.style.display = "none";

        }

    });

    // No matching results
    if (visibleCount === 0) {

        showEmptyState(
            "No matching records found. Try another search or filter."
        );

    }

    if (recordCount) {

        recordCount.textContent =
            "Showing " + visibleCount + " records";

    }

}


// ==========================================
// 11. RESET DASHBOARD
// ==========================================

function resetDashboard() {

    detectionData = [];

    updateStatistics(0, 0, 0);

    displayResults([]);

    filterRecords();

}


// ==========================================
// 12. FILE SELECTION
// ==========================================

if (fileInput) {

    fileInput.addEventListener("change", function () {

        selectedFile = this.files[0] || null;

        if (!selectedFile) {
            showStatus("No file selected.", "info");
            return;
        }

        const fileName = selectedFile.name.toLowerCase();

        if (!fileName.endsWith(".csv")) {

            selectedFile = null;
            this.value = "";

            showStatus(
                "Please select a valid CSV file.",
                "error"
            );

            return;

        }

        if (selectedFile.size === 0) {

            selectedFile = null;
            this.value = "";

            showStatus(
                "The selected CSV file is empty.",
                "error"
            );

            return;

        }

        if (selectedFile.size > 10 * 1024 * 1024) {

            selectedFile = null;
            this.value = "";

            showStatus(
                "File size must be less than 10 MB.",
                "error"
            );

            return;

        }

        showStatus(
            "File selected: " + selectedFile.name,
            "success"
        );

    });

}


// ==========================================
// 13. ANALYZE CSV FILE
// ==========================================

if (analyzeBtn) {

    analyzeBtn.addEventListener("click", function () {

        if (!selectedFile) {

            showStatus(
                "Please select a CSV file first.",
                "error"
            );

            return;

        }

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = "Analyzing...";

        showStatus(
            "Reading and analyzing CSV file...",
            "info"
        );

        const reader = new FileReader();

        reader.onload = function (event) {

            try {

                const csvRows = parseCSV(event.target.result);

                if (csvRows.length < 2) {

                    throw new Error(
                        "CSV file does not contain any records."
                    );

                }

                // Read headers
                const headers = csvRows[0].map(header =>
                    header.trim().toLowerCase()
                );

                const idIndex = headers.indexOf("record_id");
                const labelIndex = headers.indexOf("label");

                const scoreIndex = headers.findIndex(header =>
                    header === "anomaly_score" ||
                    header === "score"
                );

                if (idIndex === -1 || labelIndex === -1) {

                    throw new Error(
                        "CSV must contain record_id and label columns."
                    );

                }

                const validRecords = [];
                let skippedRecords = 0;

                // Read data rows
                for (let i = 1; i < csvRows.length; i++) {

                    const columns = csvRows[i];

                    if (columns.length !== headers.length) {
                        skippedRecords++;
                        continue;
                    }

                    const recordID = columns[idIndex].trim();

                    const label = columns[labelIndex]
                        .trim()
                        .toLowerCase();

                    const score = scoreIndex !== -1
                        ? columns[scoreIndex].trim()
                        : "";

                    if (!recordID) {
                        skippedRecords++;
                        continue;
                    }

                    if (
                        label !== "normal" &&
                        label !== "anomaly"
                    ) {

                        skippedRecords++;
                        continue;

                    }

                    validRecords.push({

                        record_id: recordID,

                        label: label,

                        score: score || "Not provided"

                    });

                }

                if (validRecords.length === 0) {

                    throw new Error(
                        "No valid Normal or Anomaly records found in the CSV file."
                    );

                }

                // Save records
                detectionData = validRecords;

                // Count records
                const normal = detectionData.filter(
                    record => record.label === "normal"
                ).length;

                const anomaly = detectionData.filter(
                    record => record.label === "anomaly"
                ).length;

                const total = detectionData.length;

                // Update dashboard
                updateStatistics(total, normal, anomaly);

                displayResults(detectionData);

                filterRecords();

                let message =
                    "Analysis completed successfully! " +
                    total + " records processed.";

                if (skippedRecords > 0) {

                    message +=
                        " " + skippedRecords + " invalid records skipped.";

                }

                showStatus(message, "success");

            }

            catch (error) {

                showStatus(
                    error.message || "Unable to process CSV file.",
                    "error"
                );

                console.error("CSV Processing Error:", error);

            }

            finally {

                analyzeBtn.disabled = false;
                analyzeBtn.textContent = "Analyze Traffic";

            }

        };

        reader.onerror = function () {

            showStatus(
                "Error reading the selected file.",
                "error"
            );

            analyzeBtn.disabled = false;
            analyzeBtn.textContent = "Analyze Traffic";

        };

        reader.readAsText(selectedFile);

    });

}


// ==========================================
// 14. SEARCH EVENT
// ==========================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        filterRecords
    );

}


// ==========================================
// 15. FILTER EVENT
// ==========================================

if (filterSelect) {

    filterSelect.addEventListener(
        "change",
        filterRecords
    );

}


// ==========================================
// 16. SIDEBAR NAVIGATION
// ==========================================

const menuLinks = document.querySelectorAll(
    ".menu a, .sidebar a"
);

menuLinks.forEach(link => {

    link.addEventListener("click", function () {

        menuLinks.forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

    });

});


// ==========================================
// 17. INITIAL DASHBOARD STATE
// ==========================================

resetDashboard();

showStatus(
    "Dashboard ready. Upload a CSV file to begin.",
    "info"
);