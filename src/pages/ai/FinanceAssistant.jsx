import React from 'react';
import AIChatPage from './AIChatPage.jsx';
import { supportedAssistants } from '../../lib/openaiClient.js';

const FinanceAssistant = () => {
  const assistant = supportedAssistants.finance;
  return (
    <AIChatPage
      assistantKey="finance"
      title={assistant.title}
      systemPrompt={assistant.systemPrompt}
      model={assistant.defaultModel}
    />
  );
};

export default FinanceAssistant;
