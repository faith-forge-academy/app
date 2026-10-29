import React, { useState, useEffect, useRef, useMemo } from "react";

import { useWhisper } from '../hooks/useWhisper';
import {
  advancePracticeCursor,
  diffWords,
  isSilenceHallucination,
  normalizeWord,
} from '../utils/speechMatch';

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
import { BIBLE_COPYRIGHT } from "../utils/bibleSource";

const DEFAULT_VERSE = {
  id: "John 3:16",
  content: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
};

function readStoredVerse() {
  try {
    const stored = JSON.parse(window.localStorage.getItem("verse") || "null");
    if (stored && typeof stored.content === "string" && stored.content.trim()) {
      return { id: stored.id || "", content: stored.content };
    }
  } catch (err) {
    return null;
  }
  return null;
}

function splitWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
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

function GradeTokens({ tokens }) {
  return tokens.map((token, index) => {
    if (token.type === 'equal') {
      return (
        <span key={index} className="inline-block mr-1 text-green-600 dark:text-green-400">
          {token.expected}
        </span>
      );
    }
    if (token.type === 'del') {
      return (
        <span key={index} className="inline-block mr-1 text-red-600 line-through dark:text-red-400">
          {token.expected}
        </span>
      );
    }
    if (token.type === 'sub') {
      return (
        <span
          key={index}
          className="inline-block mr-1 text-red-600 dark:text-red-400"
          title={`Expected: ${token.expected}`}
        >
          {token.spoken}
        </span>
      );
    }
    return (
      <span key={index} className="inline-block mr-1 text-red-600 underline dark:text-red-400">
        {token.spoken}
      </span>
    );
  });
}

