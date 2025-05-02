import { useState, useEffect } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { Sun, Moon, FileUp, Download, Database, Play } from "lucide-react";
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [operation, setOperation] = useState("assess");
  const [response, setResponse] = useState("");
  const [parsedReport, setParsedReport] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [options, setOptions] = useState({
    numerical: "",
    categorical: "",
    outlier_threshold: "",
    text_vectorizer: "",
    target: "",
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("cleanfusion-theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("cleanfusion-theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("cleanfusion-theme", "light");
    }
  }, [darkMode]);

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
      if (operation === "encode-target") {
        if (options.target) queryParams.append("target", options.target);
      }

      const res = await axios.post(
        `https://pbl2-frontend.onrender.com/upload?${queryParams.toString()}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const result = res.data.assessment || res.data.data;

      if (operation.startsWith("clean") || operation === "vectorize" || operation === "encode-target") {
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

  const resetForm = () => {
    setFile(null);
    setResponse("");
    setParsedReport(null);
    setTableData(null);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "dark" : ""}`}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4 text-xl font-bold text-blue-700 dark:text-blue-300">
                CleanFusion
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="nav-link">Dashboard</a>
              <a href="#" className="nav-link">Docs</a>
              <a href="https://github.com/Aryanfour5/CleanFusion"
                className="nav-link"
                target="_blank"
                rel="noopener noreferrer">
                GitHub
              </a>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="dark-mode-toggle"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="icon" />
                ) : (
                  <Moon className="icon" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="content-container">
            <div className="p-6 md:p-8">
              <h1 className="heading">
                <Database className="mr-2 h-8 w-8" />
                CleanFusion
              </h1>

              <div className="space-y-6">
                <div className="file-upload-container">
                  <label className="label">Upload File:</label>
                  <div className="file-upload">
                    <label className="file-upload-label">
                      <input
                        type="file"
                        onChange={(e) => {
                          setFile(e.target.files[0]);
                          setResponse("");
                          setParsedReport(null);
                          setTableData(null);
                        }}
                        className="hidden"
                      />
                      <FileUp className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">
                        {file ? file.name : "Select a CSV file"}
                      </span>
                    </label>
                    {file && (
                      <button
                        onClick={resetForm}
                        className="reset-button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="operation-container">
                  <label className="label">Select Operation:</label>
                  <select
                    value={operation}
                    onChange={(e) => {
                      setOperation(e.target.value);
                      setResponse("");
                      setParsedReport(null);
                      setTableData(null);
                    }}
                    className="select"
                  >
                    <option value="assess">📝 Assess CSV</option>
                    <option value="clean-default">🧹 Clean CSV (Default)</option>
                    <option value="clean-advanced">🧼 Clean CSV (Advanced)</option>
                    <option value="vectorize">🧠 Vectorize</option>
                    <option value="encode-target">🎯 Encode (Target)</option>
                  </select>
                </div>

                {operation === "clean-advanced" && (
                  <div className="advanced-options-container">
                    <label className="label">Advanced Options:</label>
                    <div className="grid-container">
                      <input
                        type="text"
                        placeholder="Numerical"
                        value={options.numerical}
                        onChange={(e) => setOptions({ ...options, numerical: e.target.value })}
                        className="input"
                      />
                      <input
                        type="text"
                        placeholder="Categorical"
                        value={options.categorical}
                        onChange={(e) => setOptions({ ...options, categorical: e.target.value })}
                        className="input"
                      />
                      <input
                        type="text"
                        placeholder="Outlier Threshold"
                        value={options.outlier_threshold}
                        onChange={(e) => setOptions({ ...options, outlier_threshold: e.target.value })}
                        className="input"
                      />
                      <input
                        type="text"
                        placeholder="Text Vectorizer"
                        value={options.text_vectorizer}
                        onChange={(e) => setOptions({ ...options, text_vectorizer: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {operation === "encode-target" && (
                  <div className="target-column-container">
                    <label className="label">Target Column:</label>
                    <input
                      type="text"
                      placeholder="e.g., TargetColumn"
                      value={options.target}
                      onChange={(e) => setOptions({ ...options, target: e.target.value })}
                      className="input"
                    />
                  </div>
                )}

                <div className="action-buttons">
                  <button
                    onClick={handleFileUpload}
                    className="action-button"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : <Play className="icon" />}
                  </button>
                </div>

                {response && (
                  <div className="response-container">
                    <h2>Results</h2>
                    <div className="response">
                      {parsedReport ? (
                        <div className="parsed-report">
                          {parsedReport.map((section, index) => (
                            <div key={index}>
                              <h3 className="section-title">{section.title}</h3>
                              <ul>
                                {section.content.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>{response}</div>
                      )}
                    </div>
                  </div>
                )}

                {tableData && (
                  <div className="table-container">
                    <div className="table-header">
                      <h2>Cleaned Data</h2>
                      <button
                        onClick={downloadCSV}
                        className="download-button"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Download CSV
                      </button>
                    </div>
                    <table className="table">
                      <thead>
                        <tr>
                          {Object.keys(tableData[0]).map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, i) => (
                              <td key={i}>{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
