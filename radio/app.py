import time

from utils import getComPort
from drone import Drone

from flask import Flask
from flask_socketio import SocketIO

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret-key"

socketio = SocketIO(app, cors_allowed_origins="*")

port = getComPort()
drone = Drone(port, wireless=True)

state = None

@app.route("/")
def index():
    return "Hello World!"


@socketio.on("connect")
def connection():
    print("Client connected!")


@socketio.on("disconnect")
def disconnect():
    print("Client disconnected!")

@socketio.on('set_state')
def set_state(data):
    state = data.get('state')

    if state == 'dashboard':
        drone.setupDataStreams()
        drone.addMessageListener("VFR_HUD", sendMessage)
        drone.addMessageListener("BATTERY_STATUS", sendMessage)
        drone.addMessageListener("ATTITUDE", sendMessage)
        drone.addMessageListener("GLOBAL_POSITION_INT", sendMessage)
    elif state == 'config':
        drone.stopAllDataStreams()
        drone.getAllParams()

        timeout = time.time() + 60*3   # 3 minutes from now
        last_index_sent = -1
        while drone.is_requesting_params:
            if time.time() > timeout:
                socketio.emit('error', {'message': 'Parameter request timed out after 3 minutes.'})
                return
                
            if last_index_sent != drone.current_param_index: 
                socketio.emit('param_request_update', {'current_param_index': drone.current_param_index, 'total_number_of_params': drone.total_number_of_params})
                last_index_sent = drone.current_param_index
        socketio.emit('params', drone.params)
        
            
        
        # drone.addMessageListener('PARAM_VALUE', sendMessage)

def sendMessage(msg):
    data = msg.to_dict()
    data['timestamp'] = msg._timestamp
    socketio.emit("incoming_msg", data)

if __name__ == "__main__":
    socketio.run(app, allow_unsafe_werkzeug=True)
