import React, { useState, useEffect, useRef } from "react";

import { useWhisper } from '../hooks/useWhisper';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useSelector } from "react-redux";
import { Mic, MicOff, Check, RotateCcw } from "lucide-react"

// Mock scripture data (replace with actual data in a real application)
const scripture = {
  reference: "John 3:16",
  text: "For God so loved the world, that he gave his one and only Son that whoever believes in him shall not perish but have eternal life.",
  replacedText: "",
  splitText: []
}

// Simple word-by-word comparison function
function compareWords(original: string, spoken: string): { correct: boolean; word: string }[] {
  const originalWords = original.split(/\s+/)
  const spokenWords = spoken.toLowerCase().split(/\s+/)
  return originalWords.map((word, index) => ({
    correct: index < spokenWords.length && replaceText(word) === replaceText(spokenWords[index]),
    word: word
  }))
}

function replaceText(str){
  return str.replace(/[^a-z0-9 ]/gi, '').toLowerCase()
}

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function Study() {
  const {
    isReady,
    loadingProgress,
    listening,
    isProcessing,
    finalTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useWhisper();

  const v = useSelector((state) => state.verse);
  if (v.id !== undefined && v.content !== undefined) {
    scripture.reference = v.id;
    scripture.text = v.content;
  } else if (window.localStorage.getItem("verse")) {
    const stored = JSON.parse(window.localStorage.getItem("verse"))
    scripture.reference = stored.id;
    scripture.text = stored.content;
  }

  scripture.replacedText = replaceText(scripture.text)
  scripture.splitText = scripture.replacedText.split(/\s+/)

  const [activeTab, setActiveTab] = useState(0)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [testSubmission, setTestSubmission] = useState("")
  const [testResult, setTestResult] = useState([])
  const pendingCheckRef = useRef(false)
  const currentWordRef = useRef(null)

  // Scroll the highlighted word into view whenever it advances
  useEffect(() => {
    currentWordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentWordIndex])

  // Auto-stop the mic when the whole verse has been spoken
  useEffect(() => {
    if (activeTab !== 1 || currentWordIndex < scripture.splitText.length) return
    setIsSessionActive(false)
    stopListening()
  }, [activeTab, currentWordIndex, stopListening])

  // Stop the mic and reset all transient state whenever the user switches tabs.
  useEffect(() => {
    setIsSessionActive(false)
    stopListening()
    resetTranscript()
    setCurrentWordIndex(0)
    setTestResult([])
    setTestSubmission("")
  }, [activeTab, stopListening, resetTranscript])

  // Practice mode: advance word index whenever finalTranscript contains scripture words.
  // Strategy: walk every transcript word in order. When a transcript word matches the
  // next expected scripture word, advance the scripture pointer. When it doesn't match
  // (ambient noise, Whisper hallucination, neighbour's phone call), skip that transcript
  // word and keep the scripture pointer where it is. This handles noisy environments
  // where Whisper picks up non-scripture words between correctly spoken ones.
  useEffect(() => {
    if (activeTab !== 1 || !finalTranscript) return

    const transSplits = finalTranscript.trim().split(/\s+/)
    let scripturePos = currentWordIndex
    for (let i = 0; i < transSplits.length; i++) {
      if (scripturePos >= scripture.splitText.length) break
      if (replaceText(transSplits[i]) === scripture.splitText[scripturePos]) {
        scripturePos++
      }
      // mismatch: skip this transcript word, scripture pointer stays put
    }
    if (scripturePos !== currentWordIndex) {
      setCurrentWordIndex(Math.min(scripturePos, scripture.splitText.length))
    }
    resetTranscript()
  }, [activeTab, finalTranscript, currentWordIndex, resetTranscript])

  // Test mode: keep testSubmission in sync with finalized speech so Check Answer
  // always has the latest spoken text. Also handle pending check-on-stop.
  useEffect(() => {
    if (activeTab !== 2 || !finalTranscript) return
    setTestSubmission(finalTranscript)
    if (pendingCheckRef.current) {
      pendingCheckRef.current = false
      setTestResult(compareWords(scripture.text, finalTranscript))
    }
  }, [activeTab, finalTranscript])

  const toggleListening = () => {
    if (isSessionActive) {
      setIsSessionActive(false)
      stopListening()
    } else {
      setIsSessionActive(true)
      startListening({ continuous: activeTab === 1 }) // practice=continuous, test=manual
    }
  }

  const handleTestSubmit = () => {
    if (isSessionActive) {
      // Stop mic and check once the transcript arrives
      pendingCheckRef.current = true
      setIsSessionActive(false)
      stopListening()
    } else {
      setTestResult(compareWords(scripture.text, testSubmission))
    }
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
  }

  const practiceWords = scripture.text.split(/\s+/)
  const isComplete = currentWordIndex >= scripture.splitText.length

  // Show processing state or live/saved text in test textarea
  const testDisplayValue =
    isProcessing ? 'Processing...' :
    (isSessionActive && listening) ? 'Listening...' :
    testSubmission

  return (
    <>
        <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Read" {...a11yProps(0)} />
            <Tab label="Practice" {...a11yProps(1)} />
            <Tab label="Test" {...a11yProps(2)} />
        </Tabs>
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent>
          <CustomTabPanel value={activeTab} index={0}>
              <p>{scripture.text}</p>
              <p>{scripture.reference}</p>
          </CustomTabPanel>

          <CustomTabPanel value={activeTab} index={1}>
              <h1>Scripture Practice</h1>
              <p>Speak the scripture aloud — words light up as you say them</p>

              {!isReady && (
                <p className="text-sm" style={{ color: '#888' }}>
                  Loading speech model{loadingProgress?.progress != null
                    ? ` — ${Math.round(loadingProgress.progress)}%` : '...'}
                </p>
              )}

              {/* Progress row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="text-sm" style={{ color: '#888' }}>
                  {Math.min(currentWordIndex, scripture.splitText.length)} / {scripture.splitText.length} words
                </span>
                {isComplete && (
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Complete!</span>
                )}
                {isProcessing && (
                  <span className="text-sm" style={{ color: '#888' }}>Processing...</span>
                )}
              </div>

              {/* Karaoke / sing-along word display — extra bottom margin on mobile to clear the fixed control bar */}
              <Box sx={{ mb: { xs: 10, sm: 2 } }}>
                <div style={{
                  fontSize: '1.2rem',
                  lineHeight: 2,
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  background: '#fafafa',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}>
                  {practiceWords.map((word, i) => {
                    const isDone = i < currentWordIndex
                    const isCurrent = i === currentWordIndex && !isComplete

                    return (
                      <span
                        key={i}
                        ref={isCurrent ? currentWordRef : null}
                        style={{
                          padding: isCurrent ? '2px 4px' : undefined,
                          borderRadius: isCurrent ? 4 : undefined,
                          background: isCurrent ? '#fef08a' : undefined,
                          color: isDone ? '#16a34a' : isCurrent ? '#713f12' : '#9ca3af',
                          fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                          transition: 'color 0.2s, background 0.2s',
                        }}
                      >
                        {word}
                      </span>
                    )
                  })}
                </div>
              </Box>

              {/* Controls — fixed to bottom on mobile, inline on desktop */}
              <Box sx={{
                display: 'flex',
                gap: 1,
                position: { xs: 'fixed', sm: 'static' },
                bottom: { xs: 0, sm: 'auto' },
                left: { xs: 0, sm: 'auto' },
                right: { xs: 0, sm: 'auto' },
                p: { xs: 2, sm: 0 },
                bgcolor: { xs: 'background.paper', sm: 'transparent' },
                borderTop: { xs: '1px solid #e0e0e0', sm: 'none' },
                zIndex: { xs: 1200, sm: 'auto' },
              }}>
                <Button
                  onClick={toggleListening}
                  variant="outlined"
                  sx={{ flex: 1 }}
                  disabled={!isReady || isComplete}
                >
                  {isSessionActive ? <MicOff style={{ marginRight: 8, width: 16, height: 16 }} /> : <Mic style={{ marginRight: 8, width: 16, height: 16 }} />}
                  {isSessionActive ? 'Stop' : 'Start'} Listening
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => { setCurrentWordIndex(0); resetTranscript(); }}
                  disabled={currentWordIndex === 0 && !isComplete}
                >
                  <RotateCcw style={{ marginRight: 8, width: 16, height: 16 }} />
                  Reset
                </Button>
              </Box>
          </CustomTabPanel>

          <CustomTabPanel value={activeTab} index={2}>
              <h1>Memorization Test</h1>
              <p>Type or speak the scripture from memory and check your accuracy</p>
              {!isReady && (
                <p>Loading speech model{loadingProgress?.progress != null
                  ? ` — ${Math.round(loadingProgress.progress)}%` : '...'}</p>
              )}
              <div className="space-y-4">
              <Typography>
                    {testResult.map((result, index) => (
                      <span
                        key={index}
                        className={`inline-block mr-1 ${
                          result.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {result.word}
                      </span>
                    ))}
              </Typography>
              <textarea id="scriptureInput" placeholder="type the scripture here..." className="min-h-[100px]"
                onChange={(e) => { if (!isSessionActive) setTestSubmission(e.target.value) }}
                value={testDisplayValue}
                readOnly={isSessionActive}
              ></textarea>
                <div className="flex justify-between">
                  <Button onClick={toggleListening} variant="outlined" disabled={!isReady}>
                    {isSessionActive ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isSessionActive ? "Stop" : "Start"} Listening
                  </Button>
                  <Button onClick={handleTestSubmit}>
                    <Check className="mr-2 h-4 w-4" />
                    Check Answer
                  </Button>
                </div>
              </div>
          </CustomTabPanel>
      </CardContent>
      <CardActions className="flex justify-between">
        <Button variant="outlined" onClick={() => setActiveTab(0)}>Back to Reading</Button>
        <Button onClick={() => setActiveTab(activeTab === 0 ? 1 : activeTab === 1 ? 2 : 0)}>
          Next Mode
        </Button>
      </CardActions>
    </Card>
    </>
  );
}
