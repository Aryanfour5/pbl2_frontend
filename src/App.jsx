import { useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";

function App() {
  const [file, setFile] = useState(null);
  const [operation, setOperation] = useState("assess");
  const [response, setResponse] = useState("");
  const [parsedReport, setParsedReport] = useState(null);
  const [tableData, setTableData] = useState(null); // renamed from cleanedData
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    numerical: "",
    categorical: "",
    outlier_threshold: "",
    text_vectorizer: "",
  });

  const handleFileUpload = async () => {
    if (!file) return alert("Please upload a file.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ operation });

      if (operation === "clean-advanced") {
        if (options.numerical) queryParams.append("numerical", options.numerical);
        if (options.categorical) queryParams.append("categorical", options.categorical);
        if (options.outlier_threshold) queryParams.append("outlier_threshold", options.outlier_threshold);
        if (options.text_vectorizer) queryParams.append("text_vectorizer", options.text_vectorizer);
      }

      const res = await axios.post(
        `http://localhost:8000/upload?${queryParams.toString()}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const result = res.data.assessment || res.data.data;

      // ✅ Apply to both clean and vectorize
      if (operation.startsWith("clean") || operation === "vectorize") {
        setTableData(result);
      } else {
        setResponse(result);
      }

      if (typeof result === "string") {
        parseReport(result);
      } else {
        setParsedReport(null);
      }
    } catch (err) {
      setResponse("❌ Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!tableData) return;

    const csvHeaders = Object.keys(tableData[0]).join(",");
    const csvRows = tableData.map((row) =>
      Object.values(row).map((value) => `"${value}"`).join(",")
    );

    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "output.csv");
  };

  const parseReport = (text) => {
    const lines = text.split("\n");
    const section = { title: "", content: [] };
    const sections = [];

    lines.forEach((line) => {
      if (line.startsWith("## ")) {
        if (section.title) sections.push({ ...section });
        section.title = line.replace("## ", "").trim();
        section.content = [];
      } else if (line.trim() !== "") {
        section.content.push(line.trim());
      }
    });

    if (section.title) sections.push(section);
    setParsedReport(sections);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow-md">
        <h1 className="text-3xl font-bold text-blue-700 mb-6 text-center">
          🧼 CleanFusion UI
        </h1>

        <div className="mb-6">
          <label className="block mb-2 text-gray-700 font-medium">
            Upload CSV File:
          </label>
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setResponse("");
              setParsedReport(null);
              setTableData(null);
            }}
            className="w-full border border-gray-300 p-2 rounded"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-gray-700 font-medium">
            Select Operation:
          </label>
          <select
            value={operation}
            onChange={(e) => {
              setOperation(e.target.value);
              setResponse("");
              setParsedReport(null);
              setTableData(null);
            }}
            className="w-full border border-gray-300 p-2 rounded"
          >
            <option value="assess">📝 Assess CSV</option>
            <option value="clean-default">🧹 Clean CSV (Default)</option>
            <option value="clean-advanced">🧼 Clean CSV (Advanced)</option>
            <option value="vectorize">🧠 Vectorize</option>
          </select>
        </div>

        {operation === "clean-advanced" && (
          <div className="mb-6">
            <label className="block mb-2 text-gray-700 font-medium">
              Advanced Options:
            </label>
            <input
              type="text"
              placeholder="Numerical"
              value={options.numerical}
              onChange={(e) => setOptions({ ...options, numerical: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded mb-2"
            />
            <input
              type="text"
              placeholder="Categorical"
              value={options.categorical}
              onChange={(e) => setOptions({ ...options, categorical: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded mb-2"
            />
            <input
              type="text"
              placeholder="Outlier Threshold"
              value={options.outlier_threshold}
              onChange={(e) => setOptions({ ...options, outlier_threshold: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded mb-2"
            />
            <input
              type="text"
              placeholder="Text Vectorizer"
              value={options.text_vectorizer}
              onChange={(e) => setOptions({ ...options, text_vectorizer: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded mb-2"
            />
          </div>
        )}

        <button
          onClick={handleFileUpload}
          disabled={loading}
          className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "⏳ Processing..." : "🚀 Run Command"}
        </button>

        {tableData && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📄 Output Table
            </h2>
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr>
                  {tableData[0] &&
                    Object.keys(tableData[0]).map((key) => (
                      <th key={key} className="px-4 py-2 text-left border-b">
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-2 border-b">
                        {typeof value === "object" ? JSON.stringify(value) : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={downloadCSV}
              className="mt-4 bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700 transition"
            >
              💾 Download CSV
            </button>
          </div>
        )}

        {parsedReport && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📄 Report Output
            </h2>
            <div className="space-y-6">
              {parsedReport.map((sec, idx) => (
                <div key={idx}>
                  <h3 className="text-lg font-bold text-blue-700 mb-2">
                    {sec.title}
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {sec.content.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {!parsedReport && response && (
          <div className="mt-6 bg-gray-50 border border-gray-300 p-4 rounded shadow">
            <pre className="text-sm whitespace-pre-wrap text-gray-800 font-mono">
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
