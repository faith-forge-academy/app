import React from "react";

import { useState, useEffect, useRef } from "react"

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useSelector } from "react-redux";
import { Mic, MicOff, Check, ArrowRight, ArrowLeft } from "lucide-react"

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
  str = str.replaceAll(/[.,/#!$%^&*;:{}=\-_`~()]/gu, '').toLowerCase()
  return str
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
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
  } = useSpeechRecognition();

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
  const [isListening, setIsListening] = useState(false)
  // Ref so the iOS-restart effect always reads the current intent without causing re-runs
  const shouldListenRef = useRef(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [testSubmission, setTestSubmission] = useState("")
  const [testResult, setTestResult] = useState([])

  // iOS workaround: Web Speech API stops after short pauses on iOS Safari even with
  // continuous:true. Restart transparently whenever recognition ends while the user
  // still wants the mic on.
  useEffect(() => {
    if (!listening && shouldListenRef.current) {
      SpeechRecognition.startListening({ continuous: true, interimResults: true })
    }
  }, [listening])

  // Stop the mic and reset all transient state whenever the user switches tabs.
  useEffect(() => {
    shouldListenRef.current = false
    setIsListening(false)
    SpeechRecognition.stopListening()
    resetTranscript()
    setCurrentWordIndex(0)
    setTestResult([])
    setTestSubmission("")
  }, [activeTab, resetTranscript])

  // Practice mode: advance word index whenever finalTranscript contains the next word(s).
  useEffect(() => {
    if (activeTab !== 1 || !finalTranscript) return

    const transSplits = finalTranscript.trim().split(/\s+/)
    let increase = 0
    for (let i = 0; i < transSplits.length; i++) {
      // Guard against running off the end of the verse
      if (currentWordIndex + increase >= scripture.splitText.length) break
      const curr = replaceText(transSplits[i])
      const currentWord = scripture.splitText[currentWordIndex + increase]
      if (curr === currentWord) {
        increase++
      } else {
        break
      }
    }
    if (increase !== 0) {
      setCurrentWordIndex(prev => Math.min(prev + increase, scripture.splitText.length - 1))
    }
    resetTranscript()
  }, [activeTab, finalTranscript, currentWordIndex, resetTranscript])

  // Test mode: keep testSubmission in sync with finalized speech so Check Answer
  // always has the latest spoken text.
  useEffect(() => {
    if (activeTab !== 2 || !finalTranscript) return
    setTestSubmission(finalTranscript)
  }, [activeTab, finalTranscript])

  const startListeningSession = () => {
    shouldListenRef.current = true
    setIsListening(true)
    resetTranscript()
    SpeechRecognition.startListening({ continuous: true, interimResults: true })
  }

  const stopListeningSession = () => {
    shouldListenRef.current = false
    setIsListening(false)
    SpeechRecognition.stopListening()
  }

  const toggleListening = () => {
    if (isListening) {
      stopListeningSession()
    } else {
      startListeningSession()
    }
  }

  const handleTestSubmit = () => {
    // If the mic is still on, stop it and use whatever has been transcribed so far.
    const textToCheck = isListening ? transcript : testSubmission
    if (isListening) {
      stopListeningSession()
      setTestSubmission(transcript)
    }
    setTestResult(compareWords(scripture.text, textToCheck))
  }

  const nextWord = () => {
    setCurrentWordIndex(prev => Math.min(prev + 1, scripture.splitText.length - 1))
  }

  const prevWord = () => {
    setCurrentWordIndex(prev => Math.max(prev - 1, 0))
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
  }

  // While the mic is active show the live (including interim) transcript so the
  // user gets real-time feedback. When stopped, show the editable saved text.
  const testDisplayValue = isListening ? transcript : testSubmission

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
              <h1>Word-by-Word Practice</h1>
              <p>Practice the scripture word by word</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button onClick={prevWord} disabled={currentWordIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Word {currentWordIndex + 1} of {scripture.splitText.length}
                  </span>
                  <Button onClick={nextWord} disabled={currentWordIndex === scripture.splitText.length - 1}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-2xl font-bold p-4 border rounded">
                  {scripture.text.split(/\s+/)[currentWordIndex]}
                </div>
                <Button onClick={toggleListening} variant="outline" className="w-full">
                  {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isListening ? "Stop" : "Start"} Listening
                </Button>
              </div>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={2}>
              <h1>Memorization Test</h1>
              <p>Type or speak the scripture from memory and check your accuracy</p>
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
                onChange={(e) => { if (!isListening) setTestSubmission(e.target.value) }}
                value={testDisplayValue}
                readOnly={isListening}
              ></textarea>
                <div className="flex justify-between">
                  <Button onClick={toggleListening} variant="outline">
                    {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isListening ? "Stop" : "Start"} Listening
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
        <Button variant="outline" onClick={() => setActiveTab(0)}>Back to Reading</Button>
        <Button onClick={() => setActiveTab(activeTab === 0 ? 1 : activeTab === 1 ? 2 : 0)}>
          Next Mode
        </Button>
      </CardActions>
    </Card>
    </>
  );
}
