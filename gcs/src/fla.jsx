/*
  Falcon Log Analyser. This is a custom log analyser written to handle MavLink log files (.log) as well as FGCS telemetry log files (.ftlog).

  This allows users to toggle all messages on/off, look at preset message groups, save message groups, and follow the drone in 3D.
*/

// Base imports
import { Fragment, useEffect, useState } from 'react'

// 3rd Party Imports
import {
  Accordion,
  Button,
  FileButton,
  Progress,
  ScrollArea,
  Tooltip,
} from '@mantine/core'

// Styling imports
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../tailwind.config.js'

// Custom components and helpers
import ChartDataCard from './components/fla/chartDataCard.jsx'
import Graph from './components/fla/graph'
import { dataflashOptions, fgcsOptions } from './components/fla/graphConfigs.js'
import { logEventIds } from './components/fla/logEventIds.js'
import MessageAccordionItem from './components/fla/messageAccordionItem.jsx'
import PresetAccordionItem from './components/fla/presetAccordionItem.jsx'
import { presetCategories } from './components/fla/presetCategories.js'
import Layout from './components/layout.jsx'
import {
  showErrorNotification,
  showSuccessNotification,
} from './helpers/notification.js'

const tailwindColors = resolveConfig(tailwindConfig).theme.colors

// Helper function to convert hex color to rgba
function hexToRgba(hex, alpha) {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16))
  return `rgba(${r},${g},${b},${alpha})`
}

const ignoredMessages = ['ERR', 'EV', 'MSG', 'VER', 'TIMESYNC', 'PARAM_VALUE']
const ignoredKeys = ['TimeUS', 'function', 'source', 'result', 'time_boot_ms']
const colorPalette = [
  '#36a2eb',
  '#ff6383',
  '#fe9e40',
  '#4ade80',
  '#ffcd57',
  '#4cbfc0',
  '#9966ff',
  '#c8cbce',
]
const colorInputSwatch = [
  '#f5f5f5',
  '#868e96',
  '#fa5252',
  '#e64980',
  '#be4bdb',
  '#7950f2',
  '#4c6ef5',
  '#228be6',
  '#15aabf',
  '#12b886',
  '#40c057',
  '#82c91e',
  '#fab005',
  '#fd7e14',
]

