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

import { Mic, MicOff, Check, ArrowRight, ArrowLeft } from "lucide-react"

// Mock scripture data (replace with actual data in a real application)
const scripture = {
  reference: "John 3:16",
  text: "For God so loved the world that he gave his one and only Son that whoever believes in him shall not perish but have eternal life",
  splitText: []
}

// Simple word-by-word comparison function
function compareWords(original: string, spoken: string): { correct: boolean; word: string }[] {
  const originalWords = original.toLowerCase().split(/\s+/)
  const spokenWords = spoken.toLowerCase().split(/\s+/)
  return originalWords.map((word, index) => ({
    correct: index < spokenWords.length && word === spokenWords[index],
    word: word
  }))
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
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  scripture.splitText = scripture.text.split(/\s+/)
  const [activeTab, setActiveTab] = useState(0)
  const [spokenText, setSpokenText] = useState("")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [practiceResult, setPracticeResult] = useState([])
  const [testSubmission, setTestSubmission] = useState("")
  const [testResult, setTestResult] = useState([])

  useEffect(() => {

        if (activeTab === 1) {
          console.log("spokenText:", spokenText)
          let transSplits = []
          if(spokenText != ""){
            transSplits = spokenText.trim().split(/\s+/)
          }
          console.log("splits:", transSplits)
          if (transSplits.length === 0 && currentWordIndex != 0){
            startSpeechRecognition()
            return
          }
          let increase = 0
          console.log(currentWordIndex)
          for (let i in transSplits){
            const curr = transSplits[i].toLowerCase()
            const currentWord = scripture.splitText[currentWordIndex + increase].toLowerCase()
            console.log(curr, currentWord, currentWordIndex, curr === currentWord)
            if (curr === currentWord){
              increase++
            } else {
              console.log("hmmm...")
              break
            }
          }
          if(increase != 0){
            console.log("increasing currentWordIndex by "+ increase)
            setCurrentWordIndex(prev => Math.min(prev + increase, scripture.splitText.length - 1))
            setSpokenText("")
            resetTranscript();
          } else {
            resetTranscript();
          }

      SpeechRecognition.startListening()

          // setSpokenText(transcript)
          // const result = compareWords(scripture.text, transcript)
          // console.log(result);
          // setPracticeResult(result)
          // // Check if the last word spoken matches the current word
          // const currentWord = scripture.text.split(/\s+/)[currentWordIndex].toLowerCase()
          // const lastSpokenWord = transcript.trim().split(/\s+/).pop()?.toLowerCase()
          // console.log("curentWord:", currentWord, "lastSpokenWord:", lastSpokenWord);
          // if (currentWord === lastSpokenWord) {
          //   // If correct, move to the next word and reset speech recognition
          //   setCurrentWordIndex(prev => Math.min(prev + 1, scripture.text.split(/\s+/).length - 1))
          // }
          //   setSpokenText("")
        } else if (activeTab === 2) {
          // Only update for final results in test mode
          setTestSubmission(spokenText)
        }
  }, [spokenText])


  useEffect(() => {
    setSpokenText("")
    setTestResult([])
  }, [activeTab])

  useEffect(() => {
    setSpokenText(finalTranscript)
  }, [finalTranscript])

  const toggleListening = () => {
    if (listening) {
      console.log("toggleListening: true")
      SpeechRecognition.stopListening()
    } else {
      console.log("toggleListening: false")
      SpeechRecognition.startListening()
    }
  }

  const startSpeechRecognition = () => {
      SpeechRecognition.startListening()
  }

  const handleTestSubmit = () => {
    setTestResult(compareWords(scripture.text, testSubmission))
  }

  const nextWord = () => {
    setCurrentWordIndex(prev => Math.min(prev + 1, scripture.text.split(/\s+/).length - 1))
  }

  const prevWord = () => {
    setCurrentWordIndex(prev => Math.max(prev - 1, 0))
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
  }

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
                {practiceResult.map((result, index) => (
                    <span
                      key={index}
                      className={`inline-block mr-1 ${
                        result.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {result.word}
                    </span>
                  ))}
                  <Button onClick={prevWord} disabled={currentWordIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Word {currentWordIndex + 1} of {scripture.text.split(/\s+/).length}
                  </span>
                  <Button onClick={nextWord} disabled={currentWordIndex === scripture.text.split(/\s+/).length - 1}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-2xl font-bold p-4 border rounded">
                  {scripture.text.split(/\s+/)[currentWordIndex]}
                </div>
                <Button onClick={toggleListening} variant="outline" className="w-full">
                  {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {listening ? "Stop" : "Start"} Listening
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
                onChange={(e) => {setTestSubmission(e.target.value)}} value={testSubmission} ></textarea>
                <div className="flex justify-between">
                  <Button onClick={toggleListening} variant="outline">
                    {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {listening ? "Stop" : "Start"} Listening
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
