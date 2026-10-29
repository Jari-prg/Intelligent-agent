
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()

    user_message = data.get("message", "")
    tone = data.get("tone", "Professional")

    # Temporary response until we connect the AI API
    if tone == "Professional":
        response = f"Thank you for your question: {user_message}"

    elif tone == "Casual":
        response = f"Hey! You asked: {user_message}"

    else:
        response = f"Your question: {user_message}"

    return jsonify({"response": response})


if __name__ == "__main__":
    app.run(debug=True)

