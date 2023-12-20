import { useEffect, useState } from 'react'

import InfoCard from './components/infoCard'
import Layout from './components/layout'
import MapSection from './components/map'
import moment from 'moment'
import resolveConfig from 'tailwindcss/resolveConfig'
import { socket } from './socket'
import tailwindConfig from '../tailwind.config.js'
<<<<<<< Updated upstream

const tailwindColors = resolveConfig(tailwindConfig).theme.colors
=======
import Layout from './components/layout'
import { dialog } from 'electron'
>>>>>>> Stashed changes

export default function App() {
  const [listening, setListening] = useState(false)
  const [telemetryData, setTelemetryData] = useState({})
  const [gpsData, setGpsData] = useState({})
  const [batteryData, setBatteryData] = useState({})
  const [time, setTime] = useState(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!listening) {
      socket.emit('set_state', { state: 'dashboard' })
      setListening(true)
    }
  })

  useEffect(() => {
    if (!listening) {
      return
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
          // TODO
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
      setListening(false)
    }
  }, [listening])

  console.log(dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))

  return (
    <Layout currentPage="dashboard">
      <div className="flex w-full flex-auto">
        {/* grid wrapper for flight telemetry */}
        <div className="flex-auto">
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

        {/** grid wrapper for map data */}
        <div className="w-7/12">
          <MapSection data={gpsData} />
        </div>
      </div>
    </Layout>
  )
}
