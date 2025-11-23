import React from 'react';
import AIChatPage from './AIChatPage.jsx';
import { supportedAssistants } from '../../lib/openaiClient.js';

const StrategyAssistant = () => {
  const assistant = supportedAssistants.strategy;
  return (
    <AIChatPage
      assistantKey="strategy"
      title={assistant.title}
      systemPrompt={assistant.systemPrompt}
      model={assistant.defaultModel}
    />
  );
};

export default StrategyAssistant;
