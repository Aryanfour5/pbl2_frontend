import os
import csv
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"csv", "txt"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

BASE_COMMAND = "cleanfusion"  # Ensure this is in PATH


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "CleanFusion API is running"}), 200


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        operation = request.args.get("operation")
        options = request.args.to_dict()

        name_wo_ext = os.path.splitext(filename)[0]
        output_file_path = os.path.join(
            app.config["UPLOAD_FOLDER"], f"{name_wo_ext}_output.csv"
        )

        command = []

        if operation == "assess":
            command = [BASE_COMMAND, "assess", filepath]
        elif operation in ["clean-default", "clean-advanced"]:
            command = [BASE_COMMAND, "clean", filepath, "--output", output_file_path]
            if operation == "clean-advanced":
                if "numerical" in options:
                    command += ["--numerical", options["numerical"]]
                if "categorical" in options:
                    command += ["--categorical", options["categorical"]]
                if "outlier_threshold" in options:
                    command += ["--outlier-threshold", options["outlier_threshold"]]
                if "text_vectorizer" in options:
                    command += ["--text-vectorizer", options["text_vectorizer"]]
        elif operation == "vectorize":
            method = options.get("text_vectorizer", "tfidf")
            command = [
                BASE_COMMAND,
                "vectorize",
                filepath,
                "--method",
                method,
                "--output",
                output_file_path,
            ]
        elif operation == "encode-target":
            target_column = options.get("target")
            if not target_column:
                return (
                    jsonify({"error": "Missing target column for target encoding"}),
                    400,
                )
            command = [
                BASE_COMMAND,
                "encode",
                filepath,
                "--method",
                "label",
                "--output",
                output_file_path,
            ]

        elif operation == "clean-text":
            command = [
                BASE_COMMAND,
                "text",
                filepath,
                "--lowercase",
                "--remove-punctuation",
                "--remove-stopwords",
                "--output",
                output_file_path,
            ]

        else:
            return jsonify({"error": "Invalid operation"}), 400

        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            print("Command executed:", " ".join(command))
            print("Command output:", result.stdout)

            if operation == "assess":
                return jsonify({"assessment": result.stdout})

            if not os.path.exists(output_file_path):
                return jsonify({"error": "Output file was not created"}), 500

            with open(output_file_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                data = list(reader)
                return jsonify({"data": data})

        except subprocess.CalledProcessError as e:
            return jsonify({"error": e.stderr or "Command failed"}), 500

    return jsonify({"error": "Invalid file"}), 400


if __name__ == "__main__":
    app.run(debug=True, port=8000)
