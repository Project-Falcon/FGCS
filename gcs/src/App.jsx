import { useEffect, useState } from 'react'

import { useLocalStorage } from '@mantine/hooks'
import moment from 'moment'
import { AttitudeIndicator } from './components/indicator'
import InfoCard from './components/infoCard'
import Layout from './components/layout'
import MapSection from './components/map'
import { socket } from './socket'

export default function App() {
  const [connected] = useLocalStorage({
    key: 'connectedToDrone',
    defaultValue: false,
  })
  const [telemetryData, setTelemetryData] = useState({})
  const [gpsData, setGpsData] = useState({})
  const [attitudeData, setAttitudeData] = useState({ roll: 0, pitch: 0 })
  const [batteryData, setBatteryData] = useState({})
  const [time, setTime] = useState(null)

  useEffect(() => {
    if (!connected) {
      setTelemetryData({})
      setGpsData({})
      setBatteryData({})
      setTime(null)
      return
    } else {
      socket.emit('set_state', { state: 'dashboard' })
    }

    socket.on('incoming_msg', (msg) => {
      switch (msg.mavpackettype) {
        case 'VFR_HUD':
          setTelemetryData(msg)
          break
        case 'BATTERY_STATUS':
          setBatteryData(msg)
          break
        case 'ATTITUDE':
          setAttitudeData(msg)
          break
        case 'GLOBAL_POSITION_INT':
          setGpsData(msg)
          break
        default:
          break
      }
      setTime(moment.unix(msg.timestamp))
    })

    return () => {
      socket.off('incoming_msg')
    }
  }, [connected])

  return (
    <Layout currentPage="dashboard">
      <div className="flex w-full h-full flex-auto relative">
        <div className="w-full">
          <MapSection data={gpsData} />
        </div>
        <div className="absolute top-0 left-0">
          <AttitudeIndicator
            roll={attitudeData.roll * (180 / Math.PI)}
            pitch={attitudeData.pitch * (180 / Math.PI)}
            size="300px"
          />
        </div>
        <div className="w-1/3 absolute bottom-0 left-0">
          <InfoCard text="Altitude" metric={telemetryData['alt']} unit="m" />
          <InfoCard
            text="Airspeed"
            metric={telemetryData['airspeed']}
            unit="m/s"
          />
          <InfoCard text="System Status" metric={telemetryData['status']} />
          <InfoCard text="FTS Active" metric={'FALSE'} />
          <InfoCard
            text="Ground Speed"
            metric={telemetryData['groundspeed']}
            unit="m/s"
          />
        </div>
      </div>
    </Layout>
  )
}
