from . import falcon_test
from app.drone import Drone
from flask_socketio.test_client import SocketIOTestClient


@falcon_test()
def test_connection(socketio_client: SocketIOTestClient):
    """Test connecting to socket"""
    socketio_client.emit("/connect")
    socketio_result = socketio_client.get_received()
    assert len(socketio_result) == 0  # No message sent back


@falcon_test(pass_drone_status=True)
def test_disconnect(socketio_client: SocketIOTestClient, droneStatus):
    """Test disconnecting from socket"""
    socketio_client.emit("/disconnect")
    socketio_result = socketio_client.get_received()
    assert len(socketio_result) == 0  # No message sent back

    assert droneStatus.drone is None  # Drone has been reset
    assert droneStatus.state is None  # State has been reset


@falcon_test(pass_drone_status=True)
def test_isConnectedToDrone_no_drone(socketio_client: SocketIOTestClient, droneStatus):
    """Test to see if we're connected to the drone when its not been setup"""
    droneStatus.drone = None
    socketio_client.emit("is_connected_to_drone")
    socketio_result = socketio_client.get_received()

    assert len(socketio_result) == 1  # Only 1 response got
    assert socketio_result[0]["args"] == [False]  # droneStatus.drone is None
    assert (
        socketio_result[0]["name"] == "is_connected_to_drone"
    )  # Correct name emitted back


@falcon_test(pass_drone_status=True, pass_drone=True)
def test_isConnectedToDrone_with_drone(
    socketio_client: SocketIOTestClient, droneStatus, drone: Drone
):
    """Test to see if the drone if we set it up"""
    droneStatus.drone = None
    socketio_client.emit("is_connected_to_drone")
    socketio_result = socketio_client.get_received()

    assert len(socketio_result) == 1  # Only 1 response
    assert socketio_result[0]["args"] == [False]  # droneStatus.drone is set
    assert socketio_result[0]["name"] == "is_connected_to_drone"  # Correct name emitted