export default function FLA() {
  // States in react frontend
  const [file, setFile] = useState(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [loadingFileProgress, setLoadingFileProgress] = useState(0)
  const [logMessages, setLogMessages] = useState(null)
  const [logEvents, setLogEvents] = useState(null)
  const [chartData, setChartData] = useState({ datasets: [] })
  const [messageFilters, setMessageFilters] = useState(null)
  const [customColors, setCustomColors] = useState({})
  const [colorIndex, setColorIndex] = useState(0)
  const [messageMeans, setMessageMeans] = useState({})
  const [logType, setLogType] = useState('dataflash')
  const [graphConfig, setGraphConfig] = useState(dataflashOptions)

  // Load file, if set, and show the graph
  async function loadFile() {
    if (file != null) {
      setLoadingFile(true)
      const result = await window.ipcRenderer.loadFile(file.path)

      if (result.success) {
        // Load messages into states
        const loadedLogMessages = result.messages
        setLogType(result.logType)
        setLogMessages(loadedLogMessages)
        setLoadingFile(false)

        // Set the default state to false for all message filters
        const logMessageFilterDefaultState = {}
        Object.keys(loadedLogMessages['format'])
          .sort()
          .forEach((key) => {
            if (
              Object.keys(loadedLogMessages).includes(key) &&
              !ignoredMessages.includes(key)
            ) {
              const fieldsState = {}

              // Set all field states to false if they're not ignored
              loadedLogMessages['format'][key].fields.map((field) => {
                if (!ignoredKeys.includes(field)) {
                  fieldsState[field] = false
                }
              })
              logMessageFilterDefaultState[key] = fieldsState
            }
          })

        if (loadedLogMessages['ESC']) {
          // Load each ESC data into its own array
          loadedLogMessages['ESC'].map((escData) => {
            const newEscData = {
              ...escData,
              name: `ESC${escData['Instance'] + 1}`,
            }
            loadedLogMessages[newEscData.name] = (
              loadedLogMessages[newEscData.name] || []
            ).concat([newEscData])
            // Add filter state for new ESC
            if (!logMessageFilterDefaultState[newEscData.name])
              logMessageFilterDefaultState[newEscData.name] = {
                ...logMessageFilterDefaultState['ESC'],
              }
          })

          // Remove old ESC motor data
          delete loadedLogMessages['ESC']
          delete logMessageFilterDefaultState['ESC']
        }

        // Sort new filters
        const sortedLogMessageFilterState = Object.keys(
          logMessageFilterDefaultState,
        )
          .sort()
          .reduce((acc, c) => {
            acc[c] = logMessageFilterDefaultState[c]
            return acc
          }, {})

        setMessageFilters(sortedLogMessageFilterState)
        setMeanValues(loadedLogMessages)

        // Set event logs for the event lines on graph
        if ('EV' in loadedLogMessages) {
          setLogEvents(
            loadedLogMessages['EV'].map((event) => ({
              time: event.TimeUS,
              message: logEventIds[event.Id],
            })),
          )
        }

        // Close modal and show success message
        showSuccessNotification(`${file.name} loaded successfully`)
      } else {
        // Error
        showErrorNotification(result.error)
        setLoadingFile(false)
      }
    }
  }

  // Loop over all fields and precalculate min, max, mean
  function setMeanValues(loadedLogMessages) {
    let rawValues = {}

    // Putting all raw data into a list
    Object.keys(loadedLogMessages).forEach((key) => {
      if (key != 'format') {
        let messageData = loadedLogMessages[key]
        let messageDataMeans = {}

        messageData.map((message) => {
          Object.keys(message).forEach((dataPointKey) => {
            let dataPoint = message[dataPointKey]
            if (dataPointKey != dataPoint && dataPointKey != 'name') {
              if (messageDataMeans[dataPointKey] == undefined) {
                messageDataMeans[dataPointKey] = [dataPoint]
              } else {
                messageDataMeans[dataPointKey].push(dataPoint)
              }
            }
          })
        })

        rawValues[key] = messageDataMeans
      }
    })

    // Looping over each list and finding min, max, mean
    let means = {}
    Object.keys(rawValues).forEach((key) => {
      means[key] = {}
      let messageData = rawValues[key]
      Object.keys(messageData).forEach((messageKey) => {
        let messageValues = messageData[messageKey]
        let min = Math.min(...messageValues)
        let max = Math.max(...messageValues)
        let mean =
          messageValues.reduce((acc, curr) => acc + curr, 0) /
          messageValues.length

        means[`${key}/${messageKey}`] = {
          mean: mean.toFixed(2),
          max: max.toFixed(2),
          min: min.toFixed(2),
        }
      })
    })
    setMessageMeans(means)
  }

  // Turn on/off all filters
  function clearFilters() {
    let newFilters = { ...messageFilters }
    Object.keys(newFilters).map((categoryName) => {
      const category = newFilters[categoryName]
      Object.keys(category).map((fieldName) => {
        newFilters[categoryName][fieldName] = false
      })
    })
    setMessageFilters(newFilters)
    setCustomColors({})
    setColorIndex(0)
  }

  // Turn off only one filter at a time
  function removeDataset(label) {
    let [categoryName, fieldName] = label.split('/')
    let newFilters = { ...messageFilters }
    if (
      newFilters[categoryName] &&
      newFilters[categoryName][fieldName] !== undefined
    ) {
      newFilters[categoryName][fieldName] = false
    }
    setCustomColors((prevColors) => {
      let newColors = { ...prevColors }
      delete newColors[label]
      return newColors
    })
    setMessageFilters(newFilters)
  }

  // Close file
  function closeLogFile() {
    setFile(null)
    setLoadingFileProgress(0)
    setLogMessages(null)
    setChartData({ datasets: [] })
    setMessageFilters(null)
    setCustomColors({})
    setColorIndex(0)
    setMeanValues(null)
    setLogEvents(null)
    setLogType('dataflash')
  }

  // Set IPC renderer for log messages
  useEffect(() => {
    window.ipcRenderer.on('fla:log-parse-progress', function (evt, message) {
      setLoadingFileProgress(message.percent)
    })

    return () => {
      window.ipcRenderer.removeAllListeners(['fla:log-parse-progress'])
    }
  }, [])

  // Color changer
  function changeColor(label, color) {
    setCustomColors((prevColors) => ({ ...prevColors, [label]: color }))
  }

  // Preset selection
  function selectPreset(filter) {
    {
      clearFilters()
      setCustomColors({})
      setColorIndex(0)
      let newFilters = { ...messageFilters }
      Object.keys(filter.filters).map((categoryName) => {
        if (Object.keys(messageFilters).includes(categoryName)) {
          filter.filters[categoryName].map((field) => {
            newFilters[categoryName][field] = true

            // Assign a color
            setCustomColors((prevColors) => {
              let newColors = {
                ...prevColors,
              }
              if (!newColors[`${categoryName}/${field}`]) {
                newColors[`${categoryName}/${field}`] =
                  colorPalette[
                    Object.keys(newColors).length % colorPalette.length
                  ]
              }
              return newColors
            })
            setColorIndex(2) // this is risky.
          })
        } else {
          showErrorNotification(
            `Your log file does not include ${categoryName}`,
          )
        }
      })

      setMessageFilters(newFilters)
    }
  }

  function selectMessageFilter(event, messageName, fieldName) {
    let newFilters = {
      ...messageFilters,
    }
    newFilters[messageName][fieldName] = event.currentTarget.checked
    // if unchecked remove custom color
    if (!newFilters[messageName][fieldName]) {
      setCustomColors((prevColors) => {
        let newColors = {
          ...prevColors,
        }
        delete newColors[`${messageName}/${fieldName}`]
        return newColors
      })
    }
    // Else assign a color
    else {
      setCustomColors((prevColors) => {
        let newColors = {
          ...prevColors,
        }
        if (!newColors[`${messageName}/${fieldName}`]) {
          newColors[`${messageName}/${fieldName}`] =
            colorPalette[colorIndex % colorPalette.length]
          setColorIndex((colorIndex + 1) % colorPalette.length)
        }
        return newColors
      })
    }

    setMessageFilters(newFilters)
  }

  // Ensure file is loaded when selected
  useEffect(() => {
    if (file !== null) {
      loadFile()
    }
  }, [file])

  // Update datasets based on the message filters constantly
  useEffect(() => {
    if (!messageFilters) return

    const datasets = []
    Object.keys(messageFilters).map((categoryName) => {
      const category = messageFilters[categoryName]

      Object.keys(category).map((fieldName) => {
        if (category[fieldName]) {
          const label = `${categoryName}/${fieldName}`
          const color = customColors[label]
          datasets.push({
            label: label,
            data: logMessages[categoryName].map((d) => ({
              x: d.TimeUS,
              y: d[fieldName],
            })),
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.5), // Use a more transparent shade for the background
          })
        }
      })
    })

    setChartData({ datasets: datasets })
  }, [messageFilters, customColors])

  useEffect(() => {
    // set the graph config options depending on the type of log file opened
    if (logType === 'dataflash') {
      setGraphConfig(dataflashOptions)
    } else if (logType === 'fgcs_telemetry') {
      setGraphConfig(fgcsOptions)
    }
  }, [logType])

  return (
    <Layout currentPage='fla'>
      {logMessages === null ? (
        // Open flight logs section
        <div className='flex flex-col items-center justify-center h-full mx-auto w-min'>
          <FileButton
            color={tailwindColors.blue[600]}
            variant='filled'
            onChange={setFile}
            accept={['.log', '.ftlog']}
            loading={loadingFile}
          >
            {(props) => <Button {...props}>Analyse a log</Button>}
          </FileButton>
          {loadingFile && (
            <Progress
              value={loadingFileProgress}
              className='w-full my-4'
              color={tailwindColors.green[500]}
            />
          )}
        </div>
      ) : (
        // Graphs section
        <>
          <div className='flex gap-4 h-3/4'>
            {/* Message selection column */}
            <div className='w-1/4 pb-6'>
              <div className=''>
                <Button
                  className='mx-4 my-2'
                  size='xs'
                  color={tailwindColors.red[500]}
                  onClick={closeLogFile}
                >
                  Close file
                </Button>
                <Tooltip label={file.path}>
                  <p className='mx-4 my-2'>{file.name}</p>
                </Tooltip>
              </div>
              <ScrollArea className='h-full max-h-max'>
                <Accordion multiple={true}>
                  {/* Presets */}
                  <Accordion.Item key='presets' value='presets'>
                    <Accordion.Control>Presets</Accordion.Control>
                    <Accordion.Panel>
                      <Accordion multiple={true}>
                        {presetCategories[logType]?.map((category) => {
                          return (
                            <Fragment key={category.name}>
                              <PresetAccordionItem
                                key={category.name}
                                category={category}
                                selectPresetFunc={selectPreset}
                              />
                            </Fragment>
                          )
                        })}
                      </Accordion>
                    </Accordion.Panel>
                  </Accordion.Item>

                  {/* All messages */}
                  <Accordion.Item key='messages' value='messages'>
                    <Accordion.Control>Messages</Accordion.Control>
                    <Accordion.Panel>
                      <Accordion multiple={false}>
                        {Object.keys(messageFilters).map((messageName, idx) => {
                          return (
                            <Fragment key={idx}>
                              <MessageAccordionItem
                                key={idx}
                                messageName={messageName}
                                messageFilters={messageFilters}
                                selectMessageFilterFunc={selectMessageFilter}
                              />
                            </Fragment>
                          )
                        })}
                      </Accordion>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </ScrollArea>
            </div>

            {/* Graph column */}
            <div className='w-full h-full pr-4'>
              <Graph
                data={chartData}
                events={logEvents}
                graphConfig={graphConfig}
              />

              {/* Plots Setup */}
              <div className='flex gap-4 pt-6 flex-cols'>
                <div>
                  <div className='flex flex-row items-center mb-2'>
                    <h3 className='mt-2 mb-2 text-xl'>Graph setup</h3>
                    {/* Clear Filters */}
                    <Button
                      className='ml-6'
                      size='xs'
                      color={tailwindColors.red[500]}
                      onClick={clearFilters}
                    >
                      Clear graph
                    </Button>
                  </div>
                  {chartData.datasets.map((item) => (
                    <Fragment key={item.label}>
                      <ChartDataCard
                        item={item}
                        messageMeans={messageMeans}
                        colorInputSwatch={colorInputSwatch}
                        changeColorFunc={changeColor}
                        removeDatasetFunc={removeDataset}
                      />
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
