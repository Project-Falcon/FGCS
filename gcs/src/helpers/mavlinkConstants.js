export const MAV_STATE = [
  'UNINIT',
  'BOOT',
  'CALIBRATING',
  'STANDBY',
  'ACTIVE',
  'CRITICAL',
  'EMERGENCY',
  'POWEROFF',
  'FLIGHT TERMINATION',
]

export const MAV_SEVERITY = [
  'EMERGENCY',
  'ALERT',
  'CRITICAL',
  'ERROR',
  'WARNING',
  'NOTICE',
  'INFO',
  'DEBUG',
]

export const PLANE_MODES_FLIGHT_MODE_MAP = {
  0: 'Manual',
  1: 'CIRCLE',
  2: 'STABILIZE',
  3: 'TRAINING',
  4: 'ACRO',
  5: 'FBWA',
  6: 'FBWB',
  7: 'CRUISE',
  8: 'AUTOTUNE',
  10: 'Auto',
  11: 'RTL',
  12: 'Loiter',
  13: 'TAKEOFF',
  14: 'AVOID_ADSB',
  15: 'Guided',
  17: 'QSTABILIZE',
  18: 'QHOVER',
  19: 'QLOITER',
  20: 'QLAND',
  21: 'QRTL',
  22: 'QAUTOTUNE',
  23: 'QACRO',
  24: 'THERMAL',
  25: 'Loiter to QLand',
}

export const COPTER_MODES_FLIGHT_MODE_MAP = {
  0: 'Stabilize',
  1: 'Acro',
  2: 'AltHold',
  3: 'Auto',
  4: 'Guided',
  5: 'Loiter',
  6: 'RTL',
  7: 'Circle',
  9: 'Land',
  11: 'Drift',
  13: 'Sport',
  14: 'Flip',
  15: 'AutoTune',
  16: 'PosHold',
  17: 'Brake',
  18: 'Throw',
  19: 'Avoid_ADSB',
  20: 'Guided_NoGPS',
  21: 'Smart_RTL',
  22: 'FlowHold',
  23: 'Follow',
  24: 'ZigZag',
  25: 'SystemID',
  26: 'Heli_Autorotate',
}

export const GPS_FIX_TYPES = [
  'NO GPS',
  'NO FIX',
  '2D FIX',
  '3D FIX',
  'DGPS',
  'RTK FLOAT',
  'RTK FIXED',
  'STATIC',
  'PPP',
]

export const MAV_AUTOPILOT_INVALID = 8
