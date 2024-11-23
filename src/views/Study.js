import React from "react";

import { useState, useEffect, useRef } from "react"

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';


import { Mic, MicOff, Check, ArrowRight, ArrowLeft } from "lucide-react"

// Mock scripture data (replace with actual data in a real application)
const scripture = {
  reference: "John 3:16",
  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
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
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();



  const [activeTab, setActiveTab] = useState(0)
  const [spokenText, setSpokenText] = useState("")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [practiceResult, setPracticeResult] = useState([])
  const [testSubmission, setTestSubmission] = useState("")
  const [testResult, setTestResult] = useState([])

  useEffect(() => {
        console.log("transcript:", transcript);
        console.log(currentWordIndex);


        if (activeTab === 1) {

          console.log("");
          setSpokenText(transcript)
          const result = compareWords(scripture.text, transcript)
          setPracticeResult(result)
          // Check if the last word spoken matches the current word
          const currentWord = scripture.text.split(/\s+/)[currentWordIndex].toLowerCase()
          const lastSpokenWord = transcript.trim().split(/\s+/).pop()?.toLowerCase()
          if (currentWord === lastSpokenWord) {
            // If correct, move to the next word and reset speech recognition
            setCurrentWordIndex(prev => Math.min(prev + 1, scripture.text.split(/\s+/).length - 1))
            SpeechRecognition.stopListening()
            SpeechRecognition.startListening({ continuous: true })
            setSpokenText("")
          }
        } else if (activeTab === 2) {
          // Only update for final results in test mode
            setTestSubmission(transcript)
            setTestResult(compareWords(scripture.text, transcript))
        }
  }, [activeTab, currentWordIndex, transcript])

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening()
    } else {
      SpeechRecognition.stopListening()
      SpeechRecognition.startListening({ continuous: true })
      setSpokenText("")
    }
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

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        Scripture Learning
        Read, practice, and test your scripture knowledge
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Tabs label="Read" {...a11yProps(0)} />
            <Tabs label="Practice" {...a11yProps(1)} />
            <Tabs label="Test" {...a11yProps(2)} />
        </Tabs>
          <CustomTabPanel value={activeTab} index={0}> 
            <Card>
              <CardHeader>
                {scripture.reference}
              </CardHeader>
              <CardContent>
                  <p>{scripture.text}</p>
              </CardContent>
            </Card>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={1}>
            <Card>
              <CardHeader>
                Word-by-Word Practice
                Practice the scripture word by word
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
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
                </div>
              </CardContent>
            </Card>
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={2}>
            <Card>
              <CardHeader>
                Memorization Test
                Type or speak the scripture from memory and check your accuracy
              </CardHeader>
              <CardContent>
                <div className="space-y-4">

                <textarea id="scriptureInput" placeholder="type the scripture here..." onChange={(e) => { console.log("onChange:", e); setTestSubmission(e.target.value)}} className="min-h-[100px]" value={testSubmission}></textarea>
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
                </div>
              </CardContent>
            </Card>
          </CustomTabPanel>
      </CardContent>
      <CardActions className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab(0)}>Back to Reading</Button>
        <Button onClick={() => setActiveTab(activeTab === 0 ? 1 : activeTab === 1 ? 2 : 0)}>
          Next Mode
        </Button>
      </CardActions>
    </Card>
  );
}