export default function Study() {
  const {
    isReady,
    loadingProgress,
    listening,
    isProcessing,
    finalTranscript,
    transcriptId,
    error,
    startListening,
    stopListening,
    cancelPending,
    resetTranscript,
  } = useWhisper();

  const reduxVerse = useSelector((state) => state.verse);
  const storedVerseRef = useRef(readStoredVerse());
  const verse = reduxVerse && typeof reduxVerse.content === "string" && reduxVerse.content.trim()
    ? { id: reduxVerse.id || "", content: reduxVerse.content }
    : (storedVerseRef.current || DEFAULT_VERSE);
  const verseKey = `${verse.id}::${verse.content}`;

  const tokens = useMemo(() => {
    return splitWords(verse.content)
      .map((display) => ({ display, norm: normalizeWord(display) }))
      .filter((token) => token.norm);
  }, [verse.content]);
  const matchWords = useMemo(() => tokens.map((token) => token.norm), [tokens]);

  const [activeTab, setActiveTab] = useState(0)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [testSubmission, setTestSubmission] = useState("")
  const [testResult, setTestResult] = useState(null)
  const pendingCheckRef = useRef(false)
  const currentWordRef = useRef(null)
  const submissionRef = useRef("")
  const handledTranscriptRef = useRef(0)

  const clearAttempt = () => {
    pendingCheckRef.current = false
    submissionRef.current = ""
    handledTranscriptRef.current = transcriptId
    setIsSessionActive(false)
    setCurrentWordIndex(0)
    setTestSubmission("")
    setTestResult(null)
    cancelPending()
    resetTranscript()
  }

  useEffect(() => {
    currentWordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentWordIndex])

  useEffect(() => {
    clearAttempt()
    // The verse identity is the only signal that practice and the test should start over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseKey])

  useEffect(() => {
    if (activeTab !== 1 || matchWords.length === 0 || currentWordIndex < matchWords.length) return
    setIsSessionActive(false)
    stopListening()
  }, [activeTab, currentWordIndex, matchWords.length, stopListening])

  useEffect(() => {
    clearAttempt()
    // Switching modes drops the in-progress recitation. clearAttempt is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (transcriptId === 0 || transcriptId === handledTranscriptRef.current) return
    handledTranscriptRef.current = transcriptId

    if (activeTab === 1) {
      if (!finalTranscript || isSilenceHallucination(finalTranscript)) return
      const next = advancePracticeCursor(
        matchWords,
        currentWordIndex,
        splitWords(finalTranscript)
      )
      if (next !== currentWordIndex) setCurrentWordIndex(next)
      return
    }

    if (activeTab !== 2) return

    const heard = !finalTranscript || isSilenceHallucination(finalTranscript)
      ? ""
      : finalTranscript.trim()
    if (heard) {
      const next = submissionRef.current ? `${submissionRef.current} ${heard}` : heard
      submissionRef.current = next
      setTestSubmission(next)
    }
    if (pendingCheckRef.current) {
      pendingCheckRef.current = false
      const spoken = splitWords(submissionRef.current)
      setTestResult(diffWords(tokens.map((token) => token.display), spoken))
    }
  }, [activeTab, transcriptId, finalTranscript, currentWordIndex, matchWords, tokens])

  const toggleListening = () => {
    if (isSessionActive) {
      setIsSessionActive(false)
      stopListening()
    } else {
      setIsSessionActive(true)
      startListening({ continuous: activeTab === 1 })
    }
  }

  const handleTestSubmit = () => {
    if (isSessionActive) {
      pendingCheckRef.current = true
      setIsSessionActive(false)
      stopListening()
      return
    }
    setTestResult(diffWords(tokens.map((token) => token.display), splitWords(testSubmission)))
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
  }

  const isComplete = matchWords.length > 0 && currentWordIndex >= matchWords.length
  const matchedCount = testResult ? testResult.filter((token) => token.type === 'equal').length : 0
  const statusLabel = error
    ? error
    : !isReady
      ? `Loading speech model${loadingProgress?.progress != null ? ` — ${Math.round(loadingProgress.progress)}%` : '...'}`
      : isProcessing
        ? 'Processing...'
        : (isSessionActive && listening)
          ? 'Listening...'
          : ''

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
              <p>{verse.content}</p>
              <p>{verse.id}</p>
          </CustomTabPanel>

          <CustomTabPanel value={activeTab} index={1}>
              <h1>Scripture Practice</h1>
              <p>Speak the scripture aloud — words light up as you say them</p>
              {verse.id && <p className="text-sm" style={{ color: '#888' }}>{verse.id}</p>}

              {statusLabel && (
                <p className="text-sm" style={{ color: error ? '#b91c1c' : '#888' }}>
                  {statusLabel}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="text-sm" style={{ color: '#888' }}>
                  {Math.min(currentWordIndex, matchWords.length)} / {matchWords.length} words
                </span>
                {isComplete && (
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Complete!</span>
                )}
              </div>

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
                  {tokens.map((token, i) => {
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
                        {token.display}
                      </span>
                    )
                  })}
                </div>
              </Box>

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
                  onClick={() => {
                    setIsSessionActive(false)
                    setCurrentWordIndex(0)
                    handledTranscriptRef.current = transcriptId
                    resetTranscript()
                    cancelPending()
                  }}
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
              {verse.id && <p className="text-sm" style={{ color: '#888' }}>{verse.id}</p>}
              {statusLabel && (
                <p style={{ color: error ? '#b91c1c' : '#888' }}>{statusLabel}</p>
              )}
              <div className="space-y-4">
              {testResult && (
                <>
                  <Typography>
                    {matchedCount} / {tokens.length} words match
                  </Typography>
                  <Typography component="div">
                    <GradeTokens tokens={testResult} />
                  </Typography>
                  <p className="text-sm" style={{ color: '#888' }}>
                    Green matches. Struck words were missed. Underlined words were extra. A red word is a different word than the verse.
                  </p>
                </>
              )}
              <textarea id="scriptureInput" placeholder="type the scripture here..." className="min-h-[100px]"
                onChange={(e) => {
                  if (isSessionActive) return
                  submissionRef.current = e.target.value
                  setTestSubmission(e.target.value)
                }}
                value={testSubmission}
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
      <Typography variant="caption" component="p" sx={{ color: 'text.secondary', px: 2, pb: 1 }}>
        {BIBLE_COPYRIGHT}
      </Typography>
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
