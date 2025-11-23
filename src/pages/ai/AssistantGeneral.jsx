import React from 'react';
import AIChatPage from './AIChatPage.jsx';
import { supportedAssistants } from '../../lib/openaiClient.js';

const AssistantGeneral = () => {
  const assistant = supportedAssistants.assistant;
  return (
    <AIChatPage
      assistantKey="assistant"
      title={assistant.title}
      systemPrompt={assistant.systemPrompt}
      model={assistant.defaultModel}
    />
  );
};

export default AssistantGeneral;
