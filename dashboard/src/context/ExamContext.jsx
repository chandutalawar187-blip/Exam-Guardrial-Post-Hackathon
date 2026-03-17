// dashboard/src/context/ExamContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ExamContext = createContext();

export const ExamProvider = ({ children }) => {
  const [examState, setExamState] = useState({
    examConfig: null, // { title, subjectCode, durationPerQuestion, startTime, endTime, maxStudents }
    questions: [],    // [{ id, question_text, option_a, ... }]
    answers: {},      // { questionId: selectedOption }
    violationCount: 0,
    violationLog: [],
    score: { raw: 0, deductions: 0, final: 0 },
    sentinelActive: false,
    sessionId: null
  });

  const updateExamConfig = (config) => setExamState(prev => ({ ...prev, examConfig: config }));
  const setQuestions = (qs) => setExamState(prev => ({ ...prev, questions: qs }));
  const recordAnswer = (qId, option) => setExamState(prev => ({ 
    ...prev, 
    answers: { ...prev.answers, [qId]: option } 
  }));
  const addViolation = (violation) => setExamState(prev => ({
    ...prev,
    violationCount: prev.violationCount + 1,
    violationLog: [...prev.violationLog, { ...violation, timestamp: new Date().toISOString() }]
  }));
  const setSentinelStatus = (active) => setExamState(prev => ({ ...prev, sentinelActive: active }));
  const resetExam = () => setExamState({
    examConfig: null, questions: [], answers: {}, 
    violationCount: 0, violationLog: [], 
    score: { raw: 0, deductions: 0, final: 0 }, 
    sentinelActive: false, sessionId: null
  });

  return (
    <ExamContext.Provider value={{ 
      examState, updateExamConfig, setQuestions, 
      recordAnswer, addViolation, setSentinelStatus, resetExam 
    }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => useContext(ExamContext);
