from app import socketio, logger
import app.droneStatus as droneStatus

@socketio.on("get_frame_config")
def getFrameDetails() -> None:
    """
    Sends the current frame class and frame type of the drone to the frontend. Only works when on the motor test panel of config page
    """

    if droneStatus.state != 'config.motor_test':
        socketio.emit(
            "params_error",
            {"message":"You must be on the motor test section of the config page to access the frame details"}
        )
        logger.debug(f"Current state: {droneStatus.state}")
        return

    if not droneStatus.drone:
        return

    frameType = droneStatus.drone.frame.frameType
    frameClass = droneStatus.drone.frame.frameClass
    socketio.emit("frame_config",{"frame_type":frameType},{"frame_class":frameClass})