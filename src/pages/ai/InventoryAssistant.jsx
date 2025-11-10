import React from 'react';
import AIChatPage from './AIChatPage.jsx';
import { supportedAssistants } from '../../lib/openaiClient.js';

const InventoryAssistant = () => {
  const assistant = supportedAssistants.inventory;
  return (
    <AIChatPage
      assistantKey="inventory"
      title={assistant.title}
      systemPrompt={assistant.systemPrompt}
      model={assistant.defaultModel}
    />
  );
};

export default InventoryAssistant;
