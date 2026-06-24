"""
Simple Flask server to generate Twilio access tokens for browser calls.

Run: python server.py
Then open: http://localhost:5001
"""

from flask import Flask, render_template, jsonify
from flask_cors import CORS
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
import os

# Initialize Flask with static folder configuration
app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# Twilio credentials - set these in the environment (see .env.example)
TWILIO_ACCOUNT_SID = os.environ['TWILIO_ACCOUNT_SID']
TWILIO_API_KEY = os.environ['TWILIO_API_KEY']
TWILIO_API_SECRET = os.environ['TWILIO_API_SECRET']
TWIML_APP_SID = os.environ['TWIML_APP_SID']


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/token')
def get_token():
    """Generate access token for Twilio Voice SDK."""
    # Create access token
    token = AccessToken(
        TWILIO_ACCOUNT_SID,
        TWILIO_API_KEY,
        TWILIO_API_SECRET,
        identity='relay-test-user'
    )

    # Create Voice grant
    voice_grant = VoiceGrant(
        outgoing_application_sid=TWIML_APP_SID,
        incoming_allow=True  # Allow incoming calls
    )
    token.add_grant(voice_grant)

    return jsonify({'token': token.to_jwt()})


@app.route('/voice', methods=['POST'])
def voice():
    """TwiML response for incoming calls - connects to browser client."""
    from twilio.twiml.voice_response import VoiceResponse, Dial

    response = VoiceResponse()
    dial = Dial()
    dial.client('relay-test-user')  # Must match identity in token
    response.append(dial)

    return str(response), 200, {'Content-Type': 'text/xml'}


if __name__ == '__main__':
    # print("\n" + "="*50)
    # print("Twilio Browser Client Server")
    # print("="*50)
    # print("\nBefore running, set these environment variables:")
    # print("  export TWILIO_ACCOUNT_SID=your_sid")
    # print("  export TWILIO_API_KEY=your_key")
    # print("  export TWILIO_API_SECRET=your_secret")
    # print("  export TWIML_APP_SID=your_twiml_app_sid")
    # print("\nOr edit them directly in server.py")
    # print("\nThen open: http://localhost:5001")
    # print("="*50 + "\n")

    app.run(port=5001, debug=True)
